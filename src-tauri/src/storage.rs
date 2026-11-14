use serde_json::Value;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

/// Hard upper bound for one persisted state file. The catalog is allowed to
/// grow, but a runaway file must never be able to fill the disk unnoticed.
const MAX_STATE_BYTES: u64 = 64 * 1024 * 1024;

fn validate_name(name: &str) -> Result<(), String> {
    if name.is_empty() || name.len() > 96 {
        return Err("Некорректное имя состояния".to_string());
    }
    if !name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
    {
        return Err("Некорректное имя состояния".to_string());
    }
    Ok(())
}

fn state_directory(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Не удалось определить папку данных: {error}"))?;
    let dir = base.join("state");
    fs::create_dir_all(&dir)
        .map_err(|error| format!("Не удалось создать папку состояния: {error}"))?;
    Ok(dir)
}

fn state_file(dir: &Path, name: &str) -> PathBuf {
    dir.join(format!("{name}.json"))
}

fn temp_file(dir: &Path, name: &str) -> PathBuf {
    dir.join(format!("{name}.json.tmp"))
}

fn corrupt_file(dir: &Path, name: &str) -> PathBuf {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs())
        .unwrap_or(0);
    dir.join(format!("{name}.corrupt-{stamp}.json"))
}

fn backup_corrupt(dir: &Path, name: &str, path: &Path) {
    let target = corrupt_file(dir, name);
    let _ = fs::rename(path, target);
}

fn read_file(dir: &Path, name: &str, path: &Path) -> Result<Option<String>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let meta =
        fs::metadata(path).map_err(|error| format!("Не удалось прочитать состояние: {error}"))?;
    if meta.len() > MAX_STATE_BYTES {
        backup_corrupt(dir, name, path);
        return Ok(None);
    }
    let contents = match fs::read_to_string(path) {
        Ok(contents) => contents,
        Err(error) => {
            backup_corrupt(dir, name, path);
            return Err(format!("Не удалось прочитать состояние: {error}"));
        }
    };
    if serde_json::from_str::<Value>(&contents).is_err() {
        backup_corrupt(dir, name, path);
        return Ok(None);
    }
    Ok(Some(contents))
}

fn load_from_dir(dir: &Path, name: &str) -> Result<Option<String>, String> {
    validate_name(name)?;
    if let Some(contents) = read_file(dir, name, &state_file(dir, name))? {
        return Ok(Some(contents));
    }

    // A crash between writing the temporary file and renaming it must not lose
    // the last change. Promote a valid temporary file instead.
    let temporary = temp_file(dir, name);
    if let Some(contents) = read_file(dir, name, &temporary)? {
        let target = state_file(dir, name);
        let _ = fs::rename(&temporary, &target);
        return Ok(Some(contents));
    }
    Ok(None)
}

fn save_to_dir(dir: &Path, name: &str, contents: &str) -> Result<(), String> {
    validate_name(name)?;
    if contents.len() as u64 > MAX_STATE_BYTES {
        return Err("Состояние слишком большое для сохранения".to_string());
    }
    if serde_json::from_str::<Value>(contents).is_err() {
        return Err("Состояние повреждено и не было сохранено".to_string());
    }

    fs::create_dir_all(dir)
        .map_err(|error| format!("Не удалось создать папку состояния: {error}"))?;
    let temporary = temp_file(dir, name);
    let target = state_file(dir, name);

    let mut file = File::create(&temporary)
        .map_err(|error| format!("Не удалось записать состояние: {error}"))?;
    file.write_all(contents.as_bytes())
        .map_err(|error| format!("Не удалось записать состояние: {error}"))?;
    file.sync_all()
        .map_err(|error| format!("Не удалось сохранить состояние: {error}"))?;
    drop(file);

    #[cfg(windows)]
    {
        // `fs::rename` does not replace an existing file on Windows. Keep the
        // destination intact until the new file is fully written above.
        if target.exists() {
            let backup = target.with_extension("json.bak");
            let _ = fs::copy(&target, &backup);
            fs::remove_file(&target)
                .map_err(|error| format!("Не удалось заменить состояние: {error}"))?;
        }
    }

    fs::rename(&temporary, &target)
        .map_err(|error| format!("Не удалось заменить состояние: {error}"))
}

fn remove_from_dir(dir: &Path, name: &str) -> Result<(), String> {
    validate_name(name)?;
    let target = state_file(dir, name);
    if target.exists() {
        fs::remove_file(&target)
            .map_err(|error| format!("Не удалось удалить состояние: {error}"))?;
    }
    let temporary = temp_file(dir, name);
    if temporary.exists() {
        let _ = fs::remove_file(temporary);
    }
    Ok(())
}

#[tauri::command]
pub fn load_state(app: AppHandle, name: String) -> Result<Option<String>, String> {
    let dir = state_directory(&app)?;
    load_from_dir(&dir, &name)
}

#[tauri::command]
pub fn save_state(app: AppHandle, name: String, contents: String) -> Result<(), String> {
    let dir = state_directory(&app)?;
    save_to_dir(&dir, &name, &contents)
}

#[tauri::command]
pub fn remove_state(app: AppHandle, name: String) -> Result<(), String> {
    let dir = state_directory(&app)?;
    remove_from_dir(&dir, &name)
}

#[tauri::command]
pub fn state_path(app: AppHandle) -> Result<String, String> {
    let dir = state_directory(&app)?;
    Ok(dir.display().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT_ID: AtomicU64 = AtomicU64::new(1);

    fn temp_dir() -> PathBuf {
        let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
        let dir =
            std::env::temp_dir().join(format!("lumen-storage-test-{}-{id}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("temp dir");
        dir
    }

    #[test]
    fn round_trips_state() {
        let dir = temp_dir();
        let value = r#"{"theme":"dark","volume":0.7}"#;
        save_to_dir(&dir, "lumen.settings.v2", value).expect("save");
        assert_eq!(
            load_from_dir(&dir, "lumen.settings.v2").expect("load"),
            Some(value.to_string())
        );
        remove_from_dir(&dir, "lumen.settings.v2").expect("remove");
        assert_eq!(
            load_from_dir(&dir, "lumen.settings.v2").expect("load"),
            None
        );
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn rejects_invalid_names_and_contents() {
        let dir = temp_dir();
        assert!(save_to_dir(&dir, "../escape", "{}").is_err());
        assert!(save_to_dir(&dir, "settings", "not json").is_err());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn backs_up_corrupt_state_and_starts_empty() {
        let dir = temp_dir();
        let path = state_file(&dir, "settings");
        fs::write(&path, "broken").expect("write corrupt");
        assert_eq!(load_from_dir(&dir, "settings").expect("load"), None);
        assert!(!path.exists());
        let backups: Vec<_> = fs::read_dir(&dir)
            .expect("read dir")
            .flatten()
            .filter(|entry| entry.file_name().to_string_lossy().contains(".corrupt-"))
            .collect();
        assert_eq!(backups.len(), 1);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn promotes_valid_temporary_file() {
        let dir = temp_dir();
        fs::write(temp_file(&dir, "settings"), r#"{"ok":true}"#).expect("write temp");
        assert_eq!(
            load_from_dir(&dir, "settings").expect("load"),
            Some(r#"{"ok":true}"#.to_string())
        );
        assert!(state_file(&dir, "settings").exists());
        let _ = fs::remove_dir_all(dir);
    }
}

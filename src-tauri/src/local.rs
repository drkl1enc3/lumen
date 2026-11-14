use crate::child_env;
use crate::sources::find_binary;
use crate::AppState;
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::State;
use walkdir::WalkDir;

const MAX_FILES: usize = 20_000;
const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "flac", "ogg", "oga", "opus", "wav", "m4a", "aac", "wma", "webm", "mka", "aiff", "aif",
];

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalTrack {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: u64,
    pub path: String,
    pub cover: u32,
    pub track_no: Option<u32>,
}

fn hash_id(path: &Path) -> String {
    let mut hasher = Sha256::new();
    hasher.update(path.to_string_lossy().as_bytes());
    let digest = format!("{:x}", hasher.finalize());
    format!("local-{}", &digest[..16])
}

fn cover_seed(path: &Path) -> u32 {
    let mut hasher = Sha256::new();
    hasher.update(path.to_string_lossy().as_bytes());
    let digest = hasher.finalize();
    u32::from_be_bytes([digest[0], digest[1], digest[2], digest[3]]) % 10
}

fn prepare_command(command: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    #[cfg(not(windows))]
    {
        let _ = command;
    }
}

fn tag<'a>(tags: &'a Value, key: &str) -> Option<&'a str> {
    let object = tags.as_object()?;
    object
        .iter()
        .find(|(name, _)| name.eq_ignore_ascii_case(key))
        .and_then(|(_, value)| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn probe_track(path: &Path) -> Option<LocalTrack> {
    let mut title = path
        .file_stem()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| "Без названия".to_string());
    let mut artist = "Unknown artist".to_string();
    let mut album: Option<String> = None;
    let mut duration = 0u64;
    let mut track_no: Option<u32> = None;

    if let Some(ffprobe) = find_binary("ffprobe") {
        let mut command = Command::new(ffprobe);
        command
            .arg("-v")
            .arg("quiet")
            .arg("-print_format")
            .arg("json")
            .arg("-show_format")
            .arg(path);
        prepare_command(&mut command);
        child_env::sanitize_std(&mut command);
        if let Ok(output) = command.output() {
            if output.status.success() {
                if let Ok(value) = serde_json::from_slice::<Value>(&output.stdout) {
                    let format = value.get("format");
                    if let Some(format) = format {
                        duration = format
                            .get("duration")
                            .and_then(Value::as_str)
                            .and_then(|value| value.parse::<f64>().ok())
                            .filter(|value| value.is_finite() && *value > 0.0)
                            .map(|value| value.round() as u64)
                            .unwrap_or(0);
                        if let Some(tags) = format.get("tags") {
                            if let Some(value) = tag(tags, "title") {
                                title = value.to_string();
                            }
                            if let Some(value) = tag(tags, "artist") {
                                artist = value.to_string();
                            } else if let Some(value) = tag(tags, "album_artist") {
                                artist = value.to_string();
                            }
                            album = tag(tags, "album").map(ToString::to_string);
                            track_no = tag(tags, "track")
                                .and_then(|value| value.split('/').next())
                                .and_then(|value| value.trim().parse::<u32>().ok());
                        }
                    }
                }
            }
        }
    }

    Some(LocalTrack {
        id: hash_id(path),
        title,
        artist,
        album,
        duration,
        path: path.display().to_string(),
        cover: cover_seed(path),
        track_no,
    })
}

fn is_audio_file(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| AUDIO_EXTENSIONS.contains(&value.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

fn collect_files(roots: &[PathBuf]) -> Vec<PathBuf> {
    let mut files = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for root in roots {
        for entry in WalkDir::new(root)
            .follow_links(false)
            .into_iter()
            .filter_entry(|entry| {
                !entry
                    .file_name()
                    .to_str()
                    .map(|name| name.starts_with('.'))
                    .unwrap_or(false)
            })
            .flatten()
        {
            if files.len() >= MAX_FILES {
                return files;
            }
            if !entry.file_type().is_file() || !is_audio_file(entry.path()) {
                continue;
            }
            let path = entry.path().to_path_buf();
            if seen.insert(path.clone()) {
                files.push(path);
            }
        }
    }
    files
}

fn canonical_roots(roots: &[String]) -> Result<Vec<PathBuf>, String> {
    let mut result = Vec::new();
    for root in roots {
        let path = PathBuf::from(root);
        let canonical = std::fs::canonicalize(&path)
            .map_err(|error| format!("Папка не найдена: {} ({error})", path.display()))?;
        if !canonical.is_dir() {
            return Err(format!("Это не папка: {}", canonical.display()));
        }
        if !result.contains(&canonical) {
            result.push(canonical);
        }
    }
    Ok(result)
}

pub fn set_roots(state: &AppState, roots: Vec<PathBuf>) {
    if let Ok(mut current) = state.local_roots.lock() {
        *current = roots;
    }
}

#[tauri::command]
pub fn set_local_roots(state: State<'_, AppState>, roots: Vec<String>) -> Result<(), String> {
    let roots = canonical_roots(&roots)?;
    set_roots(&state, roots);
    Ok(())
}

#[tauri::command]
pub async fn scan_local(
    state: State<'_, AppState>,
    folders: Vec<String>,
) -> Result<Vec<LocalTrack>, String> {
    let roots = canonical_roots(&folders)?;
    set_roots(&state, roots.clone());
    let files = collect_files(&roots);

    let mut tracks = Vec::with_capacity(files.len());
    for chunk in files.chunks(8) {
        let mut handles = Vec::with_capacity(chunk.len());
        for path in chunk {
            let path = path.clone();
            handles.push(tokio::task::spawn_blocking(move || probe_track(&path)));
        }
        for handle in handles {
            if let Ok(Some(track)) = handle.await {
                tracks.push(track);
            }
        }
    }

    tracks.sort_by(|left, right| {
        left.artist
            .to_lowercase()
            .cmp(&right.artist.to_lowercase())
            .then_with(|| left.album.cmp(&right.album))
            .then_with(|| left.track_no.cmp(&right.track_no))
            .then_with(|| left.title.to_lowercase().cmp(&right.title.to_lowercase()))
    });
    Ok(tracks)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognizes_audio_extensions_case_insensitively() {
        assert!(is_audio_file(Path::new("song.FLAC")));
        assert!(is_audio_file(Path::new("song.mp3")));
        assert!(!is_audio_file(Path::new("cover.jpg")));
    }

    #[test]
    fn track_ids_are_stable_and_prefixed() {
        let path = Path::new("/music/artist/track.flac");
        let first = hash_id(path);
        assert_eq!(first, hash_id(path));
        assert!(first.starts_with("local-"));
        assert_eq!(first.len(), "local-".len() + 16);
    }

    #[test]
    fn rejects_missing_local_roots() {
        let result = canonical_roots(&["/definitely/not/a/real/folder".to_string()]);
        assert!(result.is_err());
    }

    #[test]
    fn scans_and_probes_a_generated_wave_file() {
        if find_binary("ffmpeg").is_none() || find_binary("ffprobe").is_none() {
            return;
        }
        let dir = std::env::temp_dir().join(format!("lumen-local-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("temp dir");
        let path = dir.join("probe.wav");
        let status = Command::new("ffmpeg")
            .args([
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                "sine=frequency=440:duration=2",
                "-c:a",
                "pcm_s16le",
                "-y",
            ])
            .arg(&path)
            .status()
            .expect("ffmpeg");
        assert!(status.success());

        let files = collect_files(&[dir.clone()]);
        assert_eq!(files.len(), 1);
        let track = probe_track(&files[0]).expect("probe");
        assert_eq!(track.title, "probe");
        assert!(track.duration >= 1);
        assert!(track.path.ends_with("probe.wav"));
        let _ = std::fs::remove_dir_all(dir);
    }
}

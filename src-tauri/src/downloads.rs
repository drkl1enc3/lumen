use crate::sources::{find_binary, normalize_media_url, validate_media_url};
use crate::AppState;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};

const DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(30 * 60);

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileProgress {
    track_id: String,
    percent: f64,
    phase: String,
}

fn target_dir(folder: Option<String>) -> PathBuf {
    if let Some(folder) = folder.filter(|value| !value.trim().is_empty()) {
        return PathBuf::from(folder);
    }
    dirs::audio_dir()
        .or_else(dirs::home_dir)
        .unwrap_or_else(std::env::temp_dir)
        .join("Lumen")
}

fn quality_arg(quality: &str) -> &'static str {
    match quality {
        "low" => "9",
        "normal" => "5",
        "high" => "2",
        "lossless" => "0",
        _ => "2",
    }
}

fn parse_percent(line: &str) -> Option<f64> {
    let index = line.find('%')?;
    let prefix = &line[..index];
    let start = prefix
        .rfind(|character: char| !(character.is_ascii_digit() || character == '.'))
        .map(|index| index + 1)
        .unwrap_or(0);
    prefix[start..].trim().parse::<f64>().ok()
}

fn newest_audio(dir: &Path) -> Option<PathBuf> {
    let mut best: Option<(PathBuf, std::time::SystemTime)> = None;
    for entry in std::fs::read_dir(dir).ok()?.flatten() {
        let path = entry.path();
        let is_audio = path
            .extension()
            .and_then(|value| value.to_str())
            .map(|value| {
                matches!(
                    value.to_ascii_lowercase().as_str(),
                    "mp3" | "m4a" | "opus" | "ogg" | "flac" | "wav" | "webm" | "aac"
                )
            })
            .unwrap_or(false);
        if !is_audio {
            continue;
        }
        let Ok(meta) = entry.metadata() else { continue };
        let modified = meta.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        if best
            .as_ref()
            .map(|(_, previous)| modified > *previous)
            .unwrap_or(true)
        {
            best = Some((path, modified));
        }
    }
    best.map(|(path, _)| path)
}

#[tauri::command]
pub async fn download_track(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    track_id: String,
    quality: String,
    folder: Option<String>,
) -> Result<String, String> {
    let normalized = normalize_media_url(&url);
    validate_media_url(&normalized)?;
    let dir = target_dir(folder);
    std::fs::create_dir_all(&dir)
        .map_err(|error| format!("Не удалось создать папку загрузок: {error}"))?;

    let ytdlp = find_binary("yt-dlp")
        .ok_or_else(|| "yt-dlp не найден. Установите его и добавьте в PATH".to_string())?;
    let _permit = state
        .download_sem
        .acquire()
        .await
        .map_err(|_| "Очередь загрузок недоступна".to_string())?;

    let template = dir.join("%(artist)s - %(title)s.%(ext)s");
    let mut command = tokio::process::Command::new(ytdlp);
    command
        .arg("--ignore-config")
        .arg("--no-warnings")
        .arg("--newline")
        .arg("--no-playlist")
        .arg("--no-write-thumbnail")
        .arg("--no-write-info-json")
        .arg("--no-write-subs")
        .arg("--no-write-auto-subs")
        .arg("--extract-audio")
        .arg("--audio-format")
        .arg(if quality == "high" || quality == "lossless" {
            "best"
        } else {
            "mp3"
        })
        .arg("--audio-quality")
        .arg(quality_arg(&quality))
        .arg("--print")
        .arg("after_move:filepath")
        .arg("-o")
        .arg(&template)
        .arg(&normalized)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }

    let mut child = command
        .spawn()
        .map_err(|error| format!("Не удалось запустить yt-dlp: {error}"))?;
    let stdout = child.stdout.take().ok_or("Нет stdout yt-dlp")?;
    let stderr = child.stderr.take().ok_or("Нет stderr yt-dlp")?;

    let app_handle = app.clone();
    let id = track_id.clone();
    let stdout_task = tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        let mut printed_path = None;
        let mut tail = String::new();
        let mut last_emit = Instant::now() - Duration::from_secs(1);
        while let Ok(Some(line)) = lines.next_line().await {
            if let Some(percent) = parse_percent(&line) {
                if last_emit.elapsed() >= Duration::from_millis(250) {
                    let _ = app_handle.emit(
                        "lumen://file-download-progress",
                        FileProgress {
                            track_id: id.clone(),
                            percent,
                            phase: "download".to_string(),
                        },
                    );
                    last_emit = Instant::now();
                }
            } else if line.contains('/') || line.contains('\\') {
                let candidate = line.trim().to_string();
                if Path::new(&candidate).is_file() {
                    printed_path = Some(candidate);
                }
            }
            tail.push_str(&line);
            tail.push('\n');
            if tail.len() > 16_000 {
                let start = tail
                    .char_indices()
                    .rev()
                    .nth(12_000)
                    .map(|(index, _)| index)
                    .unwrap_or(0);
                tail = tail[start..].to_string();
            }
        }
        (printed_path, tail)
    });

    let stderr_task = tokio::spawn(async move {
        let mut buffer = String::new();
        let _ = BufReader::new(stderr).read_to_string(&mut buffer).await;
        buffer
    });

    let status = match tokio::time::timeout(DOWNLOAD_TIMEOUT, child.wait()).await {
        Ok(result) => result.map_err(|error| format!("Не удалось дождаться yt-dlp: {error}"))?,
        Err(_) => {
            let _ = child.kill().await;
            return Err("Загрузка заняла слишком много времени".to_string());
        }
    };

    let (printed_path, _tail) = stdout_task.await.unwrap_or((None, String::new()));
    let stderr = stderr_task.await.unwrap_or_default();
    if !status.success() {
        let message = stderr
            .lines()
            .rev()
            .find(|line| !line.trim().is_empty())
            .unwrap_or("yt-dlp завершился с ошибкой")
            .trim()
            .trim_start_matches("ERROR: ")
            .to_string();
        return Err(message);
    }

    let path = printed_path
        .map(PathBuf::from)
        .filter(|path| path.is_file())
        .or_else(|| newest_audio(&dir))
        .ok_or_else(|| "Не удалось найти скачанный файл".to_string())?;
    let _ = app.emit(
        "lumen://file-download-progress",
        FileProgress {
            track_id,
            percent: 100.0,
            phase: "done".to_string(),
        },
    );
    Ok(path.display().to_string())
}

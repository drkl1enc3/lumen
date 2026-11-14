use crate::AppState;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::OnceLock;
use std::time::{Duration, Instant, SystemTime};
use tauri::{AppHandle, Emitter, State};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};

const SEARCH_TIMEOUT: Duration = Duration::from_secs(45);
const DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(30 * 60);
const MAX_CACHE_BYTES_FALLBACK: u64 = 2048 * 1024 * 1024;

static BUNDLED_BIN_DIR: OnceLock<PathBuf> = OnceLock::new();

pub fn set_bundled_bin_dir(dir: PathBuf) {
    if dir.is_dir() {
        let _ = BUNDLED_BIN_DIR.set(dir);
    }
}

fn is_executable(path: &Path) -> bool {
    let Ok(meta) = path.metadata() else {
        return false;
    };
    if !meta.is_file() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        meta.permissions().mode() & 0o111 != 0
    }
    #[cfg(windows)]
    {
        true
    }
}

fn prepare_std_command(command: &mut std::process::Command) {
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

fn prepare_tokio_command(command: &mut tokio::process::Command) {
    #[cfg(windows)]
    {
        command.creation_flags(0x08000000);
    }
    #[cfg(not(windows))]
    {
        let _ = command;
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolInfo {
    pub path: String,
    pub version: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceStatus {
    pub ytdlp: Option<ToolInfo>,
    pub ffmpeg: Option<ToolInfo>,
    pub ffprobe: Option<ToolInfo>,
    pub mpv: Option<ToolInfo>,
    pub cache_bytes: u64,
    pub cache_files: u64,
    pub cache_dir: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheInfo {
    pub bytes: u64,
    pub files: u64,
    pub dir: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteTrack {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub duration: f64,
    pub thumbnail: Option<String>,
    pub url: String,
    pub source: String,
    pub plays: Option<u64>,
    pub preview: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreparedTrack {
    pub path: String,
    pub duration: f64,
    pub preview: bool,
    pub cached: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    track_id: String,
    percent: f64,
    phase: String,
}

#[derive(Debug, Deserialize)]
struct SearchRoot {
    id: Option<String>,
    title: Option<String>,
    duration: Option<f64>,
    uploader: Option<String>,
    channel: Option<String>,
    webpage_url: Option<String>,
    url: Option<String>,
    thumbnails: Option<Vec<Thumbnail>>,
    view_count: Option<u64>,
    play_count: Option<u64>,
    live_status: Option<String>,
    entries: Option<Vec<SearchRoot>>,
}

#[derive(Debug, Deserialize)]
struct Thumbnail {
    url: String,
    width: Option<u64>,
    height: Option<u64>,
}

pub fn find_binary(name: &str) -> Option<PathBuf> {
    let mut dirs: Vec<PathBuf> = Vec::new();
    if let Some(bundled) = BUNDLED_BIN_DIR.get() {
        dirs.push(bundled.clone());
    }
    if let Some(path) = std::env::var_os("PATH") {
        dirs.extend(std::env::split_paths(&path));
    }
    for extra in ["/usr/bin", "/usr/local/bin", "/bin", "/usr/sbin", "/sbin"] {
        dirs.push(PathBuf::from(extra));
    }
    if let Some(home) = dirs::home_dir() {
        dirs.push(home.join(".local/bin"));
        dirs.push(home.join("bin"));
    }

    #[cfg(windows)]
    {
        if let Some(local) = dirs::data_local_dir() {
            dirs.push(local.join("Microsoft").join("WinGet").join("Links"));
        }
        dirs.push(PathBuf::from("C:\\Program Files\\mpv"));
        dirs.push(PathBuf::from("C:\\Program Files\\ffmpeg\\bin"));
        dirs.push(PathBuf::from("C:\\Program Files\\yt-dlp"));
    }

    let names = vec![name.to_string(), format!("{name}.exe")];

    let mut seen = HashSet::new();
    for dir in dirs {
        if !seen.insert(dir.clone()) {
            continue;
        }
        for file_name in &names {
            let candidate = dir.join(file_name);
            if is_executable(&candidate) {
                return Some(candidate);
            }
        }
    }
    None
}

fn tool_info(path: &Path, args: &[&str]) -> Option<ToolInfo> {
    let mut command = std::process::Command::new(path);
    command.args(args);
    prepare_std_command(&mut command);
    let output = command.output().ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    let first = text.lines().next().unwrap_or("").trim();
    let version = if first.starts_with("ffmpeg version ") || first.starts_with("ffprobe version ") {
        first.split_whitespace().nth(2).unwrap_or(first)
    } else if first.starts_with("mpv ") {
        first.split_whitespace().nth(1).unwrap_or(first)
    } else {
        first
    };
    Some(ToolInfo {
        path: path.display().to_string(),
        version: if version.is_empty() {
            "unknown".to_string()
        } else {
            version.to_string()
        },
    })
}

fn is_media_url(query: &str) -> bool {
    let lower = query.to_lowercase();
    lower.starts_with("http://") || lower.starts_with("https://")
}

fn host_of(url: &str) -> String {
    url.to_lowercase()
        .split("://")
        .nth(1)
        .unwrap_or("")
        .split(['/', '?', '#'])
        .next()
        .unwrap_or("")
        .trim_start_matches("www.")
        .to_string()
}

fn infer_source(url: &str) -> Option<&'static str> {
    let host = host_of(url);
    if host == "youtu.be" || host == "youtube.com" || host.ends_with(".youtube.com") {
        Some("youtube")
    } else if host == "soundcloud.com" || host.ends_with(".soundcloud.com") {
        Some("soundcloud")
    } else {
        None
    }
}

pub(crate) fn validate_media_url(url: &str) -> Result<(), String> {
    let lower = url.to_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return Err("Поддерживаются только ссылки http(s)".to_string());
    }
    if infer_source(url).is_none() {
        return Err("Поддерживаются только ссылки YouTube и SoundCloud".to_string());
    }
    Ok(())
}

fn youtube_video_id(url: &str) -> Option<String> {
    let lower = url.to_lowercase();
    let start = if let Some(pos) = lower.find("youtu.be/") {
        pos + "youtu.be/".len()
    } else if let Some(pos) = lower.find("/shorts/") {
        pos + "/shorts/".len()
    } else if let Some(pos) = lower.find("v=") {
        pos + 2
    } else {
        return None;
    };
    let id = url[start..].split(['?', '&', '/', '#']).next()?;
    if id.is_empty() {
        None
    } else {
        Some(id.to_string())
    }
}

pub(crate) fn normalize_media_url(url: &str) -> String {
    let trimmed = url.trim();
    if infer_source(trimmed) == Some("youtube") {
        if let Some(id) = youtube_video_id(trimmed) {
            return format!("https://www.youtube.com/watch?v={id}");
        }
    }
    trimmed
        .split(['?', '#'])
        .next()
        .unwrap_or(trimmed)
        .trim_end_matches('/')
        .to_string()
}

fn sha256_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

fn cache_hash(url: &str, quality: &str) -> String {
    if quality == "high" || quality.is_empty() {
        sha256_hex(url)
    } else {
        sha256_hex(&format!("{url}|{quality}"))
    }
}

fn format_selector(quality: &str) -> &'static str {
    match quality {
        "low" => "worstaudio[abr<=96]/worstaudio/best",
        "normal" => "bestaudio[abr<=128]/bestaudio/best",
        "lossless" => "bestaudio[acodec=flac]/bestaudio/best",
        _ => "bestaudio/best",
    }
}

fn pick_thumbnail(entry: &SearchRoot, source: &str) -> Option<String> {
    if source == "youtube" {
        if let Some(id) = entry.id.as_deref() {
            return Some(format!("https://i.ytimg.com/vi/{id}/hqdefault.jpg"));
        }
    }
    if let Some(thumbs) = entry.thumbnails.as_ref() {
        if let Some(best) = thumbs.iter().max_by_key(|t| {
            let w = t.width.unwrap_or(0);
            let h = t.height.unwrap_or(0);
            w.saturating_mul(h)
        }) {
            if !best.url.is_empty() {
                return Some(best.url.clone());
            }
        }
    }
    if source == "youtube" {
        let id = entry.id.as_deref()?;
        return Some(format!("https://i.ytimg.com/vi/{id}/hqdefault.jpg"));
    }
    None
}

fn make_track(entry: &SearchRoot, source: &str) -> Option<RemoteTrack> {
    let raw_id = entry.id.as_deref()?.trim();
    if raw_id.is_empty() {
        return None;
    }
    let url = entry
        .webpage_url
        .clone()
        .or_else(|| entry.url.clone())
        .filter(|u| u.starts_with("http"))?;
    let duration = entry.duration.unwrap_or(0.0);
    if !duration.is_finite() || duration <= 0.0 {
        return None;
    }
    if entry.live_status.as_deref() == Some("is_live") {
        return None;
    }

    let title = entry
        .title
        .clone()
        .unwrap_or_else(|| "Untitled".to_string())
        .trim()
        .to_string();
    let artist = entry
        .uploader
        .clone()
        .or_else(|| entry.channel.clone())
        .unwrap_or_else(|| "Unknown".to_string());
    let artist = artist
        .strip_suffix(" - Topic")
        .unwrap_or(artist.as_str())
        .trim()
        .to_string();

    let prefix = if source == "youtube" { "yt" } else { "sc" };
    Some(RemoteTrack {
        id: format!("{prefix}-{raw_id}"),
        title: if title.is_empty() {
            "Untitled".to_string()
        } else {
            title
        },
        artist,
        duration,
        thumbnail: pick_thumbnail(entry, source),
        url,
        source: source.to_string(),
        plays: entry.view_count.or(entry.play_count),
        preview: false,
    })
}

fn parse_search_json(raw: &str, source: &str) -> Result<Vec<RemoteTrack>, String> {
    let root: SearchRoot =
        serde_json::from_str(raw).map_err(|e| format!("Не удалось разобрать ответ yt-dlp: {e}"))?;

    let mut tracks = Vec::new();
    let mut seen = HashSet::new();

    if let Some(entries) = root.entries {
        for entry in entries {
            if let Some(track) = make_track(&entry, source) {
                if seen.insert(track.url.clone()) {
                    tracks.push(track);
                }
            }
        }
    } else if let Some(track) = make_track(&root, source) {
        if seen.insert(track.url.clone()) {
            tracks.push(track);
        }
    }

    Ok(tracks)
}

fn friendly_ytdlp_error(stderr: &str) -> String {
    let text = stderr.trim();
    if text.is_empty() {
        return "yt-dlp завершился с ошибкой".to_string();
    }
    let last = text
        .lines()
        .rev()
        .find(|line| !line.trim().is_empty())
        .unwrap_or(text)
        .trim()
        .trim_start_matches("ERROR: ")
        .to_string();
    if last.chars().count() > 400 {
        format!("{}…", last.chars().take(400).collect::<String>())
    } else {
        last
    }
}

async fn run_ytdlp_json(ytdlp: &Path, args: Vec<String>) -> Result<String, String> {
    let mut command = tokio::process::Command::new(ytdlp);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    prepare_tokio_command(&mut command);

    let mut child = command
        .spawn()
        .map_err(|e| format!("Не удалось запустить yt-dlp: {e}"))?;
    let mut stdout = child
        .stdout
        .take()
        .ok_or("Не удалось прочитать stdout yt-dlp")?;
    let mut stderr = child
        .stderr
        .take()
        .ok_or("Не удалось прочитать stderr yt-dlp")?;

    let out_task = tokio::spawn(async move {
        let mut buf = String::new();
        let _ = stdout.read_to_string(&mut buf).await;
        buf
    });
    let err_task = tokio::spawn(async move {
        let mut buf = String::new();
        let _ = stderr.read_to_string(&mut buf).await;
        buf
    });

    let status = match tokio::time::timeout(SEARCH_TIMEOUT, child.wait()).await {
        Ok(result) => result.map_err(|e| format!("Не удалось дождаться yt-dlp: {e}"))?,
        Err(_) => {
            let _ = child.kill().await;
            return Err("Поиск занял слишком много времени. Проверьте соединение.".to_string());
        }
    };
    let stdout_text = out_task.await.unwrap_or_default();
    let stderr_text = err_task.await.unwrap_or_default();

    if !status.success() {
        return Err(friendly_ytdlp_error(&stderr_text));
    }
    if stdout_text.trim().is_empty() {
        return Err(friendly_ytdlp_error(&stderr_text));
    }
    Ok(stdout_text)
}

async fn search_one(
    ytdlp: &Path,
    query: &str,
    source: &str,
    limit: u32,
) -> Result<Vec<RemoteTrack>, String> {
    let prefix = if source == "youtube" { "yt" } else { "sc" };
    let target = format!("{prefix}search{limit}:{query}");
    let args = vec![
        "--ignore-config".to_string(),
        "--no-warnings".to_string(),
        "--flat-playlist".to_string(),
        "--dump-single-json".to_string(),
        "--skip-download".to_string(),
        target,
    ];
    let raw = run_ytdlp_json(ytdlp, args).await?;
    parse_search_json(&raw, source)
}

async fn resolve_url_track(
    ytdlp: &Path,
    url: &str,
    source: &str,
) -> Result<Vec<RemoteTrack>, String> {
    let args = vec![
        "--ignore-config".to_string(),
        "--no-warnings".to_string(),
        "--no-playlist".to_string(),
        "--dump-single-json".to_string(),
        url.to_string(),
    ];
    let raw = run_ytdlp_json(ytdlp, args).await?;
    parse_search_json(&raw, source)
}

#[tauri::command]
pub async fn source_search(
    state: State<'_, AppState>,
    query: String,
    source: String,
    limit: Option<u32>,
) -> Result<Vec<RemoteTrack>, String> {
    let query = query.trim().to_string();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let limit = limit.unwrap_or(12).clamp(1, 30);

    let url_query = is_media_url(&query);
    let source = if url_query {
        infer_source(&query).ok_or("Ссылка должна вести на YouTube или SoundCloud")?
    } else if source == "soundcloud" {
        "soundcloud"
    } else {
        "youtube"
    };

    let cache_key = format!("{source}|{limit}|{query}");
    if let Ok(cache) = state.search_cache.lock() {
        if let Some((at, tracks)) = cache.get(&cache_key) {
            if at.elapsed() < Duration::from_secs(600) {
                return Ok(tracks.clone());
            }
        }
    }

    let ytdlp = find_binary("yt-dlp")
        .ok_or_else(|| "yt-dlp не найден. Установите его: sudo pacman -S yt-dlp".to_string())?;

    let tracks = if url_query {
        resolve_url_track(&ytdlp, &query, source).await?
    } else {
        search_one(&ytdlp, &query, source, limit).await?
    };

    if let Ok(mut cache) = state.search_cache.lock() {
        cache.retain(|_, (at, _)| at.elapsed() < Duration::from_secs(600));
        cache.insert(cache_key, (Instant::now(), tracks.clone()));
    }

    Ok(tracks)
}

fn cache_stats(dir: &Path) -> (u64, u64) {
    let mut bytes = 0u64;
    let mut files = 0u64;
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    bytes = bytes.saturating_add(meta.len());
                    files += 1;
                }
            }
        }
    }
    (bytes, files)
}

fn cache_info_for(dir: &Path) -> CacheInfo {
    let (bytes, files) = cache_stats(dir);
    CacheInfo {
        bytes,
        files,
        dir: dir.display().to_string(),
    }
}

#[tauri::command]
pub fn source_status(state: State<'_, AppState>) -> SourceStatus {
    let ytdlp = find_binary("yt-dlp").and_then(|p| tool_info(&p, &["--version"]));
    let ffmpeg = find_binary("ffmpeg").and_then(|p| tool_info(&p, &["-version"]));
    let ffprobe = find_binary("ffprobe").and_then(|p| tool_info(&p, &["-version"]));
    let mpv = find_binary("mpv").and_then(|p| tool_info(&p, &["--version"]));
    let (cache_bytes, cache_files) = cache_stats(&state.cache_dir);

    SourceStatus {
        ytdlp,
        ffmpeg,
        ffprobe,
        mpv,
        cache_bytes,
        cache_files,
        cache_dir: state.cache_dir.display().to_string(),
    }
}

#[tauri::command]
pub fn cache_info(state: State<'_, AppState>) -> CacheInfo {
    cache_info_for(&state.cache_dir)
}

#[tauri::command]
pub async fn clear_cache(state: State<'_, AppState>) -> Result<(), String> {
    let dir = state.cache_dir.clone();
    tokio::task::spawn_blocking(move || {
        if dir.exists() {
            std::fs::remove_dir_all(&dir).map_err(|e| format!("Не удалось очистить кэш: {e}"))?;
        }
        std::fs::create_dir_all(&dir).map_err(|e| format!("Не удалось создать папку кэша: {e}"))?;
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| format!("Не удалось очистить кэш: {e}"))?
}

fn prune_cache(dir: &Path, limit_mb: u64) -> Result<(), String> {
    let limit = if limit_mb == 0 {
        MAX_CACHE_BYTES_FALLBACK
    } else {
        limit_mb.saturating_mul(1024 * 1024)
    };
    let mut files: Vec<(PathBuf, u64, SystemTime)> = Vec::new();
    let mut total = 0u64;
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let Ok(meta) = entry.metadata() else { continue };
            if !meta.is_file() {
                continue;
            }
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            if name.ends_with(".part") || name.ends_with(".ytdl") {
                continue;
            }
            total = total.saturating_add(meta.len());
            files.push((
                path,
                meta.len(),
                meta.modified().unwrap_or(SystemTime::UNIX_EPOCH),
            ));
        }
    }
    if total <= limit {
        return Ok(());
    }
    files.sort_by_key(|(_, _, modified)| *modified);
    let count = files.len();
    for (index, (path, size, _)) in files.into_iter().enumerate() {
        if total <= limit || index == count - 1 {
            break;
        }
        if std::fs::remove_file(&path).is_ok() {
            total = total.saturating_sub(size);
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn set_cache_limit(state: State<'_, AppState>, max_mb: u64) -> Result<(), String> {
    state
        .cache_limit_mb
        .store(max_mb, std::sync::atomic::Ordering::Relaxed);
    let dir = state.cache_dir.clone();
    tokio::task::spawn_blocking(move || prune_cache(&dir, max_mb))
        .await
        .map_err(|e| format!("Не удалось обновить лимит кэша: {e}"))?
}

fn find_cached(dir: &Path, hash: &str) -> Option<PathBuf> {
    let prefix = format!("{hash}.");
    let mut best: Option<(PathBuf, u64)> = None;
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        let Some(name) = path.file_name().map(|n| n.to_string_lossy().to_string()) else {
            continue;
        };
        if !name.starts_with(&prefix) {
            continue;
        }
        if name.ends_with(".part") || name.ends_with(".ytdl") {
            continue;
        }
        let Ok(meta) = entry.metadata() else {
            continue;
        };
        if !meta.is_file() || meta.len() == 0 {
            continue;
        }
        if best
            .as_ref()
            .map(|(_, size)| meta.len() > *size)
            .unwrap_or(true)
        {
            best = Some((path, meta.len()));
        }
    }
    best.map(|(path, _)| path)
}

fn touch(path: &Path) {
    if let Ok(file) = std::fs::OpenOptions::new().write(true).open(path) {
        let _ = file.set_modified(SystemTime::now());
    }
}

fn ffprobe_duration(path: &Path) -> f64 {
    let Some(ffprobe) = find_binary("ffprobe") else {
        return 0.0;
    };
    let mut command = std::process::Command::new(ffprobe);
    command
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
        ])
        .arg(path);
    prepare_std_command(&mut command);
    let output = command.output();
    let Ok(output) = output else { return 0.0 };
    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse::<f64>()
        .unwrap_or(0.0)
}

fn looks_like_preview(url: &str, duration: f64) -> bool {
    let soundcloud = infer_source(url) == Some("soundcloud");
    soundcloud && duration > 0.0 && duration <= 31.5
}

fn part_paths(dir: &Path, hash: &str) -> Vec<PathBuf> {
    let mut found = Vec::new();
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path.file_name().map(|n| n.to_string_lossy().to_string());
            if let Some(name) = name {
                if name.starts_with(&format!("{hash}."))
                    && (name.ends_with(".part") || name.ends_with(".ytdl"))
                {
                    found.push(path);
                }
            }
        }
    }
    found
}

fn parse_percent(line: &str) -> Option<f64> {
    let idx = line.find('%')?;
    let prefix = &line[..idx];
    let start = prefix
        .rfind(|c: char| !(c.is_ascii_digit() || c == '.'))
        .map(|i| i + 1)
        .unwrap_or(0);
    prefix[start..].trim().parse::<f64>().ok()
}

async fn download_audio(
    app: Option<AppHandle>,
    ytdlp: &Path,
    cache_dir: &Path,
    hash: &str,
    url: &str,
    track_id: &str,
    quality: &str,
) -> Result<String, String> {
    let output_template = cache_dir.join(format!("{hash}.%(ext)s"));
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
        .arg("--restrict-filenames")
        .arg("-f")
        .arg(format_selector(quality))
        .arg("-o")
        .arg(&output_template)
        .arg(url)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    prepare_tokio_command(&mut command);

    let mut child = command
        .spawn()
        .map_err(|e| format!("Не удалось запустить yt-dlp: {e}"))?;
    let stdout = child.stdout.take().ok_or("Нет stdout yt-dlp")?;
    let stderr = child.stderr.take().ok_or("Нет stderr yt-dlp")?;

    let app_handle = app;
    let id = track_id.to_string();
    let out_task = tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        let mut tail = String::new();
        let mut last_emit = Instant::now() - Duration::from_secs(1);
        while let Ok(Some(line)) = lines.next_line().await {
            if let Some(percent) = parse_percent(&line) {
                if last_emit.elapsed() >= Duration::from_millis(250) {
                    if let Some(app) = app_handle.as_ref() {
                        let _ = app.emit(
                            "lumen://download-progress",
                            DownloadProgress {
                                track_id: id.clone(),
                                percent,
                                phase: "download".to_string(),
                            },
                        );
                    }
                    last_emit = Instant::now();
                }
            }
            tail.push_str(&line);
            tail.push('\n');
            if tail.len() > 32_000 {
                let start = tail
                    .char_indices()
                    .rev()
                    .nth(24_000)
                    .map(|(index, _)| index)
                    .unwrap_or(0);
                tail = tail[start..].to_string();
            }
        }
        tail
    });

    let err_task = tokio::spawn(async move {
        let mut buf = String::new();
        let _ = BufReader::new(stderr).read_to_string(&mut buf).await;
        buf
    });

    let status = match tokio::time::timeout(DOWNLOAD_TIMEOUT, child.wait()).await {
        Ok(result) => result.map_err(|e| format!("Не удалось дождаться yt-dlp: {e}"))?,
        Err(_) => {
            let _ = child.kill().await;
            for path in part_paths(cache_dir, hash) {
                let _ = std::fs::remove_file(path);
            }
            return Err("Скачивание заняло слишком много времени".to_string());
        }
    };

    let stdout_text = out_task.await.unwrap_or_default();
    let stderr_text = err_task.await.unwrap_or_default();

    if !status.success() {
        for path in part_paths(cache_dir, hash) {
            let _ = std::fs::remove_file(path);
        }
        return Err(friendly_ytdlp_error(&stderr_text));
    }

    Ok(format!("{stdout_text}\n{stderr_text}"))
}

#[tauri::command]
pub async fn prepare_track(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    track_id: String,
    quality: Option<String>,
) -> Result<PreparedTrack, String> {
    let normalized = normalize_media_url(&url);
    validate_media_url(&normalized)?;
    let quality = quality
        .filter(|value| matches!(value.as_str(), "low" | "normal" | "high" | "lossless"))
        .unwrap_or_else(|| "high".to_string());
    let hash = cache_hash(&normalized, &quality);
    let cache_limit = state
        .cache_limit_mb
        .load(std::sync::atomic::Ordering::Relaxed);

    if let Some(path) = find_cached(&state.cache_dir, &hash) {
        touch(&path);
        let duration = ffprobe_duration(&path);
        let preview = looks_like_preview(&normalized, duration);
        let _ = prune_cache(&state.cache_dir, cache_limit);
        return Ok(PreparedTrack {
            path: path.display().to_string(),
            duration,
            preview,
            cached: true,
        });
    }

    let ytdlp = find_binary("yt-dlp")
        .ok_or_else(|| "yt-dlp не найден. Установите его: sudo pacman -S yt-dlp".to_string())?;
    std::fs::create_dir_all(&state.cache_dir)
        .map_err(|e| format!("Не удалось создать папку кэша: {e}"))?;

    let _permit = state
        .download_sem
        .acquire()
        .await
        .map_err(|_| "Очередь загрузок недоступна".to_string())?;

    // Two rapid play requests for the same track must not write the same
    // output file at the same time. Wait for the first download and reuse it.
    loop {
        let mut active = state.downloading.lock().await;
        if active.insert(hash.clone()) {
            break;
        }
        drop(active);
        if let Some(path) = find_cached(&state.cache_dir, &hash) {
            touch(&path);
            let duration = ffprobe_duration(&path);
            let preview = looks_like_preview(&normalized, duration);
            return Ok(PreparedTrack {
                path: path.display().to_string(),
                duration,
                preview,
                cached: true,
            });
        }
        tokio::time::sleep(Duration::from_millis(120)).await;
    }

    if let Some(path) = find_cached(&state.cache_dir, &hash) {
        touch(&path);
        let duration = ffprobe_duration(&path);
        let preview = looks_like_preview(&normalized, duration);
        state.downloading.lock().await.remove(&hash);
        return Ok(PreparedTrack {
            path: path.display().to_string(),
            duration,
            preview,
            cached: true,
        });
    }

    let download_result = download_audio(
        Some(app.clone()),
        &ytdlp,
        &state.cache_dir,
        &hash,
        &normalized,
        &track_id,
        &quality,
    )
    .await;
    state.downloading.lock().await.remove(&hash);
    let log = download_result?;
    let path = find_cached(&state.cache_dir, &hash)
        .ok_or_else(|| "yt-dlp не создал аудиофайл".to_string())?;
    touch(&path);

    let duration = ffprobe_duration(&path);
    let preview =
        log.to_lowercase().contains("preview") || looks_like_preview(&normalized, duration);
    let _ = prune_cache(&state.cache_dir, cache_limit);

    Ok(PreparedTrack {
        path: path.display().to_string(),
        duration,
        preview,
        cached: false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_youtube_urls() {
        assert_eq!(
            normalize_media_url("https://youtu.be/FGBhQbmPwH8?t=10"),
            "https://www.youtube.com/watch?v=FGBhQbmPwH8"
        );
        assert_eq!(
            normalize_media_url("https://www.youtube.com/watch?v=A2VpR8HahKc&list=x"),
            "https://www.youtube.com/watch?v=A2VpR8HahKc"
        );
    }

    #[test]
    fn detects_soundcloud_preview() {
        assert!(looks_like_preview(
            "https://soundcloud.com/artist/track",
            30.0
        ));
        assert!(!looks_like_preview(
            "https://soundcloud.com/artist/track",
            180.0
        ));
        assert!(!looks_like_preview(
            "https://www.youtube.com/watch?v=x",
            30.0
        ));
    }

    #[tokio::test]
    #[ignore]
    async fn live_downloads_youtube_audio() {
        let ytdlp = find_binary("yt-dlp").expect("yt-dlp is installed");
        let url = normalize_media_url("https://www.youtube.com/watch?v=A2VpR8HahKc");
        let hash = sha256_hex(&url);
        let dir = std::env::temp_dir().join(format!("lumen-audio-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("test cache directory");
        let result = download_audio(None, &ytdlp, &dir, &hash, &url, "test-track", "high").await;
        let path = find_cached(&dir, &hash);
        let _ = std::fs::remove_dir_all(&dir);
        assert!(result.is_ok(), "{:?}", result.err());
        assert!(path.is_some(), "downloaded file not found");
    }

    #[tokio::test]
    #[ignore]
    async fn live_search_returns_tracks() {
        let ytdlp = find_binary("yt-dlp").expect("yt-dlp is installed");
        let youtube = search_one(&ytdlp, "daft punk", "youtube", 3)
            .await
            .expect("youtube search");
        let soundcloud = search_one(&ytdlp, "daft punk", "soundcloud", 3)
            .await
            .expect("soundcloud search");
        assert!(!youtube.is_empty());
        assert!(!soundcloud.is_empty());
        assert!(youtube.iter().all(|item| item.source == "youtube"));
        assert!(soundcloud.iter().all(|item| item.source == "soundcloud"));
    }
}

#[cfg(test)]
mod quality_tests {
    use super::*;

    #[test]
    fn quality_changes_cache_key_and_selector() {
        let url = "https://www.youtube.com/watch?v=abc";
        assert_eq!(cache_hash(url, "high"), sha256_hex(url));
        assert_ne!(cache_hash(url, "low"), cache_hash(url, "high"));
        assert_eq!(
            format_selector("low"),
            "worstaudio[abr<=96]/worstaudio/best"
        );
        assert_eq!(
            format_selector("normal"),
            "bestaudio[abr<=128]/bestaudio/best"
        );
        assert_eq!(format_selector("high"), "bestaudio/best");
        assert_eq!(
            format_selector("lossless"),
            "bestaudio[acodec=flac]/bestaudio/best"
        );
        assert_eq!(format_selector("unknown"), "bestaudio/best");
    }
}

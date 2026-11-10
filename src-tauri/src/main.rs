#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod mpv;
mod sources;

use std::path::PathBuf;
use std::sync::atomic::AtomicU64;
use std::sync::Mutex;
use std::time::Instant;
use tauri::Manager;

pub struct AppState {
    pub cache_dir: PathBuf,
    pub cache_limit_mb: AtomicU64,
    pub download_sem: tokio::sync::Semaphore,
    pub search_cache:
        Mutex<std::collections::HashMap<String, (Instant, Vec<sources::RemoteTrack>)>>,
    pub mpv: Mutex<Option<mpv::MpvProcess>>,
}

impl AppState {
    fn new() -> Self {
        let cache_dir = dirs::cache_dir()
            .unwrap_or_else(std::env::temp_dir)
            .join("lumen")
            .join("audio");
        let _ = std::fs::create_dir_all(&cache_dir);
        Self {
            cache_dir,
            cache_limit_mb: AtomicU64::new(2048),
            download_sem: tokio::sync::Semaphore::new(2),
            search_cache: Mutex::new(std::collections::HashMap::new()),
            mpv: Mutex::new(None),
        }
    }
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            sources::source_status,
            sources::source_search,
            sources::prepare_track,
            sources::cache_info,
            sources::clear_cache,
            sources::set_cache_limit,
            mpv::play_file,
            mpv::set_pause,
            mpv::seek,
            mpv::set_volume,
            mpv::set_speed,
            mpv::stop,
            mpv::mpv_status,
        ])
        .build(tauri::generate_context!())
        .expect("error while running Lumen")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(state) = app_handle.try_state::<AppState>() {
                    mpv::shutdown(&state);
                }
            }
        });
}

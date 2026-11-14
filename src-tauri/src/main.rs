#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod downloads;
mod integrations;
mod lastfm;
mod local;
mod lyrics;
mod mpv;
mod sources;
mod storage;

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64};
use std::sync::Mutex;
use std::time::Instant;
use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

pub struct AppState {
    pub cache_dir: PathBuf,
    pub cache_limit_mb: AtomicU64,
    pub download_sem: tokio::sync::Semaphore,
    pub search_cache:
        Mutex<std::collections::HashMap<String, (Instant, Vec<sources::RemoteTrack>)>>,
    pub mpv: Mutex<Option<mpv::MpvProcess>>,
    pub local_roots: Mutex<Vec<PathBuf>>,
    pub downloading: tokio::sync::Mutex<std::collections::HashSet<String>>,
    pub audio_filters: Mutex<String>,
    pub gapless: AtomicBool,
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
            local_roots: Mutex::new(Vec::new()),
            downloading: tokio::sync::Mutex::new(std::collections::HashSet::new()),
            audio_filters: Mutex::new(String::new()),
            gapless: AtomicBool::new(true),
        }
    }
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn deep_link_current(app: tauri::AppHandle) -> Vec<String> {
    app.deep_link()
        .get_current()
        .ok()
        .flatten()
        .map(|urls| urls.iter().map(|url| url.to_string()).collect())
        .unwrap_or_default()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            let _ = app.emit("lumen://second-instance", argv);
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState::new())
        .manage(integrations::MediaState::new())
        .manage(integrations::DiscordState::new())
        .manage(lastfm::LastFmState::new())
        .manage(lyrics::LyricsState::new())
        .setup(|app| {
            if let Ok(resource_dir) = app.path().resource_dir() {
                sources::set_bundled_bin_dir(resource_dir.join("bin"));
            }

            if let Err(error) = integrations::setup_tray(app.handle()) {
                eprintln!("Не удалось создать иконку в трее: {error}");
            }
            integrations::setup_media(app.handle(), &*app.state::<integrations::MediaState>());

            if let Err(error) = app.deep_link().register_all() {
                eprintln!("Не удалось зарегистрировать deep links: {error}");
            }

            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let urls: Vec<String> = event.urls().iter().map(|url| url.to_string()).collect();
                let _ = handle.emit("lumen://deep-link", urls);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sources::source_status,
            sources::source_search,
            sources::prepare_track,
            sources::cache_info,
            sources::clear_cache,
            sources::set_cache_limit,
            storage::load_state,
            storage::save_state,
            storage::remove_state,
            storage::state_path,
            mpv::play_file,
            mpv::set_pause,
            mpv::seek,
            mpv::set_volume,
            mpv::set_speed,
            mpv::stop,
            mpv::mpv_status,
            mpv::set_audio_filters,
            mpv::set_gapless,
            integrations::set_media_enabled,
            integrations::media_update,
            integrations::discord_connect,
            integrations::discord_disconnect,
            integrations::discord_update,
            integrations::set_tray_enabled,
            integrations::tray_available,
            lastfm::lastfm_get_token,
            lastfm::lastfm_get_session,
            lastfm::lastfm_now_playing,
            lastfm::lastfm_scrobble,
            lyrics::fetch_lyrics,
            local::set_local_roots,
            local::scan_local,
            downloads::download_track,
            deep_link_current,
            quit_app,
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

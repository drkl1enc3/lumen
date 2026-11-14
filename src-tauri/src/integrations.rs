use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use serde_json::json;
use souvlaki::{
    MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig,
};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State};

pub struct MediaState {
    controls: Mutex<Option<MediaControls>>,
    enabled: AtomicBool,
}

impl MediaState {
    pub fn new() -> Self {
        Self {
            controls: Mutex::new(None),
            enabled: AtomicBool::new(true),
        }
    }
}

fn create_media_controls(app: &AppHandle) -> Result<MediaControls, String> {
    #[cfg(windows)]
    let hwnd = app
        .get_webview_window("main")
        .and_then(|window| window.hwnd().ok())
        .map(|handle| handle.0 as *mut std::ffi::c_void);
    #[cfg(not(windows))]
    let hwnd = None;

    let config = PlatformConfig {
        dbus_name: "lumen",
        display_name: "Lumen",
        hwnd,
    };
    let mut controls = MediaControls::new(config)
        .map_err(|error| format!("Не удалось подключить системные медиаклавиши: {error}"))?;
    let handle = app.clone();
    controls
        .attach(move |event| {
            let payload = match event {
                MediaControlEvent::Play => Some(json!({ "action": "play" })),
                MediaControlEvent::Pause => Some(json!({ "action": "pause" })),
                MediaControlEvent::Toggle => Some(json!({ "action": "toggle" })),
                MediaControlEvent::Next => Some(json!({ "action": "next" })),
                MediaControlEvent::Previous => Some(json!({ "action": "prev" })),
                MediaControlEvent::Stop => Some(json!({ "action": "stop" })),
                MediaControlEvent::SetPosition(MediaPosition(position)) => {
                    Some(json!({ "action": "seek", "position": position.as_secs_f64() }))
                }
                MediaControlEvent::SeekBy(direction, amount) => {
                    let sign = match direction {
                        souvlaki::SeekDirection::Forward => 1.0,
                        souvlaki::SeekDirection::Backward => -1.0,
                    };
                    Some(json!({ "action": "seekBy", "delta": sign * amount.as_secs_f64() }))
                }
                _ => None,
            };
            if let Some(payload) = payload {
                let _ = handle.emit("lumen://media-control", payload);
            }
        })
        .map_err(|error| format!("Не удалось подключить обработчик медиаклавиш: {error}"))?;
    Ok(controls)
}

pub fn setup_media(app: &AppHandle, state: &MediaState) {
    if !state.enabled.load(Ordering::Relaxed) {
        return;
    }
    match create_media_controls(app) {
        Ok(controls) => {
            if let Ok(mut slot) = state.controls.lock() {
                *slot = Some(controls);
            }
        }
        Err(error) => {
            eprintln!("{error}");
        }
    }
}

#[tauri::command]
pub fn set_media_enabled(
    app: AppHandle,
    state: State<'_, MediaState>,
    enabled: bool,
) -> Result<(), String> {
    state.enabled.store(enabled, Ordering::Relaxed);
    let mut slot = state
        .controls
        .lock()
        .map_err(|_| "Медиаклавиши заблокированы".to_string())?;
    if !enabled {
        if let Some(controls) = slot.take() {
            let mut controls = controls;
            let _ = controls.detach();
        }
        return Ok(());
    }
    if slot.is_none() {
        *slot = Some(create_media_controls(&app)?);
    }
    Ok(())
}

#[tauri::command]
pub fn media_update(
    state: State<'_, MediaState>,
    playing: bool,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    duration: Option<f64>,
    volume: f64,
    cover: Option<String>,
) -> Result<(), String> {
    if !state.enabled.load(Ordering::Relaxed) {
        return Ok(());
    }
    let mut slot = state
        .controls
        .lock()
        .map_err(|_| "Медиаклавиши заблокированы".to_string())?;
    let Some(controls) = slot.as_mut() else {
        return Ok(());
    };

    let playback = if playing {
        MediaPlayback::Playing { progress: None }
    } else if title.is_some() {
        MediaPlayback::Paused { progress: None }
    } else {
        MediaPlayback::Stopped
    };
    controls
        .set_playback(playback)
        .map_err(|error| format!("MPRIS: {error}"))?;

    let metadata = if title.is_some() {
        MediaMetadata {
            title: title.as_deref(),
            artist: artist.as_deref(),
            album: album.as_deref(),
            cover_url: cover.as_deref(),
            duration: duration
                .filter(|value| value.is_finite() && *value > 0.0)
                .map(Duration::from_secs_f64),
        }
    } else {
        MediaMetadata::default()
    };
    controls
        .set_metadata(metadata)
        .map_err(|error| format!("MPRIS: {error}"))?;
    controls
        .set_volume(volume.clamp(0.0, 1.0))
        .map_err(|error| format!("MPRIS: {error}"))?;
    Ok(())
}

pub struct DiscordState {
    client: Mutex<Option<DiscordIpcClient>>,
    app_id: Mutex<String>,
    enabled: AtomicBool,
    last_attempt: Mutex<Option<Instant>>,
}

impl DiscordState {
    pub fn new() -> Self {
        Self {
            client: Mutex::new(None),
            app_id: Mutex::new(String::new()),
            enabled: AtomicBool::new(false),
            last_attempt: Mutex::new(None),
        }
    }
}

fn connect_discord(app_id: &str) -> Result<DiscordIpcClient, String> {
    let trimmed = app_id.trim();
    if trimmed.is_empty() {
        return Err("Укажите Discord Application ID в настройках".to_string());
    }
    let mut client = DiscordIpcClient::new(trimmed);
    client
        .connect()
        .map_err(|error| format!("Не удалось подключиться к Discord: {error}"))?;
    Ok(client)
}

#[tauri::command]
pub fn discord_connect(state: State<'_, DiscordState>, app_id: String) -> Result<(), String> {
    *state
        .app_id
        .lock()
        .map_err(|_| "Discord заблокирован".to_string())? = app_id.clone();
    state.enabled.store(true, Ordering::Relaxed);
    let mut client = connect_discord(&app_id)?;
    let _ = client.clear_activity();
    *state
        .client
        .lock()
        .map_err(|_| "Discord заблокирован".to_string())? = Some(client);
    *state
        .last_attempt
        .lock()
        .map_err(|_| "Discord заблокирован".to_string())? = Some(Instant::now());
    Ok(())
}

#[tauri::command]
pub fn discord_disconnect(state: State<'_, DiscordState>) -> Result<(), String> {
    state.enabled.store(false, Ordering::Relaxed);
    if let Ok(mut slot) = state.client.lock() {
        if let Some(mut client) = slot.take() {
            let _ = client.clear_activity();
            let _ = client.close();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn discord_update(
    state: State<'_, DiscordState>,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    playing: bool,
    show_track: bool,
) -> Result<(), String> {
    if !state.enabled.load(Ordering::Relaxed) {
        return Ok(());
    }

    let app_id = state
        .app_id
        .lock()
        .map_err(|_| "Discord заблокирован".to_string())?
        .clone();

    let mut slot = state
        .client
        .lock()
        .map_err(|_| "Discord заблокирован".to_string())?;
    if slot.is_none() {
        let mut last_attempt = state
            .last_attempt
            .lock()
            .map_err(|_| "Discord заблокирован".to_string())?;
        if last_attempt
            .map(|value| value.elapsed() < Duration::from_secs(25))
            .unwrap_or(false)
        {
            return Ok(());
        }
        *last_attempt = Some(Instant::now());
        match connect_discord(&app_id) {
            Ok(client) => *slot = Some(client),
            Err(error) => return Err(error),
        }
    }

    let Some(client) = slot.as_mut() else {
        return Ok(());
    };

    if title.is_none() {
        let _ = client.clear_activity();
        return Ok(());
    }

    let title = title.unwrap_or_default();
    let artist = artist.unwrap_or_default();
    let state_text = if show_track {
        if artist.is_empty() {
            "Слушает музыку".to_string()
        } else {
            artist
        }
    } else {
        "Lumen".to_string()
    };
    let details = if show_track {
        title
    } else {
        "Слушает музыку".to_string()
    };
    let mut payload = activity::Activity::new()
        .details(details)
        .state(state_text.clone());
    if let Some(album) = album.filter(|value| !value.trim().is_empty()) {
        payload = payload.state(format!("{state_text} · {album}"));
    }
    if !playing {
        payload = payload.state("На паузе");
    }
    client
        .set_activity(payload)
        .map_err(|error| format!("Discord: {error}"))?;
    Ok(())
}

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Показать Lumen", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "Играть / Пауза", true, None::<&str>)?;
    let next = MenuItem::with_id(app, "next", "Следующий трек", true, None::<&str>)?;
    let previous = MenuItem::with_id(app, "previous", "Предыдущий трек", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &toggle, &next, &previous, &separator, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Lumen")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "toggle" => {
                let _ = app.emit("lumen://tray-action", "toggle");
            }
            "next" => {
                let _ = app.emit("lumen://tray-action", "next");
            }
            "previous" => {
                let _ = app.emit("lumen://tray-action", "prev");
            }
            "quit" => {
                let _ = app.emit("lumen://tray-action", "quit");
                let fallback = app.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(1200));
                    fallback.exit(0);
                });
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

#[tauri::command]
pub fn tray_available(app: AppHandle) -> bool {
    app.tray_by_id("main").is_some()
}

#[tauri::command]
pub fn set_tray_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_visible(enabled)
            .map_err(|error| format!("Трей: {error}"))?;
    }
    Ok(())
}

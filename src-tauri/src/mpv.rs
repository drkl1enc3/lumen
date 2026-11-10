use crate::sources::find_binary;
use crate::AppState;
use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};

#[cfg(unix)]
use std::os::unix::net::UnixStream;
#[cfg(unix)]
use std::os::unix::process::CommandExt;

#[cfg(unix)]
type IpcStream = UnixStream;
#[cfg(windows)]
type IpcStream = std::fs::File;

pub struct MpvProcess {
    pub child: Child,
    writer: IpcStream,
    socket: String,
}

#[cfg(unix)]
fn ipc_address() -> String {
    std::env::temp_dir()
        .join(format!("lumen-mpv-{}.sock", std::process::id()))
        .display()
        .to_string()
}

#[cfg(windows)]
fn ipc_address() -> String {
    format!(r"\\.\pipe\lumen-mpv-{}", std::process::id())
}

#[cfg(unix)]
fn connect_ipc(address: &str) -> std::io::Result<IpcStream> {
    UnixStream::connect(address)
}

#[cfg(windows)]
fn connect_ipc(address: &str) -> std::io::Result<IpcStream> {
    std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(address)
}

#[cfg(unix)]
fn cleanup_ipc(address: &str) {
    let _ = std::fs::remove_file(address);
}

#[cfg(windows)]
fn cleanup_ipc(_address: &str) {}

#[cfg(unix)]
fn configure_child(command: &mut Command) {
    unsafe {
        command.pre_exec(|| {
            libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGTERM);
            Ok(())
        });
    }
}

#[cfg(windows)]
fn configure_child(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    command.creation_flags(0x08000000);
}

fn send(writer: &mut IpcStream, value: Value) -> Result<(), String> {
    writer
        .write_all(value.to_string().as_bytes())
        .map_err(|e| format!("mpv IPC: {e}"))?;
    writer
        .write_all(b"\n")
        .map_err(|e| format!("mpv IPC: {e}"))?;
    writer.flush().map_err(|e| format!("mpv IPC: {e}"))
}

fn send_command(writer: &mut IpcStream, command: Value) -> Result<(), String> {
    send(writer, json!({ "command": command }))
}

fn read_events(reader: IpcStream, app: AppHandle) {
    let mut last_position = Instant::now() - Duration::from_secs(1);
    for line in BufReader::new(reader).lines().map_while(Result::ok) {
        let Ok(value) = serde_json::from_str::<Value>(&line) else {
            continue;
        };
        let event = value.get("event").and_then(Value::as_str).unwrap_or("");
        match event {
            "property-change" => {
                let name = value.get("name").and_then(Value::as_str).unwrap_or("");
                let data = value.get("data");
                if name == "time-pos" {
                    if let Some(position) = data.and_then(Value::as_f64) {
                        if last_position.elapsed() >= Duration::from_millis(200) {
                            let _ = app.emit("lumen://playback-position", position);
                            last_position = Instant::now();
                        }
                    }
                } else if name == "duration" {
                    if let Some(duration) = data.and_then(Value::as_f64) {
                        if duration.is_finite() && duration > 0.0 {
                            let _ = app.emit("lumen://playback-duration", duration);
                        }
                    }
                }
            }
            "end-file" => {
                let reason = value.get("reason").and_then(Value::as_str).unwrap_or("");
                if reason == "eof" {
                    let _ = app.emit("lumen://playback-ended", ());
                } else if reason == "error" {
                    let _ = app.emit(
                        "lumen://playback-error",
                        "mpv не смог воспроизвести этот файл".to_string(),
                    );
                }
            }
            _ => {}
        }
    }
    let _ = app.emit(
        "lumen://playback-error",
        "mpv завершился неожиданно".to_string(),
    );
}

fn start_mpv(slot: &mut Option<MpvProcess>, app: &AppHandle) -> Result<(), String> {
    let mpv = find_binary("mpv")
        .ok_or_else(|| "mpv не найден. Установите mpv и добавьте его в PATH".to_string())?;
    let socket = ipc_address();
    cleanup_ipc(&socket);

    let mut command = Command::new(&mpv);
    command
        .arg("--no-config")
        .arg("--idle=yes")
        .arg("--no-video")
        .arg("--no-terminal")
        .arg("--really-quiet")
        .arg("--audio-display=no")
        .arg("--force-window=no")
        .arg("--osc=no")
        .arg("--ytdl=no")
        .arg("--keep-open=no")
        .arg("--pause=yes")
        .arg("--load-scripts=no")
        .arg(format!("--input-ipc-server={socket}"))
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    configure_child(&mut command);
    let child = command
        .spawn()
        .map_err(|e| format!("Не удалось запустить mpv: {e}"))?;

    let mut writer = None;
    for _ in 0..100 {
        match connect_ipc(&socket) {
            Ok(stream) => {
                writer = Some(stream);
                break;
            }
            Err(_) => std::thread::sleep(Duration::from_millis(50)),
        }
    }
    let mut writer = writer.ok_or_else(|| "Не удалось подключиться к mpv IPC".to_string())?;
    let reader = writer
        .try_clone()
        .map_err(|e| format!("Не удалось создать поток mpv IPC: {e}"))?;

    let app_handle = app.clone();
    std::thread::spawn(move || read_events(reader, app_handle));

    for (id, property) in [(1, "time-pos"), (2, "duration"), (3, "pause")] {
        send_command(&mut writer, json!(["observe_property", id, property]))?;
    }

    *slot = Some(MpvProcess {
        child,
        writer,
        socket,
    });
    Ok(())
}

fn with_mpv<F>(state: &AppState, app: &AppHandle, action: F) -> Result<(), String>
where
    F: FnOnce(&mut MpvProcess) -> Result<(), String>,
{
    let mut slot = state
        .mpv
        .lock()
        .map_err(|_| "mpv заблокирован".to_string())?;

    let needs_restart = match slot.as_mut() {
        Some(process) => match process.child.try_wait() {
            Ok(None) => false,
            _ => true,
        },
        None => true,
    };
    if needs_restart {
        if let Some(mut process) = slot.take() {
            let _ = process.child.kill();
            let _ = process.child.wait();
            cleanup_ipc(&process.socket);
        }
        start_mpv(&mut slot, app)?;
    }

    let process = slot.as_mut().ok_or("mpv не запущен")?;
    action(process)
}

pub fn shutdown(state: &AppState) {
    let Ok(mut slot) = state.mpv.lock() else {
        return;
    };
    if let Some(mut process) = slot.take() {
        let _ = send_command(&mut process.writer, json!(["quit"]));
        let deadline = Instant::now() + Duration::from_millis(700);
        while Instant::now() < deadline {
            match process.child.try_wait() {
                Ok(Some(_)) => break,
                _ => std::thread::sleep(Duration::from_millis(30)),
            }
        }
        let _ = process.child.kill();
        let _ = process.child.wait();
        cleanup_ipc(&process.socket);
    }
}

fn ensure_cache_path(state: &AppState, path: &str) -> Result<PathBuf, String> {
    let canonical =
        std::fs::canonicalize(path).map_err(|e| format!("Файл не найден в кэше: {e}"))?;
    let cache = std::fs::canonicalize(&state.cache_dir)
        .map_err(|e| format!("Папка кэша недоступна: {e}"))?;
    if !canonical.starts_with(&cache) {
        return Err("Можно воспроизводить только файлы из кэша Lumen".to_string());
    }
    Ok(canonical)
}

#[tauri::command]
pub fn play_file(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
    paused: bool,
    position: Option<f64>,
    volume: Option<f64>,
    muted: Option<bool>,
    speed: Option<f64>,
) -> Result<(), String> {
    let path = ensure_cache_path(&state, &path)?;
    with_mpv(&state, &app, |process| {
        send_command(
            &mut process.writer,
            json!(["loadfile", path.display().to_string(), "replace"]),
        )?;
        send_command(&mut process.writer, json!(["set_property", "pause", true]))?;
        if let Some(volume) = volume {
            send_command(
                &mut process.writer,
                json!(["set_property", "volume", (volume.clamp(0.0, 1.0) * 100.0)]),
            )?;
        }
        if let Some(muted) = muted {
            send_command(&mut process.writer, json!(["set_property", "mute", muted]))?;
        }
        if let Some(speed) = speed {
            send_command(
                &mut process.writer,
                json!(["set_property", "speed", speed.clamp(0.25, 4.0)]),
            )?;
        }
        if let Some(position) = position {
            if position > 0.25 {
                send_command(
                    &mut process.writer,
                    json!(["seek", position, "absolute", "exact"]),
                )?;
            }
        }
        if !paused {
            send_command(&mut process.writer, json!(["set_property", "pause", false]))?;
        }
        Ok(())
    })
}

#[tauri::command]
pub fn set_pause(state: State<'_, AppState>, app: AppHandle, paused: bool) -> Result<(), String> {
    with_mpv(&state, &app, |process| {
        send_command(
            &mut process.writer,
            json!(["set_property", "pause", paused]),
        )
    })
}

#[tauri::command]
pub fn seek(state: State<'_, AppState>, app: AppHandle, seconds: f64) -> Result<(), String> {
    with_mpv(&state, &app, |process| {
        send_command(
            &mut process.writer,
            json!(["seek", seconds.max(0.0), "absolute", "exact"]),
        )
    })
}

#[tauri::command]
pub fn set_volume(
    state: State<'_, AppState>,
    app: AppHandle,
    volume: f64,
    muted: bool,
) -> Result<(), String> {
    with_mpv(&state, &app, |process| {
        send_command(
            &mut process.writer,
            json!(["set_property", "volume", volume.clamp(0.0, 1.0) * 100.0]),
        )?;
        send_command(&mut process.writer, json!(["set_property", "mute", muted]))
    })
}

#[tauri::command]
pub fn set_speed(state: State<'_, AppState>, app: AppHandle, speed: f64) -> Result<(), String> {
    with_mpv(&state, &app, |process| {
        send_command(
            &mut process.writer,
            json!(["set_property", "speed", speed.clamp(0.25, 4.0)]),
        )
    })
}

#[tauri::command]
pub fn stop(state: State<'_, AppState>) -> Result<(), String> {
    let mut slot = state
        .mpv
        .lock()
        .map_err(|_| "mpv заблокирован".to_string())?;
    if let Some(process) = slot.as_mut() {
        if matches!(process.child.try_wait(), Ok(None)) {
            send_command(&mut process.writer, json!(["stop"]))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn mpv_status(state: State<'_, AppState>) -> bool {
    let Ok(mut slot) = state.mpv.lock() else {
        return false;
    };
    match slot.as_mut() {
        Some(process) => matches!(process.child.try_wait(), Ok(None)),
        None => false,
    }
}

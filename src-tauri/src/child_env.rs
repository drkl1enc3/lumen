use std::ffi::OsString;
use std::path::Path;

fn appdir() -> Option<OsString> {
    std::env::var_os("APPDIR")
}

fn is_appdir_path(path: &Path) -> bool {
    appdir()
        .map(|dir| path.starts_with(Path::new(&dir)))
        .unwrap_or(false)
}

fn clean_path() -> Option<OsString> {
    appdir()?;
    let current = std::env::var_os("PATH")?;
    let paths = std::env::split_paths(&current)
        .filter(|path| !is_appdir_path(path))
        .collect::<Vec<_>>();
    std::env::join_paths(paths).ok()
}

fn remove_appimage_env(command: &mut std::process::Command) {
    if appdir().is_none() {
        return;
    }
    for name in [
        "PYTHONHOME",
        "PYTHONPATH",
        "PYTHONSTARTUP",
        "PYTHONUSERBASE",
        "PYTHONDONTWRITEBYTECODE",
        "LD_LIBRARY_PATH",
        "GST_PLUGIN_SYSTEM_PATH",
        "GI_TYPELIB_PATH",
        "GTK_PATH",
        "QT_PLUGIN_PATH",
    ] {
        command.env_remove(name);
    }
    if let Some(path) = clean_path() {
        command.env("PATH", path);
    }
}

fn remove_appimage_env_tokio(command: &mut tokio::process::Command) {
    if appdir().is_none() {
        return;
    }
    for name in [
        "PYTHONHOME",
        "PYTHONPATH",
        "PYTHONSTARTUP",
        "PYTHONUSERBASE",
        "PYTHONDONTWRITEBYTECODE",
        "LD_LIBRARY_PATH",
        "GST_PLUGIN_SYSTEM_PATH",
        "GI_TYPELIB_PATH",
        "GTK_PATH",
        "QT_PLUGIN_PATH",
    ] {
        command.env_remove(name);
    }
    if let Some(path) = clean_path() {
        command.env("PATH", path);
    }
}

/// AppImage's AppRun exports its own Python and GTK library paths. System
/// tools such as yt-dlp/ffmpeg/mpv must not inherit those paths, otherwise
/// Python scripts fail with "<no Python frame>".
pub fn sanitize_std(command: &mut std::process::Command) {
    remove_appimage_env(command);
}

pub fn sanitize_tokio(command: &mut tokio::process::Command) {
    remove_appimage_env_tokio(command);
}

/// Keep AppImage's private /usr/bin from shadowing the user's system tools.
pub fn is_private_path(path: &Path) -> bool {
    is_appdir_path(path)
}

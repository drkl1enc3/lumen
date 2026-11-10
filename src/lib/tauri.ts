export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function appWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

export async function minimizeWindow() {
  if (!isTauri) return;
  try {
    await (await appWindow()).minimize();
  } catch {
    /* ignore */
  }
}

export async function toggleMaximizeWindow() {
  if (!isTauri) return;
  try {
    const w = await appWindow();
    if (await w.isMaximized()) await w.unmaximize();
    else await w.maximize();
  } catch {
    /* ignore */
  }
}

export async function closeWindow() {
  if (!isTauri) return;
  try {
    await (await appWindow()).close();
  } catch {
    /* ignore */
  }
}

export async function setAlwaysOnTop(value: boolean) {
  if (!isTauri) return;
  try {
    await (await appWindow()).setAlwaysOnTop(value);
  } catch {
    /* ignore */
  }
}

export async function setFullscreen(value: boolean) {
  if (!isTauri) return;
  try {
    await (await appWindow()).setFullscreen(value);
  } catch {
    /* ignore */
  }
}

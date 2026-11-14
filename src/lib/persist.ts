import { invoke } from "@tauri-apps/api/core";
import type { StateStorage } from "zustand/middleware";
import { isTauri } from "./tauri";

export const PERSIST_ERROR_EVENT = "lumen:persist-error";

const WRITE_DEBOUNCE_MS = 300;

const cache = new Map<string, string | null>();
const pending = new Map<string, string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const lastWritten = new Map<string, string>();
let reportedError = "";

function notify(message: string) {
  if (reportedError === message) return;
  reportedError = message;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PERSIST_ERROR_EVENT, { detail: message }));
  }
}

function isValidJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function readLegacy(name: string): string | null {
  try {
    return window.localStorage.getItem(name);
  } catch {
    return null;
  }
}

function writeLegacy(name: string, value: string) {
  try {
    window.localStorage.setItem(name, value);
  } catch {
    // Local storage is only a fallback when the disk store is unavailable.
    // Quota errors here must never break the app.
  }
}

async function loadFromDisk(name: string): Promise<string | null> {
  return invoke<string | null>("load_state", { name });
}

async function saveToDisk(name: string, value: string): Promise<void> {
  await invoke("save_state", { name, contents: value });
}

async function removeFromDisk(name: string): Promise<void> {
  await invoke("remove_state", { name });
}

async function flushName(name: string): Promise<void> {
  const value = pending.get(name);
  if (value === undefined) return;
  pending.delete(name);
  const timer = timers.get(name);
  if (timer) {
    clearTimeout(timer);
    timers.delete(name);
  }

  try {
    await saveToDisk(name, value);
    lastWritten.set(name, value);
  } catch (error) {
    // Keep the latest value for the next flush and mirror it to localStorage.
    // If the app is closed before the retry succeeds, the mirror is still a
    // valid recovery source on the next launch.
    pending.set(name, value);
    writeLegacy(name, value);
    notify(`Не удалось сохранить данные: ${String(error)}`);
  }
}

function schedule(name: string, value: string) {
  pending.set(name, value);
  const previous = timers.get(name);
  if (previous) clearTimeout(previous);
  timers.set(
    name,
    setTimeout(() => {
      void flushName(name);
    }, WRITE_DEBOUNCE_MS),
  );
}

async function getItem(name: string): Promise<string | null> {
  if (cache.has(name)) return cache.get(name) ?? null;

  if (!isTauri) {
    const value = readLegacy(name);
    if (value !== null && !isValidJson(value)) {
      notify("Сохранённые настройки повреждены и были сброшены");
      cache.set(name, null);
      return null;
    }
    cache.set(name, value);
    return value;
  }

  try {
    let value = await loadFromDisk(name);
    if (value === null) {
      const legacy = readLegacy(name);
      if (legacy !== null && isValidJson(legacy)) {
        value = legacy;
        try {
          await saveToDisk(name, legacy);
        } catch {
          // The disk retry happens on the next change / close.
        }
      }
    }
    if (value !== null && !isValidJson(value)) {
      notify("Сохранённые данные повреждены и были сброшены");
      value = null;
    }
    cache.set(name, value);
    if (value !== null) lastWritten.set(name, value);
    return value;
  } catch (error) {
    notify(`Не удалось загрузить сохранённые данные: ${String(error)}`);
    const legacy = readLegacy(name);
    const value = legacy !== null && isValidJson(legacy) ? legacy : null;
    cache.set(name, value);
    return value;
  }
}

function setItem(name: string, value: string): Promise<void> {
  if (!isValidJson(value)) {
    notify("Данные не сохранены: некорректный формат");
    return Promise.resolve();
  }

  cache.set(name, value);

  if (!isTauri) {
    writeLegacy(name, value);
    return Promise.resolve();
  }

  if (lastWritten.get(name) === value) return Promise.resolve();
  schedule(name, value);
  return Promise.resolve();
}

async function removeItem(name: string): Promise<void> {
  cache.delete(name);
  pending.delete(name);
  lastWritten.delete(name);
  const timer = timers.get(name);
  if (timer) clearTimeout(timer);
  timers.delete(name);
  try {
    window.localStorage.removeItem(name);
  } catch {
    // ignore
  }
  if (isTauri) {
    try {
      await removeFromDisk(name);
    } catch (error) {
      notify(`Не удалось удалить сохранённые данные: ${String(error)}`);
    }
  }
}

export const appStorage: StateStorage = {
  getItem,
  setItem,
  removeItem,
};

/** Flush every pending debounced write. Called when the window is closing. */
export async function flushPersistence(): Promise<void> {
  const names = Array.from(pending.keys());
  await Promise.all(names.map((name) => flushName(name)));
}

import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { Home } from "./pages/Home";
import { SearchPage } from "./pages/SearchPage";
import { LibraryPage } from "./pages/LibraryPage";
import { PlaylistPage } from "./pages/PlaylistPage";
import { AlbumPage } from "./pages/AlbumPage";
import { ArtistPage } from "./pages/ArtistPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { LocalPage } from "./pages/LocalPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SourcePage } from "./pages/SourcePage";
import { useSettings } from "./store/settings";
import { usePlayer } from "./store/player";
import { useUI } from "./store/ui";
import { useLibrary } from "./store/library";
import { useSources } from "./store/sources";
import { syncLanguage } from "./i18n";
import { applyCustomTheme, clearCustomTheme } from "./lib/theme";
import { attachPlayerBridge } from "./lib/playerBridge";
import { isPlayableTrack } from "./lib/catalog";
import { setCacheLimit } from "./lib/sources";
import { isTauri } from "./lib/tauri";
import { matchesHotkey } from "./lib/hotkeys";
import { flushPersistence, PERSIST_ERROR_EVENT } from "./lib/persist";
import { useIntegrations } from "./hooks/useIntegrations";
import { isTrayAvailable, quitApp } from "./lib/integrations";

function Shortcuts() {
  const navigate = useNavigate();
  const hotkeys = useSettings((s) => s.hotkeys);
  const hotkeysEnabled = useSettings((s) => s.hotkeysEnabled);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = Boolean(
        target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable),
      );
      const ui = useUI.getState();
      const player = usePlayer.getState();

      if (e.key === "Escape") {
        if (ui.contextMenu) ui.closeContextMenu();
        else if (ui.settingsOpen) ui.closeSettings();
        else if (ui.nowPlayingOpen) ui.toggleNowPlaying(false);
        else if (ui.queueOpen) ui.toggleQueue(false);
        return;
      }

      if (!hotkeysEnabled) return;
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      if (typing && !hasModifier) return;

      const action = hotkeys.find((hotkey) => matchesHotkey(e, hotkey.keys))?.action;
      if (!action) return;
      if (e.repeat && action !== "volumeUp" && action !== "volumeDown") return;
      if (ui.settingsOpen && action !== "settings" && action !== "search") return;

      e.preventDefault();
      switch (action) {
        case "playPause":
          player.toggle();
          break;
        case "next":
          player.next();
          break;
        case "prev":
          player.prev();
          break;
        case "volumeUp":
          player.setVolume(player.volume + 0.05);
          break;
        case "volumeDown":
          player.setVolume(player.volume - 0.05);
          break;
        case "search":
          ui.closeSettings();
          navigate("/search");
          window.setTimeout(() => document.getElementById("global-search")?.focus(), 30);
          break;
        case "like": {
          const track = player.queue[player.index];
          if (track) useLibrary.getState().toggleFavorite(track.id);
          break;
        }
        case "queue":
          ui.toggleQueue();
          break;
        case "settings":
          if (ui.settingsOpen) ui.closeSettings();
          else ui.openSettings();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, hotkeys, hotkeysEnabled]);
  return null;
}

export default function App() {
  useIntegrations();
  const language = useSettings((s) => s.language);
  const accent = useSettings((s) => s.accent);
  const fontScale = useSettings((s) => s.fontScale);
  const animations = useSettings((s) => s.animations);
  const glass = useSettings((s) => s.glass);
  const opacity = useSettings((s) => s.opacity);
  const themePreset = useSettings((s) => s.themePreset);
  const customColors = useSettings((s) => s.customColors);
  const fontFamily = useSettings((s) => s.fontFamily);
  const fontSize = useSettings((s) => s.fontSize);
  const radius = useSettings((s) => s.radius);
  const scaleMode = useSettings((s) => s.scaleMode);
  const fullscreenScale = useSettings((s) => s.fullscreenScale);
  const windowedScale = useSettings((s) => s.windowedScale);
  const bgImage = useSettings((s) => s.bgImage);
  const bgImageOpacity = useSettings((s) => s.bgImageOpacity);
  const bgTransparency = useSettings((s) => s.bgTransparency);
  const cacheLimit = useSettings((s) => s.cacheLimit);

  useEffect(() => {
    syncLanguage(language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = themePreset === "custom" ? "custom" : themePreset;
    if (themePreset === "custom") applyCustomTheme(customColors);
    else clearCustomTheme();
  }, [themePreset, customColors]);

  useEffect(() => {
    const family =
      fontFamily === "serif"
        ? 'Georgia, "Times New Roman", serif'
        : fontFamily === "mono"
          ? '"JetBrains Mono", "SFMono-Regular", monospace'
          : fontFamily === "system"
            ? '-apple-system, "Segoe UI", system-ui, sans-serif'
            : '"Inter Variable", "Inter", -apple-system, "Segoe UI", system-ui, sans-serif';
    document.documentElement.style.setProperty("--font-family", family);
  }, [fontFamily]);

  useEffect(() => {
    const modeScale = scaleMode === "fullscreen" ? fullscreenScale : windowedScale;
    const zoom = (fontSize / 16) * (fontScale / 100) * (modeScale / 100);
    document.documentElement.style.setProperty("--font-scale", String(zoom));
  }, [fontScale, fontSize, scaleMode, fullscreenScale, windowedScale]);

  useEffect(() => {
    const map = { none: 0, small: 8, medium: 16, large: 24 } as const;
    const value = map[radius];
    const style = document.documentElement.style;
    style.setProperty("--radius", `${value}px`);
    style.setProperty("--radius-sm", `${Math.round(value * 0.62)}px`);
    style.setProperty("--cover-radius", `${Math.round(value * 0.75)}px`);
  }, [radius]);

  useEffect(() => {
    document.documentElement.dataset.animations = animations ? "on" : "off";
  }, [animations]);

  useEffect(() => {
    const style = document.documentElement.style;
    style.setProperty("--glass-blur", `${Math.round((glass / 100) * 30)}px`);
    style.setProperty(
      "--bg-alpha",
      String(
        bgImage
          ? Math.max(0.04, 1 - (bgTransparency / 100) * 0.96)
          : 0.55 + (opacity / 100) * 0.45,
      ),
    );
    style.setProperty("--bg-image-opacity", String(bgImageOpacity / 100));
  }, [glass, opacity, bgImage, bgImageOpacity, bgTransparency]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const state = usePlayer.getState();
      state.tickClock(Date.now());
      const track = state.queue[state.index];
      if (!track || !isPlayableTrack(track)) state.tick(0.25);
    }, 250);
    const resumeId = window.setInterval(() => {
      usePlayer.getState().syncResumePosition();
    }, 5000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(resumeId);
    };
  }, []);

  useEffect(() => attachPlayerBridge(), []);

  useEffect(() => {
    const onPersistError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      if (message) useUI.getState().toast(message, "error");
    };
    const onBeforeUnload = () => {
      void flushPersistence();
    };
    window.addEventListener(PERSIST_ERROR_EVENT, onPersistError);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener(PERSIST_ERROR_EVENT, onPersistError);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    let disposed = false;
    let closing = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();
      const stop = await appWindow.onCloseRequested(async (event) => {
        if (closing) return;
        closing = true;
        event.preventDefault();
        usePlayer.getState().syncResumePosition();
        await flushPersistence();
        const settings = useSettings.getState();
        const trayReady = settings.tray && (await isTrayAvailable().catch(() => false));
        if (trayReady && settings.minimizeToTray) {
          await appWindow.hide();
          closing = false;
        } else {
          await quitApp().catch(() => appWindow.destroy());
        }
      });
      if (disposed) stop();
      else unlisten = stop;
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    void useSources.getState().refresh();
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    void setCacheLimit(cacheLimit)
      .then(() => useSources.getState().refresh())
      .catch(() => undefined);
  }, [cacheLimit]);

  return (
    <HashRouter>
      <Shortcuts />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/favorites" element={<FavoritesPage />} />
          <Route path="/library/local" element={<LocalPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/source/soundcloud" element={<SourcePage source="soundcloud" />} />
          <Route path="/source/youtube" element={<SourcePage source="youtube" />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
          <Route path="/album/:id" element={<AlbumPage />} />
          <Route path="/artist/:id" element={<ArtistPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

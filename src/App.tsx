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
import { useSettings } from "./store/settings";
import { usePlayer } from "./store/player";
import { useUI } from "./store/ui";
import { useLibrary } from "./store/library";
import { syncLanguage } from "./i18n";

function Shortcuts() {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      const ui = useUI.getState();
      const player = usePlayer.getState();
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === "Escape") {
        if (ui.contextMenu) ui.closeContextMenu();
        else if (ui.settingsOpen) ui.closeSettings();
        else if (ui.nowPlayingOpen) ui.toggleNowPlaying(false);
        else if (ui.queueOpen) ui.toggleQueue(false);
        return;
      }
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.closeSettings();
        navigate("/search");
        setTimeout(() => document.getElementById("global-search")?.focus(), 30);
        return;
      }
      if (mod && e.key === ",") {
        e.preventDefault();
        ui.openSettings();
        return;
      }
      if (typing) return;
      if (ui.settingsOpen) return;
      if (e.code === "Space") {
        e.preventDefault();
        player.toggle();
      } else if (e.key === "ArrowRight" && mod) {
        e.preventDefault();
        player.next();
      } else if (e.key === "ArrowLeft" && mod) {
        e.preventDefault();
        player.prev();
      } else if (e.key === "ArrowUp" && mod) {
        e.preventDefault();
        player.setVolume(player.volume + 0.05);
      } else if (e.key === "ArrowDown" && mod) {
        e.preventDefault();
        player.setVolume(player.volume - 0.05);
      } else if (e.key.toLowerCase() === "q") {
        ui.toggleQueue();
      } else if (e.key.toLowerCase() === "l") {
        const track = player.queue[player.index];
        if (track) {
          useLibrary.getState().toggleFavorite(track.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
  return null;
}

export default function App() {
  const language = useSettings((s) => s.language);
  const accent = useSettings((s) => s.accent);
  const fontScale = useSettings((s) => s.fontScale);
  const animations = useSettings((s) => s.animations);
  const glass = useSettings((s) => s.glass);
  const opacity = useSettings((s) => s.opacity);

  useEffect(() => {
    syncLanguage(language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", String(fontScale / 100));
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.dataset.animations = animations ? "on" : "off";
  }, [animations]);

  useEffect(() => {
    const style = document.documentElement.style;
    style.setProperty("--glass-blur", `${Math.round((glass / 100) * 30)}px`);
    style.setProperty("--bg-alpha", String(0.55 + (opacity / 100) * 0.45));
  }, [glass, opacity]);

  useEffect(() => {
    const id = window.setInterval(() => usePlayer.getState().tick(0.25), 250);
    return () => window.clearInterval(id);
  }, []);

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
          <Route path="/playlist/:id" element={<PlaylistPage />} />
          <Route path="/album/:id" element={<AlbumPage />} />
          <Route path="/artist/:id" element={<ArtistPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

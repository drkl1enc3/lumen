import { useLocation, useMatch } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Clock3,
  Home,
  LibraryBig,
  ListMusic,
  Minus,
  Search,
  Settings,
  Square,
  User,
  X,
} from "lucide-react";
import { closeWindow, minimizeWindow, toggleMaximizeWindow } from "../lib/tauri";
import { useLibrary } from "../store/library";
import { albumByIdMap, artistByIdMap } from "../lib/mock";
import { IconButton } from "../components/ui";
import { useUI } from "../store/ui";

function Logo() {
  return (
    <span className="logo" aria-hidden>
      <svg viewBox="0 0 32 32" width="22" height="22">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d9ccff" />
            <stop offset="1" stopColor="#8d6bff" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="none" stroke="url(#lg)" strokeWidth="2" />
        <circle cx="16" cy="16" r="5" fill="url(#lg)" />
        <g stroke="url(#lg)" strokeWidth="2" strokeLinecap="round">
          <path d="M16 1v4" />
          <path d="M16 27v4" />
          <path d="M1 16h4" />
          <path d="M27 16h4" />
        </g>
      </svg>
    </span>
  );
}

export function Titlebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const playlists = useLibrary((s) => s.playlists);
  const openSettings = useUI((s) => s.openSettings);
  const playlistMatch = useMatch("/playlist/:id");
  const albumMatch = useMatch("/album/:id");
  const artistMatch = useMatch("/artist/:id");

  let title = t("nav.home");
  let Icon = Home;

  if (location.pathname.startsWith("/search")) {
    title = t("nav.search");
    Icon = Search;
  } else if (location.pathname.startsWith("/library/favorites")) {
    title = t("common.favorites");
    Icon = ListMusic;
  } else if (location.pathname.startsWith("/library/local")) {
    title = t("common.local");
    Icon = ListMusic;
  } else if (location.pathname.startsWith("/library")) {
    title = t("nav.library");
    Icon = LibraryBig;
  } else if (location.pathname === "/history") {
    title = t("home.history");
    Icon = Clock3;
  } else if (playlistMatch) {
    title = playlists.find((p) => p.id === playlistMatch.params.id)?.name ?? t("common.playlists");
    Icon = ListMusic;
  } else if (albumMatch) {
    title = albumByIdMap.get(albumMatch.params.id ?? "")?.title ?? t("common.album");
    Icon = ListMusic;
  } else if (artistMatch) {
    title = artistByIdMap.get(artistMatch.params.id ?? "")?.name ?? t("common.artist");
    Icon = User;
  } else if (location.pathname.startsWith("/settings")) {
    title = t("nav.settings");
    Icon = Settings;
  }

  return (
    <header
      className="titlebar"
      data-tauri-drag-region
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        void toggleMaximizeWindow();
      }}
    >
      <div className="titlebar-left" data-tauri-drag-region>
        <Logo />
        <span className="brand">Lumen</span>
        <span className="version-chip">v0.1.0</span>
      </div>
      <div className="titlebar-center" data-tauri-drag-region>
        <Icon size={14} />
        <span>{title}</span>
      </div>
      <div className="titlebar-right">
        <IconButton
          label={t("nav.settings")}
          size="sm"
          onClick={() => openSettings()}
          className="titlebar-action"
        >
          <Settings size={15} />
        </IconButton>
        <span className="window-controls">
          <button aria-label="Minimize" onClick={() => void minimizeWindow()}>
            <Minus size={14} />
          </button>
          <button aria-label="Maximize" onClick={() => void toggleMaximizeWindow()}>
            <Square size={11} />
          </button>
          <button aria-label="Close" className="is-close" onClick={() => void closeWindow()}>
            <X size={15} />
          </button>
        </span>
      </div>
    </header>
  );
}

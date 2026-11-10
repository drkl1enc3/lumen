import { useLocation, useMatch, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Clock3,
  Cloud,
  Home,
  LibraryBig,
  ListMusic,
  LogIn,
  Minus,
  Pin,
  Search,
  Settings,
  Square,
  User,
  X,
  Youtube,
} from "lucide-react";
import { closeWindow, minimizeWindow, setAlwaysOnTop, toggleMaximizeWindow } from "../lib/tauri";
import { useLibrary } from "../store/library";
import { albumByIdMap, artistByIdMap } from "../lib/mock";
import { IconButton } from "../components/ui";
import { useUI } from "../store/ui";
import { useSettings } from "../store/settings";
import { cx } from "../lib/utils";

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
  const navigate = useNavigate();
  const playlists = useLibrary((s) => s.playlists);
  const openSettings = useUI((s) => s.openSettings);
  const closeSettings = useUI((s) => s.closeSettings);
  const setLogin = useUI((s) => s.setLogin);
  const panel = useSettings((s) => s.panelElements);
  const panelStyle = useSettings((s) => s.panelStyle);
  const autoHide = useSettings((s) => s.panelAutoHide);
  const [pinned, setPinned] = useState(false);
  const [shown, setShown] = useState(false);
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
  } else if (location.pathname.startsWith("/source/soundcloud")) {
    title = t("nav.soundcloud");
    Icon = Cloud;
  } else if (location.pathname.startsWith("/source/youtube")) {
    title = t("nav.youtube");
    Icon = Youtube;
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
    <>
      {autoHide && <div className="titlebar-hotzone" onMouseEnter={() => setShown(true)} />}
      <header
      className={cx(
        "titlebar",
        panelStyle === "compact" && "is-compact",
        autoHide && "is-autohide",
        autoHide && shown && "is-shown",
      )}
      data-tauri-drag-region
      onMouseLeave={() => autoHide && setShown(false)}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        void toggleMaximizeWindow();
      }}
    >
      <div className="titlebar-left" data-tauri-drag-region>
        {panel.logo && <Logo />}
        {panel.logo && <span className="brand">Lumen</span>}
        {panel.version && <span className="version-chip">v0.1.0</span>}
      </div>
      {panel.title && (
        <div className="titlebar-center" data-tauri-drag-region>
          <Icon size={14} />
          <span>{title}</span>
        </div>
      )}
      {!panel.title && <div />}
      <div className="titlebar-right">
        <IconButton
          label={t("nav.search")}
          size="sm"
          className="titlebar-action"
          onClick={() => {
            closeSettings();
            navigate("/search");
            window.setTimeout(() => document.getElementById("global-search")?.focus(), 30);
          }}
        >
          <Search size={15} />
        </IconButton>
        {panel.mail && (
          <IconButton
            label={t("nav.login")}
            size="sm"
            className="titlebar-action"
            onClick={() => setLogin(true)}
          >
            <LogIn size={15} />
          </IconButton>
        )}
        <IconButton
          label={t("nav.settings")}
          size="sm"
          onClick={() => openSettings()}
          className="titlebar-action"
        >
          <Settings size={15} />
        </IconButton>
        <span className="window-controls">
          {panel.pin && (
            <button
              aria-label="Pin"
              className={cx(pinned && "is-pinned")}
              onClick={() => {
                setPinned((v) => !v);
                void setAlwaysOnTop(!pinned);
              }}
            >
              <Pin size={13} />
            </button>
          )}
          {panel.collapse && (
            <button aria-label="Minimize" onClick={() => void minimizeWindow()}>
              <Minus size={14} />
            </button>
          )}
          {panel.expand && (
            <button aria-label="Maximize" onClick={() => void toggleMaximizeWindow()}>
              <Square size={11} />
            </button>
          )}
          {panel.close && (
            <button aria-label="Close" className="is-close" onClick={() => void closeWindow()}>
              <X size={15} />
            </button>
          )}
        </span>
      </div>
      </header>
    </>
  );
}

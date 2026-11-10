import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Titlebar } from "./Titlebar";
import { Rail } from "./Rail";
import { PlayerBar } from "./PlayerBar";
import { QueuePanel } from "./QueuePanel";
import { NowPlaying } from "./NowPlaying";
import { MiniPlayer } from "./MiniPlayer";
import { SettingsOverlay } from "./SettingsOverlay";
import { Toasts } from "./Toasts";
import { ContextMenu } from "../components/ContextMenu";
import { AddToPlaylistDialog, CreatePlaylistDialog, ListenTogetherDialog, LoginDialog } from "../components/Dialogs";

export function AppShell() {
  return (
    <div className="app">
      <ScrollReset />
      <Titlebar />
      <div className="app-body">
        <Rail />
        <main className="main">
          <Outlet />
        </main>
      </div>
      <PlayerBar />
      <QueuePanel />
      <NowPlaying />
      <MiniPlayer />
      <SettingsOverlay />
      <ContextMenu />
      <CreatePlaylistDialog />
      <AddToPlaylistDialog />
      <ListenTogetherDialog />
      <LoginDialog />
      <Toasts />
    </div>
  );
}

function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.querySelector(".main")?.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

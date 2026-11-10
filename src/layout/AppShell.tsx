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
import { Particles } from "../components/Particles";
import { useSettings } from "../store/settings";
import { cx } from "../lib/utils";

export function AppShell() {
  const bgImage = useSettings((s) => s.bgImage);
  const bgImageOpacity = useSettings((s) => s.bgImageOpacity);
  const tabPosition = useSettings((s) => s.tabPosition);
  const tabStyle = useSettings((s) => s.tabStyle);
  const tabAutoHide = useSettings((s) => s.tabAutoHide);
  const panelStyle = useSettings((s) => s.panelStyle);
  const bgTransparency = useSettings((s) => s.bgTransparency);

  return (
    <div
      className={cx("app", bgImage && "has-bg-image")}
      data-tab-position={tabPosition}
      data-tab-style={tabStyle}
      data-tab-autohide={tabAutoHide ? "on" : "off"}
      data-panel-style={panelStyle}
    >
      <ScrollReset />
      {bgImage && (
        <div
          className="app-bg-image"
          style={{ backgroundImage: `url(${bgImage})`, opacity: bgImageOpacity / 100 }}
        />
      )}
      {bgImage && (
        <div className="app-bg-dim" style={{ opacity: 1 - bgTransparency / 100 }} />
      )}
      <Particles />
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

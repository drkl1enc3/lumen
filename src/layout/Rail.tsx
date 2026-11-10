import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Cloud, Home, LibraryBig, LogIn, PanelLeftClose, PanelLeftOpen, PlayCircle, Search, Settings, Youtube } from "lucide-react";
import { useUI } from "../store/ui";
import { usePlayer } from "../store/player";
import { cx } from "../lib/utils";
import { PlayingBars } from "../components/ui";

export function Rail() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const openSettings = useUI((s) => s.openSettings);
  const setLogin = useUI((s) => s.setLogin);
  const toggleNow = useUI((s) => s.toggleNowPlaying);
  const nowOpen = useUI((s) => s.nowPlayingOpen);
  const playing = usePlayer((s) => s.playing);
  const hasTrack = usePlayer((s) => s.queue.length > 0);

  const item = (to: string, label: string, Icon: typeof Home, end?: boolean) => (
    <NavLink to={to} end={end} className={({ isActive }) => cx("rail-item", isActive && "is-active")} title={label}>
      <Icon size={19} />
      {!collapsed && <span className="rail-label">{label}</span>}
    </NavLink>
  );

  return (
    <nav className={cx("rail", collapsed && "is-collapsed")}>
      <div className="rail-top">
        {item("/", t("nav.home"), Home, true)}
        <button
          className={cx("rail-item", nowOpen && "is-active")}
          title={t("nav.nowPlaying")}
          onClick={() => toggleNow()}
        >
          {hasTrack && playing ? <PlayingBars /> : <PlayCircle size={19} />}
          {!collapsed && <span className="rail-label">{t("nav.nowPlaying")}</span>}
        </button>
        {item("/search", t("nav.search"), Search)}
        {item("/source/soundcloud", t("nav.soundcloud"), Cloud)}
        {item("/source/youtube", t("nav.youtube"), Youtube)}
        {item("/library", t("nav.library"), LibraryBig)}
      </div>
      <div className="rail-bottom">
        <button className="rail-item" title={t("nav.settings")} onClick={() => openSettings()}>
          <Settings size={19} />
          {!collapsed && <span className="rail-label">{t("nav.settings")}</span>}
        </button>
        <button className="rail-item" title={t("nav.login")} onClick={() => setLogin(true)}>
          <LogIn size={19} />
          {!collapsed && <span className="rail-label">{t("nav.login")}</span>}
        </button>
        <button
          className="rail-item rail-collapse"
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          {!collapsed && <span className="rail-label">{t("nav.collapse")}</span>}
        </button>
      </div>
    </nav>
  );
}

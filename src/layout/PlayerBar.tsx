import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Clock3,
  Download,
  Heart,
  ListMusic,
  Maximize2,
  Mic2,
  Minimize2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  ThumbsUp,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Cover, IconButton, Slider, SourceBadge } from "../components/ui";
import { cx, formatTime } from "../lib/utils";
import { usePlayer } from "../store/player";
import { useLibrary } from "../store/library";
import { useSettings } from "../store/settings";
import { useUI } from "../store/ui";

export function PlayerBar() {
  const { t } = useTranslation();
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const playing = usePlayer((s) => s.playing);
  const progress = usePlayer((s) => s.progress);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const speed = usePlayer((s) => s.speed);
  const sleepTimer = usePlayer((s) => s.sleepTimer);

  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const seek = usePlayer((s) => s.seek);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const setSpeed = usePlayer((s) => s.setSpeed);
  const setSleepTimer = usePlayer((s) => s.setSleepTimer);

  const favorites = useLibrary((s) => s.favorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const toast = useUI((s) => s.toast);
  const openContextMenu = useUI((s) => s.openContextMenu);
  const setAddToPlaylist = useUI((s) => s.setAddToPlaylist);
  const toggleQueue = useUI((s) => s.toggleQueue);
  const queueOpen = useUI((s) => s.queueOpen);
  const toggleNow = useUI((s) => s.toggleNowPlaying);
  const toggleMini = useUI((s) => s.toggleMini);
  const buttons = useSettings((s) => s.playerButtons);

  const speedLabel = String(Number(speed.toFixed(2))).replace(".", ",");
  const [popover, setPopover] = useState<"sleep" | "speed" | null>(null);

  const track = queue[index];
  if (!track) return null;

  const liked = favorites.includes(track.id);
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <footer className="playerbar">
      <div className="player-left">
        <Cover seed={track.cover} className="player-cover" />
        <div className="player-meta">
          <Link to={track.albumId ? `/album/${track.albumId}` : "#"} className="player-title" title={track.title}>
            {track.title}
          </Link>
          <Link
            to={track.artistId !== "local" ? `/artist/${track.artistId}` : "#"}
            className="player-artist"
          >
            {track.artist}
          </Link>
          <div className="player-badges">
            <SourceBadge source={track.source} />
          </div>
        </div>
        {buttons.like && (
          <IconButton
            label={liked ? t("common.unlike") : t("common.like")}
            size="sm"
            className={cx("player-like", liked && "is-liked")}
            onClick={() => {
              toggleFavorite(track.id);
              toast(liked ? t("toast.unliked") : t("toast.liked"));
            }}
          >
            <Heart size={17} fill={liked ? "currentColor" : "none"} />
          </IconButton>
        )}
        <IconButton
          label={t("common.more")}
          size="sm"
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            openContextMenu(r.left, r.top - 300, track.id);
          }}
        >
          <MoreHorizontal size={18} />
        </IconButton>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <IconButton label={t("common.shuffle")} active={shuffle} onClick={toggleShuffle}>
            <Shuffle size={16} />
          </IconButton>
          <IconButton label={t("common.prev")} onClick={() => prev()}>
            <SkipBack size={18} fill="currentColor" />
          </IconButton>
          <button className="play-button" aria-label={playing ? t("common.pause") : t("common.play")} onClick={toggle}>
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <IconButton label={t("common.next")} onClick={() => next()}>
            <SkipForward size={18} fill="currentColor" />
          </IconButton>
          <IconButton
            label={repeat === "one" ? t("common.repeatOne") : t("common.repeat")}
            active={repeat !== "off"}
            onClick={cycleRepeat}
          >
            {repeat === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </IconButton>
        </div>
        <div className="player-seek">
          <span className="player-time">{formatTime(progress)}</span>
          <Slider
            ariaLabel={t("common.play")}
            min={0}
            max={track.duration}
            step={1}
            value={Math.min(progress, track.duration)}
            onChange={seek}
          />
          <span className="player-time">{formatTime(track.duration)}</span>
        </div>
      </div>

      <div className="player-right">
        {buttons.source && <SourceBadge source={track.source} />}
        {buttons.equalizer && (
          <IconButton label={t("settings.equalizer")} size="sm" onClick={() => toast(t("settings.equalizer"))}>
            <SlidersHorizontal size={16} />
          </IconButton>
        )}
        {buttons.download && (
          <IconButton label={t("common.download")} size="sm" onClick={() => toast(t("toast.demoNotice"))}>
            <Download size={16} />
          </IconButton>
        )}
        {buttons.ratings && (
          <IconButton label={t("settings.ratingsBtn")} size="sm" onClick={() => toast(t("toast.demoNotice"))}>
            <ThumbsUp size={16} />
          </IconButton>
        )}
        {buttons.sleepTimer && (
          <div className="player-popover-wrap">
            <IconButton
              label={t("player.sleepTimer")}
              size="sm"
              active={sleepTimer !== null}
              onClick={() => setPopover((v) => (v === "sleep" ? null : "sleep"))}
            >
              <Clock3 size={16} />
            </IconButton>
            {popover === "sleep" && (
              <div className="popover" onMouseLeave={() => setPopover(null)}>
                <p className="popover-title">{t("player.sleepTimer")}</p>
                {[15, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    className={cx("popover-item", sleepTimer === m && "is-active")}
                    onClick={() => {
                      setSleepTimer(m);
                      setPopover(null);
                    }}
                  >
                    {m} {t("common.min")}
                  </button>
                ))}
                <button
                  className="popover-item"
                  onClick={() => {
                    setSleepTimer(null);
                    setPopover(null);
                  }}
                >
                  {t("player.timerOff")}
                </button>
              </div>
            )}
          </div>
        )}
        {buttons.speed && (
          <div className="player-popover-wrap">
            <button
              className={cx("speed-button", speed !== 1 && "is-active")}
              onClick={() => setPopover((v) => (v === "speed" ? null : "speed"))}
              title={t("player.speed")}
            >
              {speedLabel}×
            </button>
            {popover === "speed" && (
              <div className="popover" onMouseLeave={() => setPopover(null)}>
                <p className="popover-title">{t("player.speed")}</p>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    className={cx("popover-item", speed === s && "is-active")}
                    onClick={() => {
                      setSpeed(s);
                      setPopover(null);
                    }}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {buttons.playlist && (
          <IconButton label={t("common.addToPlaylist")} size="sm" onClick={() => setAddToPlaylist(track.id)}>
            <Plus size={17} />
          </IconButton>
        )}
        <IconButton label={t("common.lyrics")} size="sm" onClick={() => toggleNow(true)}>
          <Mic2 size={17} />
        </IconButton>
        <IconButton
          label={t("common.queue")}
          size="sm"
          active={queueOpen}
          onClick={() => toggleQueue()}
        >
          <ListMusic size={18} />
        </IconButton>
        <div className="volume-control">
          <IconButton label={t("common.volume")} size="sm" onClick={toggleMute}>
            <VolumeIcon size={17} />
          </IconButton>
          <Slider
            ariaLabel={t("common.volume")}
            className="volume-slider"
            value={muted ? 0 : volume}
            onChange={(v) => setVolume(v)}
          />
        </div>
        <IconButton label={t("nav.miniPlayer")} size="sm" onClick={() => toggleMini()}>
          <Minimize2 size={16} />
        </IconButton>
        <IconButton label={t("common.fullscreen")} size="sm" onClick={() => toggleNow(true)}>
          <Maximize2 size={16} />
        </IconButton>
      </div>
    </footer>
  );
}

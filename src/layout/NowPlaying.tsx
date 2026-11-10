import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Heart,
  Mic2,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { coverUrl } from "../lib/covers";
import { cx, formatTime } from "../lib/utils";
import { tracks as allTracks } from "../lib/mock";
import { usePlayer } from "../store/player";
import { useLibrary } from "../store/library";
import { useUI } from "../store/ui";
import { Cover, IconButton, Slider } from "../components/ui";
import { Visualizer } from "../components/Visualizer";
import { TrackRow } from "../components/TrackRow";
import { useSettings } from "../store/settings";

export function NowPlaying() {
  const { t } = useTranslation();
  const open = useUI((s) => s.nowPlayingOpen);
  const toggleNow = useUI((s) => s.toggleNowPlaying);
  const openContextMenu = useUI((s) => s.openContextMenu);
  const toast = useUI((s) => s.toast);

  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const playing = usePlayer((s) => s.playing);
  const progress = usePlayer((s) => s.progress);
  const volume = usePlayer((s) => s.volume);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const seek = usePlayer((s) => s.seek);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const playTrack = usePlayer((s) => s.playTrack);

  const favorites = useLibrary((s) => s.favorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const customCover = useSettings((s) => s.customCover);
  const coverInCover = useSettings((s) => s.coverInCover);
  const coverVisualizer = useSettings((s) => s.coverVisualizer);
  const visualizer = useSettings((s) => s.visualizer);

  const [tab, setTab] = useState<"cover" | "lyrics">("cover");
  useEffect(() => {
    if (open) setTab("cover");
  }, [open]);

  const track = queue[index];
  if (!open || !track) return null;

  const liked = favorites.includes(track.id);
  const related = allTracks.filter((tr) => tr.artistId === track.artistId && tr.id !== track.id).slice(0, 5);
  const context = queue.length ? queue : [track];
  const nextTrack = queue[index + 1];
  const coverImage = customCover
    ? { backgroundImage: `url(${customCover})`, backgroundSize: "cover", backgroundPosition: "center" }
    : undefined;

  return (
    <div className="now-playing">
      <div className="np-bg" style={customCover ? coverImage : { backgroundImage: coverUrl(track.cover) }} />
      <Visualizer kind={visualizer} className="np-visualizer" />
      <div className="np-scrim" />

      <header className="np-header">
        <IconButton label={t("common.close")} size="md" onClick={() => toggleNow(false)}>
          <ChevronDown size={20} />
        </IconButton>
        <div className="np-header-title">
          <span>{t("now.title")}</span>
          <span className="np-header-sub">{track.album ?? track.artist}</span>
        </div>
        <IconButton
          label={t("common.more")}
          size="sm"
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            openContextMenu(r.left - 200, r.bottom + 6, track.id);
          }}
        >
          <MoreHorizontal size={18} />
        </IconButton>
      </header>

      <div className="np-body">
        <section className="np-main">
          <div className="np-art-wrap">
            <Cover seed={track.cover} className="np-art" style={coverImage}>
              {coverInCover && nextTrack && (
                <span className="np-art-inset">
                  <Cover seed={nextTrack.cover} className="np-art-mini" />
                </span>
              )}
              {coverVisualizer && (
                <span className="np-art-viz">
                  <Visualizer kind={visualizer} />
                </span>
              )}
            </Cover>
          </div>
          <div className="np-info">
            <div className="np-text">
              <h1>{track.title}</h1>
              <div className="np-links">
                <Link to={track.artistId !== "local" ? `/artist/${track.artistId}` : "#"}>{track.artist}</Link>
                {track.albumId && (
                  <>
                    <span>·</span>
                    <Link to={`/album/${track.albumId}`}>{track.album}</Link>
                  </>
                )}
              </div>
            </div>
            <IconButton
              label={liked ? t("common.unlike") : t("common.like")}
              className={cx("np-like", liked && "is-liked")}
              onClick={() => {
                toggleFavorite(track.id);
                toast(liked ? t("toast.unliked") : t("toast.liked"));
              }}
            >
              <Heart size={20} fill={liked ? "currentColor" : "none"} />
            </IconButton>
          </div>

          <div className="np-progress">
            <Slider min={0} max={track.duration} step={1} value={Math.min(progress, track.duration)} onChange={seek} />
            <div className="np-times">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(track.duration)}</span>
            </div>
          </div>

          <div className="np-controls">
            <IconButton size="lg" active={shuffle} label={t("common.shuffle")} onClick={toggleShuffle}>
              <Shuffle size={20} />
            </IconButton>
            <IconButton size="lg" label={t("common.prev")} onClick={() => prev()}>
              <SkipBack size={26} fill="currentColor" />
            </IconButton>
            <button className="np-play" aria-label={playing ? t("common.pause") : t("common.play")} onClick={toggle}>
              {playing ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" />}
            </button>
            <IconButton size="lg" label={t("common.next")} onClick={() => next()}>
              <SkipForward size={26} fill="currentColor" />
            </IconButton>
            <IconButton
              size="lg"
              active={repeat !== "off"}
              label={repeat === "one" ? t("common.repeatOne") : t("common.repeat")}
              onClick={cycleRepeat}
            >
              {repeat === "one" ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </IconButton>
          </div>

          <div className="np-volume">
            <Volume2 size={16} />
            <Slider value={volume} min={0} max={1} step={0.01} onChange={setVolume} />
          </div>
        </section>

        <section className="np-side">
          <div className="np-tabs">
            <button className={cx("np-tab", tab === "cover" && "is-active")} onClick={() => setTab("cover")}>
              <Mic2 size={15} />
              {t("now.related")}
            </button>
            <button className={cx("np-tab", tab === "lyrics" && "is-active")} onClick={() => setTab("lyrics")}>
              {t("common.lyrics")}
            </button>
          </div>

          {tab === "lyrics" ? (
            <div className="np-lyrics">
              <p className="np-lyrics-placeholder">{t("player.lyricsPlaceholder")}</p>
              <div className="lyrics-lines" aria-hidden>
                <span style={{ width: "72%" }} />
                <span style={{ width: "88%" }} />
                <span style={{ width: "54%" }} />
                <span style={{ width: "80%" }} />
                <span style={{ width: "62%" }} />
                <span style={{ width: "90%" }} />
                <span style={{ width: "44%" }} />
                <span style={{ width: "76%" }} />
                <span style={{ width: "68%" }} />
              </div>
            </div>
          ) : (
            <div className="np-related">
              {related.length === 0 ? (
                <p className="np-related-empty">{t("common.empty")}</p>
              ) : (
                related.map((tr, i) => (
                  <TrackRow
                    key={tr.id}
                    track={tr}
                    index={i}
                    context={[tr, ...related.filter((x) => x.id !== tr.id)]}
                    showAlbum={false}
                    showCover
                  />
                ))
              )}
              <button className="np-related-play" onClick={() => playTrack(related[0], related)}>
                {t("common.playAll")}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Heart,
  Loader2,
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
import { useCoverAccent } from "../lib/coverTheme";
import { cx, formatTime } from "../lib/utils";
import { artistByIdMap } from "../lib/mock";
import { usePlayer } from "../store/player";
import { useLibrary } from "../store/library";
import { useUI } from "../store/ui";
import { Cover, IconButton, Slider } from "../components/ui";
import { Visualizer } from "../components/Visualizer";
import { TrackRow } from "../components/TrackRow";
import { useSettings } from "../store/settings";
import { useLocal } from "../store/local";
import { useCatalog } from "../store/catalog";
import { fetchLyrics, type Lyrics } from "../lib/integrations";
import { isTauri } from "../lib/tauri";

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
  const coverAccent = useCoverAccent();
  const lyricsEnabled = useSettings((s) => s.lyricsEnabled);
  const localTracks = useLocal((s) => s.tracks);
  const externalTracks = useCatalog((s) => s.external);

  const [tab, setTab] = useState<"cover" | "lyrics">("cover");
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const lyricsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (open) setTab("cover");
  }, [open]);

  const track = queue[index];
  const trackId = track?.id ?? "";

  useEffect(() => {
    if (!open || tab !== "lyrics" || !track || !lyricsEnabled) {
      setLyrics(null);
      setLyricsError(null);
      setLyricsLoading(false);
      return;
    }
    let cancelled = false;
    setLyrics(null);
    setLyricsError(null);
    if (!isTauri) {
      setLyricsError("Тексты доступны только в приложении Lumen");
      return;
    }
    setLyricsLoading(true);
    void fetchLyrics(track)
      .then((result) => {
        if (cancelled) return;
        if (!result) setLyricsError("Текст не найден");
        else setLyrics(result);
      })
      .catch((error) => {
        if (!cancelled) setLyricsError(String(error));
      })
      .finally(() => {
        if (!cancelled) setLyricsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tab, trackId, lyricsEnabled]);

  const lyricLines = useMemo(() => {
    if (!lyrics?.synced) return [];
    const lines: { time: number; text: string }[] = [];
    for (const raw of lyrics.synced.split("\n")) {
      const match = raw.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
      if (!match) continue;
      const time = Number(match[1]) * 60 + Number(match[2]);
      const text = match[3].trim();
      if (text) lines.push({ time, text });
    }
    return lines;
  }, [lyrics?.synced]);

  const activeLyric = useMemo(() => {
    let index = -1;
    for (let i = 0; i < lyricLines.length; i += 1) {
      if (lyricLines[i].time <= progress) index = i;
      else break;
    }
    return index;
  }, [lyricLines, progress]);

  useEffect(() => {
    const container = lyricsRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>(".lyrics-line.is-active");
    active?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeLyric]);
  if (!open || !track) return null;

  const liked = favorites.includes(track.id);
  const allKnown = [...localTracks, ...Object.values(externalTracks)];
  const related = allKnown
    .filter((tr) => tr.id !== track.id && (tr.artist === track.artist || tr.album === track.album))
    .slice(0, 6);
  const context = queue.length ? queue : [track];
  const nextTrack = queue[index + 1];
  const coverImage = customCover
    ? { backgroundImage: `url(${customCover})`, backgroundSize: "cover", backgroundPosition: "center" }
    : undefined;

  return (
    <div className="now-playing">
      <div className="np-bg" style={customCover ? coverImage : { backgroundImage: coverUrl(track.cover, coverAccent) }} />
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
            <Cover seed={track.cover} src={track.artwork} className="np-art" style={coverImage}>
              {coverInCover && nextTrack && (
                <span className="np-art-inset">
                  <Cover seed={nextTrack.cover} src={nextTrack.artwork} className="np-art-mini" />
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
                {artistByIdMap.has(track.artistId) ? (
                  <Link to={`/artist/${track.artistId}`}>{track.artist}</Link>
                ) : (
                  <span>{track.artist}</span>
                )}
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
            <div className="np-lyrics" ref={lyricsRef}>
              {!lyricsEnabled ? (
                <p className="np-lyrics-placeholder">{t("player.lyricsDisabled")}</p>
              ) : lyricsLoading ? (
                <p className="np-lyrics-placeholder">
                  <Loader2 size={16} className="spin" /> {t("player.lyricsLoading")}
                </p>
              ) : lyricLines.length ? (
                <div className="lyrics-lines is-synced">
                  {lyricLines.map((line, index) => (
                    <p
                      key={`${line.time}-${index}`}
                      className={cx("lyrics-line", index === activeLyric && "is-active")}
                    >
                      {line.text}
                    </p>
                  ))}
                </div>
              ) : lyrics?.plain ? (
                <div className="lyrics-lines is-plain">
                  {lyrics.plain.split("\n").map((line, index) => (
                    <p key={index} className="lyrics-line">{line || " "}</p>
                  ))}
                </div>
              ) : (
                <p className="np-lyrics-placeholder">
                  {lyricsError ?? t("player.lyricsPlaceholder")}
                </p>
              )}
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
              {related.length > 0 && (
                <button className="np-related-play" onClick={() => playTrack(related[0], related)}>
                  {t("common.playAll")}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

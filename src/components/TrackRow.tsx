import { Heart, MoreHorizontal, Play } from "lucide-react";
import type { Track } from "../lib/types";
import { cx, formatTime } from "../lib/utils";
import { useLibrary } from "../store/library";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { useTranslation } from "react-i18next";
import { Cover, PlayingBars, SourceBadge } from "./ui";

export function TrackRow({
  track,
  index,
  context,
  onRemove,
  showAlbum = true,
  showCover = true,
  showSource = false,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  track: Track;
  index?: number;
  context?: Track[];
  onRemove?: () => void;
  showAlbum?: boolean;
  showCover?: boolean;
  showSource?: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}) {
  const { t } = useTranslation();
  const queue = usePlayer((s) => s.queue);
  const currentIndex = usePlayer((s) => s.index);
  const playing = usePlayer((s) => s.playing);
  const playTrack = usePlayer((s) => s.playTrack);
  const favorites = useLibrary((s) => s.favorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const openContextMenu = useUI((s) => s.openContextMenu);
  const toast = useUI((s) => s.toast);

  const isCurrent = queue[currentIndex]?.id === track.id;
  const liked = favorites.includes(track.id);

  return (
    <div
      className={cx("track-row", isCurrent && "is-current", draggable && "is-draggable")}
      onClick={() => playTrack(track, context)}
      onContextMenu={(e) => {
        e.preventDefault();
        openContextMenu(e.clientX, e.clientY, track.id);
      }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="track-index">
        <span className="track-number">
          {isCurrent ? <PlayingBars paused={!playing} /> : (index ?? 0) + 1}
        </span>
        <button
          className="track-play"
          aria-label={t("common.play")}
          onClick={(e) => {
            e.stopPropagation();
            playTrack(track, context);
          }}
        >
          <Play size={14} fill="currentColor" />
        </button>
      </div>
      {showCover && <Cover seed={track.cover} className="track-cover" />}
      <div className="track-main">
        <div className="track-title-line">
          <span className="track-title">{track.title}</span>
          {showSource && <SourceBadge source={track.source} />}
        </div>
        <button
          className="track-artist"
          onClick={(e) => {
            e.stopPropagation();
            if (track.artistId !== "local") window.location.hash = `#/artist/${track.artistId}`;
          }}
        >
          {track.artist}
        </button>
      </div>
      {showAlbum && <div className="track-album">{track.album ?? "—"}</div>}
      <button
        className={cx("track-like", liked && "is-liked")}
        aria-label={liked ? t("common.unlike") : t("common.like")}
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(track.id);
          toast(liked ? t("toast.unliked") : t("toast.liked"));
        }}
      >
        <Heart size={16} fill={liked ? "currentColor" : "none"} />
      </button>
      <span className="track-duration">{formatTime(track.duration)}</span>
      <button
        className="track-more"
        aria-label={t("common.more")}
        onClick={(e) => {
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          openContextMenu(rect.left - 180, rect.bottom + 4, track.id);
        }}
      >
        <MoreHorizontal size={18} />
      </button>
      {onRemove && (
        <button
          className="track-remove"
          aria-label={t("common.removeFromQueue")}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

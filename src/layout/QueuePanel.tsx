import { useTranslation } from "react-i18next";
import { ListMusic, Trash2, X } from "lucide-react";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { TrackRow } from "../components/TrackRow";
import { Cover, EmptyState, IconButton, PlayingBars } from "../components/ui";
import { formatTime } from "../lib/utils";
import { Link } from "react-router-dom";

export function QueuePanel() {
  const { t } = useTranslation();
  const open = useUI((s) => s.queueOpen);
  const toggle = useUI((s) => s.toggleQueue);
  const toast = useUI((s) => s.toast);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const playing = usePlayer((s) => s.playing);
  const remove = usePlayer((s) => s.removeFromQueue);
  const clear = usePlayer((s) => s.clearQueue);
  const current = queue[index];
  const upcoming = queue.slice(index + 1);

  if (!open) return null;

  return (
    <aside className="queue-panel">
      <header className="queue-head">
        <div className="queue-title">
          <ListMusic size={17} />
          <span>{t("queue.title")}</span>
          <span className="queue-count">{queue.length}</span>
        </div>
        <div className="queue-head-actions">
          <button
            className="link-button"
            onClick={() => {
              clear();
              toast(t("toast.queueCleared"));
            }}
            disabled={!queue.length}
          >
            <Trash2 size={14} />
            {t("queue.clear")}
          </button>
          <IconButton label={t("common.close")} size="sm" onClick={() => toggle(false)}>
            <X size={16} />
          </IconButton>
        </div>
      </header>

      {!queue.length ? (
        <EmptyState
          icon={<ListMusic size={26} />}
          title={t("queue.empty")}
          hint={t("queue.emptyHint")}
        />
      ) : (
        <div className="queue-body">
          {current && (
            <section className="queue-section">
              <p className="queue-section-title">{t("queue.now")}</p>
              <div className="queue-current">
                <Cover seed={current.cover} className="queue-cover" />
                <div className="queue-current-meta">
                  <Link to={current.albumId ? `/album/${current.albumId}` : "#"} className="queue-current-title">
                    {current.title}
                  </Link>
                  <span className="queue-current-artist">{current.artist}</span>
                </div>
                <div className="queue-current-right">
                  <PlayingBars paused={!playing} />
                  <span className="queue-duration">{formatTime(current.duration)}</span>
                </div>
              </div>
            </section>
          )}

          <section className="queue-section">
            <p className="queue-section-title">
              {t("queue.next")} {upcoming.length > 0 && <span>{upcoming.length}</span>}
            </p>
            {upcoming.length === 0 ? (
              <p className="queue-bottom-hint">{t("player.queueEmpty")}</p>
            ) : (
              <div className="queue-list">
                {upcoming.map((track, i) => (
                  <TrackRow
                    key={`${track.id}-${i}`}
                    track={track}
                    index={index + 1 + i}
                    context={queue}
                    showAlbum={false}
                    showCover
                    onRemove={() => remove(index + 1 + i)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}

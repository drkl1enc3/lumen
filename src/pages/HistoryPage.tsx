import { useTranslation } from "react-i18next";
import { Clock3, Play, Trash2 } from "lucide-react";
import { resolveTracks } from "../lib/catalog";
import { useLibrary } from "../store/library";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { Cover, EmptyState } from "../components/ui";
import { TrackRow } from "../components/TrackRow";
import { formatTotalDuration, pluralTracks } from "../lib/utils";

export function HistoryPage() {
  const { t, i18n } = useTranslation();
  const recent = useLibrary((s) => s.recent);
  const clear = useLibrary((s) => s.clearHistory);
  const play = usePlayer((s) => s.play);
  const toast = useUI((s) => s.toast);
  const tracks = resolveTracks(recent);

  return (
    <div className="page collection-page">
      <header className="collection-hero">
        <Cover seed={9} className="collection-cover">
          <Clock3 size={42} className="collection-cover-icon" />
        </Cover>
        <div className="collection-info">
          <p className="eyebrow">{i18n.language === "ru" ? "Вы слушали" : "You listened to"}</p>
          <h1>{t("home.history")}</h1>
          <p className="collection-meta">
            {pluralTracks(tracks.length, i18n.language)} · {formatTotalDuration(tracks, i18n.language)}
          </p>
          <div className="collection-buttons">
            <button className="btn btn-primary" disabled={!tracks.length} onClick={() => play(tracks, 0)}>
              <Play size={16} fill="currentColor" />
              {t("common.playAll")}
            </button>
            <button
              className="btn btn-ghost"
              disabled={!tracks.length}
              onClick={() => {
                clear();
                toast(t("toast.historyCleared"), "success");
              }}
            >
              <Trash2 size={15} />
              {i18n.language === "ru" ? "Очистить историю" : i18n.language === "uk" ? "Очистити історію" : "Clear history"}
            </button>
          </div>
        </div>
      </header>

      {tracks.length ? (
        <div className="track-list">
          {tracks.map((tr, i) => (
            <TrackRow key={tr.id} track={tr} index={i} context={tracks} showAlbum />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Clock3 size={26} />}
          title={t("common.empty")}
          hint={t("home.historyHint")}
        />
      )}
    </div>
  );
}

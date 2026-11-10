import { useTranslation } from "react-i18next";
import { Heart, Play, Shuffle } from "lucide-react";
import { tracksByIds } from "../lib/mock";
import { useLibrary } from "../store/library";
import { usePlayer } from "../store/player";
import { Cover, EmptyState } from "../components/ui";
import { TrackRow } from "../components/TrackRow";
import { formatTotalDuration, pluralTracks } from "../lib/utils";

export function FavoritesPage() {
  const { t, i18n } = useTranslation();
  const favorites = useLibrary((s) => s.favorites);
  const play = usePlayer((s) => s.play);
  const tracks = tracksByIds(favorites);

  return (
    <div className="page collection-page">
      <header className="collection-hero">
        <Cover seed={4} className="collection-cover">
          <Heart size={44} fill="currentColor" className="collection-cover-icon" />
        </Cover>
        <div className="collection-info">
          <p className="eyebrow">{i18n.language === "ru" ? "Коллекция" : i18n.language === "uk" ? "Колекція" : "Collection"}</p>
          <h1>{t("common.favorites")}</h1>
          <p className="collection-meta">
            {pluralTracks(tracks.length, i18n.language)} · {formatTotalDuration(tracks)}
          </p>
          <div className="collection-buttons">
            <button className="btn btn-primary" disabled={!tracks.length} onClick={() => play(tracks, 0)}>
              <Play size={16} fill="currentColor" />
              {t("common.playAll")}
            </button>
            <button
              className="btn btn-ghost"
              disabled={!tracks.length}
              onClick={() => play([...tracks].sort(() => Math.random() - 0.5), 0, { shuffle: true })}
            >
              <Shuffle size={16} />
              {t("playlist.shuffle")}
            </button>
          </div>
        </div>
      </header>

      {tracks.length ? (
        <div className="track-list">
          {tracks.map((tr, i) => (
            <TrackRow key={tr.id} track={tr} index={i} context={tracks} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Heart size={26} />} title={t("library.emptyFavorites")} hint={t("library.emptyFavoritesHint")} />
      )}
    </div>
  );
}

import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Play, Shuffle } from "lucide-react";
import { albumByIdMap, tracksByIds } from "../lib/mock";
import { usePlayer } from "../store/player";
import { Cover, EmptyState } from "../components/ui";
import { TrackRow } from "../components/TrackRow";
import { formatTotalDuration, pluralTracks } from "../lib/utils";

export function AlbumPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const play = usePlayer((s) => s.play);
  const album = albumByIdMap.get(id ?? "");

  if (!album) {
    return (
      <div className="page">
        <EmptyState
          icon={<Play size={26} />}
          title={t("common.empty")}
          action={
            <Link className="btn btn-primary" to="/library">
              {t("nav.library")}
            </Link>
          }
        />
      </div>
    );
  }

  const tracks = tracksByIds(album.trackIds);

  return (
    <div className="page collection-page">
      <header className="collection-hero">
        <Cover seed={album.cover} className="collection-cover">
          <span className="collection-cover-glow" />
        </Cover>
        <div className="collection-info">
          <p className="eyebrow">{t("common.album")} · {album.year}</p>
          <h1>{album.title}</h1>
          <p className="collection-meta">
            <Link to={`/artist/${album.artistId}`} className="collection-artist">
              {album.artist}
            </Link>
            {" · "}
            {pluralTracks(tracks.length, i18n.language)} · {formatTotalDuration(tracks)}
          </p>
          <div className="collection-buttons">
            <button className="btn btn-primary" onClick={() => play(tracks, 0)}>
              <Play size={16} fill="currentColor" />
              {t("album.playAll")}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => play([...tracks].sort(() => Math.random() - 0.5), 0, { shuffle: true })}
            >
              <Shuffle size={16} />
              {t("playlist.shuffle")}
            </button>
          </div>
        </div>
      </header>

      <div className="track-list-head">
        <span className="tl-index">#</span>
        <span className="tl-title">{t("common.track")}</span>
        <span className="tl-album">{t("common.album")}</span>
        <span className="tl-duration">{t("common.duration")}</span>
      </div>

      <div className="track-list">
        {tracks.map((tr, i) => (
          <TrackRow key={tr.id} track={tr} index={i} context={tracks} showAlbum={false} />
        ))}
      </div>

      <div className="library-footer">
        <span>{album.year} · Lumen Records</span>
        <span>{formatTotalDuration(tracks)}</span>
      </div>
    </div>
  );
}

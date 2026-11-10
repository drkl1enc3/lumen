import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Play, Shuffle, UserCheck, UserPlus } from "lucide-react";
import { albums, artistByIdMap, tracks as allTracks } from "../lib/mock";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { Cover, EmptyState, SectionHead } from "../components/ui";
import { TrackRow } from "../components/TrackRow";
import { AlbumCard } from "../components/Cards";
import { formatCount } from "../lib/utils";

export function ArtistPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const play = usePlayer((s) => s.play);
  const toast = useUI((s) => s.toast);
  const [following, setFollowing] = useState(false);
  const artist = artistByIdMap.get(id ?? "");

  if (!artist) {
    return (
      <div className="page">
        <EmptyState icon={<Play size={26} />} title={t("common.empty")} />
      </div>
    );
  }

  const artistTracks = allTracks
    .filter((tr) => tr.artistId === artist.id)
    .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));
  const popular = artistTracks.slice(0, 5);
  const artistAlbums = albums.filter((a) => a.artistId === artist.id);

  return (
    <div className="page artist-page">
      <header className="artist-hero">
        <div className="artist-hero-bg" style={{ backgroundImage: `var(--artist-cover)` }} />
        <Cover seed={artist.avatar} className="artist-avatar" />
        <div className="artist-info">
          <p className="eyebrow">{artist.genre}</p>
          <h1>{artist.name}</h1>
          <p className="collection-meta">
            {formatCount(artist.followers)} {t("artist.listeners")}
          </p>
          <div className="collection-buttons">
            <button className="btn btn-primary" onClick={() => play(artistTracks, 0)}>
              <Play size={16} fill="currentColor" />
              {t("artist.playAll")}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => play([...artistTracks].sort(() => Math.random() - 0.5), 0, { shuffle: true })}
            >
              <Shuffle size={16} />
              {t("playlist.shuffle")}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setFollowing((v) => !v);
                toast(following ? t("artist.follow") : t("artist.following"), "success");
              }}
            >
              {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
              {following ? t("artist.following") : t("artist.follow")}
            </button>
          </div>
        </div>
      </header>

      <SectionHead>{t("artist.popular")}</SectionHead>
      <div className="track-list">
        {popular.map((tr, i) => (
          <TrackRow key={tr.id} track={tr} index={i} context={artistTracks} />
        ))}
      </div>

      <SectionHead>{t("artist.albums")}</SectionHead>
      <div className="media-grid">
        {artistAlbums.map((a) => (
          <AlbumCard key={a.id} album={a} />
        ))}
      </div>

      <SectionHead>{t("artist.about")}</SectionHead>
      <div className="artist-about">
        <p>{artist.bio}</p>
        <div className="artist-facts">
          <div>
            <span>{t("common.followers")}</span>
            <strong>{formatCount(artist.followers)}</strong>
          </div>
          <div>
            <span>{t("common.album")}</span>
            <strong>{artistAlbums.length}</strong>
          </div>
          <div>
            <span>{t("common.tracks")}</span>
            <strong>{artistTracks.length}</strong>
          </div>
          <div>
            <span>{t("common.artist")}</span>
            <strong>{artist.genre}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

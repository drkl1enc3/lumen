import { Link } from "react-router-dom";
import { ListMusic, Play } from "lucide-react";
import type { Album, Artist, Playlist, Track } from "../lib/types";
import { usePlayer } from "../store/player";
import { useSettings } from "../store/settings";
import { tracks as allTracks } from "../lib/mock";
import { resolveTracks } from "../lib/catalog";
import { formatCount, pluralTracks } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { Cover } from "./ui";

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const { t, i18n } = useTranslation();
  const play = usePlayer((s) => s.play);
  const playlistCover = useSettings((s) => s.playlistCover);
  const tracks = resolveTracks(playlist.trackIds);
  const image = playlist.coverImage ?? playlistCover ?? undefined;
  return (
    <Link to={`/playlist/${playlist.id}`} className="media-card">
      <Cover seed={playlist.cover} src={image} className="media-card-cover">
        {!image && (
          <span className="media-card-cover-icon">
            <ListMusic size={32} />
          </span>
        )}
        <button
          className="card-play"
          aria-label={t("common.play")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (tracks.length) play(tracks, 0);
          }}
        >
          <Play size={18} fill="currentColor" />
        </button>
      </Cover>
      <p className="media-card-title">{playlist.name}</p>
      <p className="media-card-sub">{pluralTracks(playlist.trackIds.length, i18n.language)}</p>
    </Link>
  );
}

export function AlbumCard({ album }: { album: Album }) {
  const { t } = useTranslation();
  const play = usePlayer((s) => s.play);
  const tracks = resolveTracks(album.trackIds);
  return (
    <Link to={`/album/${album.id}`} className="media-card">
      <Cover seed={album.cover} className="media-card-cover">
        <button
          className="card-play"
          aria-label={t("common.play")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (tracks.length) play(tracks, 0);
          }}
        >
          <Play size={18} fill="currentColor" />
        </button>
      </Cover>
      <p className="media-card-title">{album.title}</p>
      <p className="media-card-sub">
        {album.artist} · {album.year}
      </p>
    </Link>
  );
}

export function ArtistCard({ artist }: { artist: Artist }) {
  const { t } = useTranslation();
  const play = usePlayer((s) => s.play);
  const artistTracks = allTracks.filter((tr) => tr.artistId === artist.id);
  return (
    <Link to={`/artist/${artist.id}`} className="media-card artist-card">
      <Cover seed={artist.avatar} className="media-card-cover is-round">
        <button
          className="card-play"
          aria-label={t("common.play")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (artistTracks.length) play(artistTracks, 0);
          }}
        >
          <Play size={18} fill="currentColor" />
        </button>
      </Cover>
      <p className="media-card-title">{artist.name}</p>
      <p className="media-card-sub">
        {formatCount(artist.followers)} {t("common.followers")}
      </p>
    </Link>
  );
}

export function TrackCard({ track }: { track: Track }) {
  const { t, i18n } = useTranslation();
  const play = usePlayer((s) => s.play);
  return (
    <button className="track-card" onClick={() => play([track], 0)}>
      <Cover seed={track.cover} src={track.artwork} className="track-card-cover">
        <span className="card-play">
          <Play size={18} fill="currentColor" />
        </span>
      </Cover>
      <span className="track-card-title">{track.title}</span>
      <span className="track-card-sub">{track.artist}</span>
      <span className="track-card-meta">
        {formatCount(track.plays ?? 0)} ·{" "}
        {i18n.language === "ru" ? "прослушиваний" : i18n.language === "uk" ? "прослуховувань" : "plays"}
      </span>
      <span className="sr-only">{t("common.play")}</span>
    </button>
  );
}

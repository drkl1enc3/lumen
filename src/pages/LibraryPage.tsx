import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Album, Disc3, Heart, ListMusic, Music2, Plus, Users } from "lucide-react";
import { albums, artists, localTracksList, tracks } from "../lib/mock";
import { resolveTracks } from "../lib/catalog";
import { useLibrary } from "../store/library";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { cx, formatTotalDuration, pluralTracks } from "../lib/utils";
import { EmptyState, SectionHead } from "../components/ui";
import { AlbumCard, ArtistCard, PlaylistCard } from "../components/Cards";
import { TrackRow } from "../components/TrackRow";

type Tab = "playlists" | "favorites" | "local" | "artists" | "albums";

export function LibraryPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>("playlists");
  const playlists = useLibrary((s) => s.playlists);
  const favorites = useLibrary((s) => s.favorites);
  const setCreate = useUI((s) => s.setCreatePlaylist);
  const play = usePlayer((s) => s.play);
  const favoriteTracks = resolveTracks(favorites);

  const tabs: { id: Tab; label: string; icon: typeof ListMusic }[] = [
    { id: "playlists", label: t("common.playlists"), icon: ListMusic },
    { id: "favorites", label: t("common.favorites"), icon: Heart },
    { id: "local", label: t("common.local"), icon: Music2 },
    { id: "artists", label: t("common.artists"), icon: Users },
    { id: "albums", label: t("common.albums"), icon: Disc3 },
  ];

  return (
    <div className="page library-page">
      <div className="page-head-row">
        <h1 className="page-title">{t("library.title")}</h1>
        <button className="btn btn-primary" onClick={() => setCreate(true)}>
          <Plus size={16} />
          {t("library.newPlaylist")}
        </button>
      </div>

      <div className="segmented">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={cx("segmented-item", tab === id && "is-active")} onClick={() => setTab(id)}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "playlists" && (
        <>
          <SectionHead
            action={<span className="muted-count">{pluralTracks(playlists.reduce((a, p) => a + p.trackIds.length, 0), i18n.language)}</span>}
          >
            {t("common.playlists")}
          </SectionHead>
          <div className="media-grid">
            <button className="media-card create-card" onClick={() => setCreate(true)}>
              <span className="create-card-icon">
                <Plus size={26} />
              </span>
              <span className="media-card-title">{t("library.newPlaylist")}</span>
              <span className="media-card-sub">{t("library.emptyPlaylistsHint")}</span>
            </button>
            {playlists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        </>
      )}

      {tab === "favorites" && (
        <>
          <div className="collection-head">
            <div className="collection-actions">
              <button className="btn btn-primary" disabled={!favoriteTracks.length} onClick={() => play(favoriteTracks, 0)}>
                {t("common.playAll")}
              </button>
              <span className="muted-count">
                {pluralTracks(favoriteTracks.length, i18n.language)} · {formatTotalDuration(favoriteTracks)}
              </span>
            </div>
          </div>
          {favoriteTracks.length ? (
            <div className="track-list">
              {favoriteTracks.map((tr, i) => (
                <TrackRow key={tr.id} track={tr} index={i} context={favoriteTracks} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Heart size={26} />} title={t("library.emptyFavorites")} hint={t("library.emptyFavoritesHint")} />
          )}
        </>
      )}

      {tab === "local" && (
        <>
          <div className="collection-head">
            <span className="muted-count">
              {pluralTracks(localTracksList.length, i18n.language)} · {formatTotalDuration(localTracksList)}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => (window.location.hash = "#/library/local")}>
              {t("library.allTracks")}
            </button>
          </div>
          <div className="track-list">
            {localTracksList.map((tr, i) => (
              <TrackRow key={tr.id} track={tr} index={i} context={localTracksList} />
            ))}
          </div>
        </>
      )}

      {tab === "artists" && (
        <div className="media-grid">
          {artists.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      )}

      {tab === "albums" && (
        <div className="media-grid">
          {albums.map((a) => (
            <AlbumCard key={a.id} album={a} />
          ))}
        </div>
      )}

      <div className="library-footer">
        <Album size={14} />
        <span>
          {tracks.length} {i18n.language === "ru" ? "треков в каталоге" : "tracks in catalog"}
        </span>
      </div>
    </div>
  );
}

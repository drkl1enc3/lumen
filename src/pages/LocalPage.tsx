import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen, HardDrive, Loader2, Music2, Play, Plus, RefreshCw, Search, Shuffle, Trash2, X } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useLocal } from "../store/local";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { Cover, EmptyState } from "../components/ui";
import { TrackRow } from "../components/TrackRow";
import { formatTotalDuration, pluralTracks } from "../lib/utils";
import { isTauri } from "../lib/tauri";

export function LocalPage() {
  const { t, i18n } = useTranslation();
  const play = usePlayer((s) => s.play);
  const toast = useUI((s) => s.toast);
  const folders = useLocal((s) => s.folders);
  const tracks = useLocal((s) => s.tracks);
  const scanning = useLocal((s) => s.scanning);
  const error = useLocal((s) => s.error);
  const addFolders = useLocal((s) => s.addFolders);
  const removeFolder = useLocal((s) => s.removeFolder);
  const scan = useLocal((s) => s.scan);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return tracks;
    return tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(text) ||
        track.artist.toLowerCase().includes(text) ||
        (track.album ?? "").toLowerCase().includes(text),
    );
  }, [tracks, query]);

  const chooseFolders = async () => {
    if (!isTauri) {
      toast(t("library.localOnlyApp"), "error");
      return;
    }
    try {
      const selected = await open({
        directory: true,
        multiple: true,
        title: t("library.addFolder"),
      });
      if (!selected) return;
      const values = Array.isArray(selected) ? selected : [selected];
      if (values.length) addFolders(values);
    } catch (dialogError) {
      toast(String(dialogError), "error");
    }
  };

  return (
    <div className="page collection-page">
      <header className="collection-hero">
        <Cover seed={7} className="collection-cover">
          <HardDrive size={42} className="collection-cover-icon" />
        </Cover>
        <div className="collection-info">
          <p className="eyebrow">{t("common.local")}</p>
          <h1>{t("library.allTracks")}</h1>
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
              onClick={() => play([...tracks].sort(() => Math.random() - 0.5), 0, { shuffle: true })}
            >
              <Shuffle size={16} />
              {t("playlist.shuffle")}
            </button>
            <button className="btn btn-ghost" onClick={() => void chooseFolders()}>
              <Plus size={16} />
              {t("library.addFolder")}
            </button>
          </div>
        </div>
      </header>

      <div className="local-folders">
        <FolderOpen size={15} />
        {folders.map((folder) => (
          <span className="local-folder" key={folder} title={folder}>
            {folder}
            <button
              className="local-folder-remove"
              aria-label={t("library.removeFolder")}
              onClick={() => removeFolder(folder)}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {!folders.length && <span className="local-folder-empty">{t("library.noFolders")}</span>}
        {folders.length > 0 && (
          <button className="link-button" disabled={scanning} onClick={() => void scan()}>
            {scanning ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
            {scanning ? t("library.scanning") : t("library.rescan")}
          </button>
        )}
      </div>

      {error && <div className="search-network-note is-error">{error}</div>}

      {tracks.length > 0 && (
        <div className="search-bar local-search">
          <Search size={17} className="search-bar-icon" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("library.searchLocal")}
            autoComplete="off"
          />
          {query && (
            <button className="search-clear" aria-label={t("search.clear")} onClick={() => setQuery("")}>
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {scanning && !tracks.length ? (
        <div className="search-loading-list">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className="search-skeleton" />
          ))}
        </div>
      ) : visible.length ? (
        <div className="track-list">
          {visible.map((track, index) => (
            <TrackRow key={track.id} track={track} index={index} context={visible} showAlbum />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Music2 size={26} />}
          title={tracks.length ? t("search.noResults") : t("library.localEmpty")}
          hint={tracks.length ? t("search.noResultsHint") : t("library.localEmptyHint")}
          action={
            !tracks.length ? (
              <button className="btn btn-primary" onClick={() => void chooseFolders()}>
                <Plus size={15} />
                {t("library.addFolder")}
              </button>
            ) : undefined
          }
        />
      )}

      {folders.length > 0 && (
        <div className="library-footer">
          <Trash2 size={13} />
          <span>
            {t("library.scanned")}: {tracks.length}
          </span>
        </div>
      )}
    </div>
  );
}

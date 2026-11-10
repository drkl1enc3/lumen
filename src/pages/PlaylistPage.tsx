import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Pencil, Play, Plus, Shuffle, Trash2 } from "lucide-react";
import { resolveTracks } from "../lib/catalog";
import { useLibrary } from "../store/library";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { Cover, EmptyState, IconButton, Modal, ModalHeader } from "../components/ui";
import { TrackRow } from "../components/TrackRow";
import { formatTotalDuration, pluralTracks } from "../lib/utils";

export function PlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const playlists = useLibrary((s) => s.playlists);
  const rename = useLibrary((s) => s.renamePlaylist);
  const remove = useLibrary((s) => s.deletePlaylist);
  const reorder = useLibrary((s) => s.reorderPlaylist);
  const removeTrack = useLibrary((s) => s.removeFromPlaylist);
  const play = usePlayer((s) => s.play);
  const toast = useUI((s) => s.toast);
  const setCreate = useUI((s) => s.setCreatePlaylist);

  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const playlist = playlists.find((p) => p.id === id);
  if (!playlist) {
    return (
      <div className="page">
        <EmptyState
          icon={<Play size={26} />}
          title={t("common.empty")}
          hint={t("library.emptyPlaylistsHint")}
          action={
            <Link className="btn btn-primary" to="/library">
              {t("nav.library")}
            </Link>
          }
        />
      </div>
    );
  }

  const tracks = resolveTracks(playlist.trackIds);

  return (
    <div className="page collection-page">
      <header className="collection-hero">
        <Cover seed={playlist.cover} className="collection-cover">
          <span className="collection-cover-glow" />
        </Cover>
        <div className="collection-info">
          <p className="eyebrow">
            {playlist.source === "local" ? t("common.local") : t("common.playlists")}
          </p>
          <h1>{playlist.name}</h1>
          {playlist.description && <p className="collection-desc">{playlist.description}</p>}
          <p className="collection-meta">
            {playlist.author && (
              <>
                {t("playlist.createdBy")} {playlist.author} ·{" "}
              </>
            )}
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
            <div className="collection-more">
              <IconButton label={t("common.more")} onClick={() => setMenuOpen((v) => !v)}>
                <MoreHorizontal size={18} />
              </IconButton>
              {menuOpen && (
                <div className="popover is-menu" onMouseLeave={() => setMenuOpen(false)}>
                  <button
                    className="popover-item"
                    onClick={() => {
                      setName(playlist.name);
                      setRenameOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Pencil size={14} />
                    {t("common.rename")}
                  </button>
                  <button
                    className="popover-item is-danger"
                    onClick={() => {
                      setDeleteOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Trash2 size={14} />
                    {t("common.delete")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="track-list-head">
        <span className="tl-index">#</span>
        <span className="tl-title">{t("common.track")}</span>
        <span className="tl-album">{t("common.album")}</span>
        <span className="tl-duration">{t("common.duration")}</span>
      </div>

      {tracks.length ? (
        <div className="track-list">
          {tracks.map((tr, i) => (
            <TrackRow
              key={`${tr.id}-${i}`}
              track={tr}
              index={i}
              context={tracks}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragFrom !== null && dragFrom !== i) {
                  reorder(playlist.id, dragFrom, i);
                }
                setDragFrom(null);
              }}
              onRemove={() => {
                removeTrack(playlist.id, tr.id);
                toast(t("toast.removed"));
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Plus size={26} />}
          title={t("playlist.empty")}
          hint={t("playlist.addTracks")}
          action={
            <button className="btn btn-primary" onClick={() => (window.location.hash = "#/search")}>
              {t("playlist.addTracks")}
            </button>
          }
        />
      )}

      <div className="library-footer">
        <span>{t("playlist.totalTime")}: {formatTotalDuration(tracks)}</span>
        <button className="link-button" onClick={() => setCreate(true)}>
          <Plus size={13} />
          {t("library.newPlaylist")}
        </button>
      </div>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} className="dialog">
        <ModalHeader title={t("playlist.renameTitle")} onClose={() => setRenameOpen(false)} />
        <div className="dialog-body">
          <label className="field">
            <span>{t("playlist.namePlaceholder")}</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  rename(playlist.id, name.trim());
                  setRenameOpen(false);
                  toast(t("toast.renamed"), "success");
                }
              }}
            />
          </label>
          <div className="dialog-actions">
            <button className="btn btn-ghost" onClick={() => setRenameOpen(false)}>
              {t("common.cancel")}
            </button>
            <button
              className="btn btn-primary"
              disabled={!name.trim()}
              onClick={() => {
                rename(playlist.id, name.trim());
                setRenameOpen(false);
                toast(t("toast.renamed"), "success");
              }}
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} className="dialog">
        <ModalHeader
          title={t("playlist.deleteConfirm")}
          subtitle={t("playlist.deleteConfirmHint")}
          onClose={() => setDeleteOpen(false)}
        />
        <div className="dialog-body">
          <div className="dialog-actions">
            <button className="btn btn-ghost" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                remove(playlist.id);
                setDeleteOpen(false);
                toast(t("toast.deleted"));
                navigate("/library");
              }}
            >
              {t("common.delete")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

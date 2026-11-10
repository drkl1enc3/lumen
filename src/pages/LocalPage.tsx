import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen, HardDrive, Music2, Play, Plus, Shuffle } from "lucide-react";
import { localTracksList } from "../lib/mock";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { Cover, EmptyState } from "../components/ui";
import { TrackRow } from "../components/TrackRow";
import { formatTotalDuration, pluralTracks } from "../lib/utils";

export function LocalPage() {
  const { t, i18n } = useTranslation();
  const play = usePlayer((s) => s.play);
  const toast = useUI((s) => s.toast);
  const [folders, setFolders] = useState<string[]>([]);

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
            {pluralTracks(localTracksList.length, i18n.language)} · {formatTotalDuration(localTracksList)}
          </p>
          <div className="collection-buttons">
            <button className="btn btn-primary" onClick={() => play(localTracksList, 0)}>
              <Play size={16} fill="currentColor" />
              {t("common.playAll")}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => play([...localTracksList].sort(() => Math.random() - 0.5), 0, { shuffle: true })}
            >
              <Shuffle size={16} />
              {t("playlist.shuffle")}
            </button>
          </div>
        </div>
      </header>

      <div className="local-folders">
        <FolderOpen size={15} />
        {folders.map((f) => (
          <span className="local-folder" key={f}>
            {f}
          </span>
        ))}
        <button
          className="link-button"
          onClick={() => {
            setFolders((f) => [...f, `~/Music/Library ${f.length + 1}`]);
            toast(t("toast.folderAdded"), "success");
          }}
        >
          <Plus size={13} />
          {t("library.addFolder")}
        </button>
      </div>

      {localTracksList.length ? (
        <div className="track-list">
          {localTracksList.map((tr, i) => (
            <TrackRow key={tr.id} track={tr} index={i} context={localTracksList} showAlbum />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Music2 size={26} />}
          title={t("library.localEmpty")}
          hint={t("library.localEmptyHint")}
        />
      )}

      <div className="library-footer">
        <Music2 size={14} />
        <span>
          FLAC, MP3, OGG, WAV · {t("library.scanned")}: {localTracksList.length}
        </span>
      </div>
    </div>
  );
}

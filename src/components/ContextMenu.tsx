import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Heart, ListPlus, Play, Plus, Share2, User } from "lucide-react";
import { resolveTrack } from "../lib/catalog";
import { artistByIdMap } from "../lib/mock";
import { useUI } from "../store/ui";
import { usePlayer } from "../store/player";
import { useLibrary } from "../store/library";
import { useTranslation } from "react-i18next";
import { useSettings } from "../store/settings";
import { downloadTrack } from "../lib/integrations";

export function ContextMenu() {
  const menu = useUI((s) => s.contextMenu);
  const close = useUI((s) => s.closeContextMenu);
  const setAddToPlaylist = useUI((s) => s.setAddToPlaylist);
  const toast = useUI((s) => s.toast);
  const playTrack = usePlayer((s) => s.playTrack);
  const append = usePlayer((s) => s.queue);
  const favorites = useLibrary((s) => s.favorites);
  const downloadQuality = useSettings((s) => s.downloadQuality);
  const downloadFolder = useSettings((s) => s.downloadFolder);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", close);
    };
  }, [menu, close]);

  if (!menu) return null;
  const track = resolveTrack(menu.trackId);
  if (!track) return null;
  const liked = favorites.includes(track.id);
  const x = Math.max(8, Math.min(menu.x, window.innerWidth - 240));
  const y = Math.max(8, Math.min(menu.y, window.innerHeight - 300));

  const item = (icon: React.ReactNode, label: string, action: () => void, danger = false) => (
    <button
      className={`ctx-item${danger ? " is-danger" : ""}`}
      onClick={() => {
        action();
        close();
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="context-menu" style={{ left: x, top: y }} ref={ref} role="menu">
      {item(<Play size={15} />, t("common.play"), () => playTrack(track))}
      {item(<ListPlus size={15} />, t("common.addToQueue"), () => {
        if (append.length) {
          usePlayer.setState({ queue: [...append, track] });
        } else {
          usePlayer.getState().play([track], 0);
        }
        toast(t("toast.addedToQueue"));
      })}
      {item(<Plus size={15} />, t("common.addToPlaylist"), () => setAddToPlaylist(track.id))}
      {item(
        <Heart size={15} fill={liked ? "currentColor" : "none"} />,
        liked ? t("common.unlike") : t("common.like"),
        () => {
          toggleFavorite(track.id);
          toast(liked ? t("toast.unliked") : t("toast.liked"));
        },
      )}
      <div className="ctx-sep" />
      {artistByIdMap.has(track.artistId) &&
        item(<User size={15} />, t("common.goToArtist"), () => navigate(`/artist/${track.artistId}`))}
      {item(<Share2 size={15} />, t("common.copyLink"), () => {
        void navigator.clipboard?.writeText(track.webpageUrl ?? `https://lumen.fun/track/${track.id}`).catch(() => undefined);
        toast(t("toast.copied"));
      })}
      {track.webpageUrl &&
        item(<Download size={15} />, t("common.download"), () => {
          void downloadTrack({
            url: track.webpageUrl!,
            trackId: track.id,
            quality: downloadQuality,
            folder: downloadFolder,
          })
            .then((path) => toast(t("toast.downloaded", { path }), "success"))
            .catch((error) => toast(String(error), "error"));
        })}
    </div>
  );
}

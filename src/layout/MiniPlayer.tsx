import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Maximize2, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { useSettings } from "../store/settings";
import { Cover } from "../components/ui";
import { clamp } from "../lib/utils";

export function MiniPlayer() {
  const { t } = useTranslation();
  const open = useUI((s) => s.miniOpen);
  const toggleMini = useUI((s) => s.toggleMini);
  const toggleNow = useUI((s) => s.toggleNowPlaying);
  const pos = useUI((s) => s.miniPos);
  const setPos = useUI((s) => s.setMiniPos);
  const style = useSettings((s) => s.miniStyle);

  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const playing = usePlayer((s) => s.playing);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);

  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      setPos({
        x: clamp(e.clientX - drag.current.dx, 8, window.innerWidth - 320),
        y: clamp(e.clientY - drag.current.dy, 48, window.innerHeight - 120),
      });
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setPos]);

  const track = queue[index];
  if (!open || !track) return null;

  const position =
    pos.x < 0
      ? { right: 24, bottom: 108 }
      : { left: pos.x, top: pos.y };

  return (
    <div className={`mini-player mini-${style}`} style={position}>
      <div
        className="mini-drag"
        onPointerDown={(e) => {
          const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
          drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
        }}
      >
        <span className="mini-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="mini-label">Lumen</span>
        <span className="mini-actions">
          <button aria-label={t("mini.expand")} onClick={() => toggleNow(true)}>
            <Maximize2 size={12} />
          </button>
          <button aria-label={t("mini.close")} onClick={() => toggleMini(false)}>
            <X size={13} />
          </button>
        </span>
      </div>
      <div className="mini-body">
        <Cover seed={track.cover} src={track.artwork} className="mini-cover" />
        <div className="mini-meta">
          <span className="mini-title">{track.title}</span>
          <span className="mini-artist">{track.artist}</span>
          <div className="mini-controls">
            <button aria-label={t("common.prev")} onClick={() => prev()}>
              <SkipBack size={14} fill="currentColor" />
            </button>
            <button className="mini-play" aria-label={playing ? t("common.pause") : t("common.play")} onClick={toggle}>
              {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            </button>
            <button aria-label={t("common.next")} onClick={() => next()}>
              <SkipForward size={14} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

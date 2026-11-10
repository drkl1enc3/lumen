import type { CSSProperties } from "react";
import { cx } from "../lib/utils";
import type { VisualizerKind } from "../store/settings";

const BARS = 36;

function rand(seed: number) {
  const v = Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
  return v - Math.floor(v);
}

export function Visualizer({
  kind,
  className,
  compact,
}: {
  kind: VisualizerKind;
  className?: string;
  compact?: boolean;
}) {
  if (kind === "disabled") return null;
  const cls = cx("visualizer", `viz-${kind}`, compact && "is-compact", className);

  if (kind === "bars" || kind === "wave") {
    return (
      <div className={cls} aria-hidden>
        {Array.from({ length: BARS }).map((_, i) => (
          <i
            key={i}
            style={
              {
                "--i": i,
                "--h": `${25 + rand(i + 3) * 75}%`,
                animationDelay: `${-(rand(i + 9) * 1.2).toFixed(2)}s`,
                animationDuration: `${0.7 + rand(i + 4) * 0.8}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    );
  }

  if (kind === "circle" || kind === "radial") {
    return (
      <div className={cls} aria-hidden>
        <div className="viz-orbit">
          {Array.from({ length: 48 }).map((_, i) => (
            <i
              key={i}
              style={
                {
                  transform: `rotate(${i * 7.5}deg) translateY(-42%)`,
                  height: `${8 + rand(i) * 18}px`,
                  animationDelay: `${-(rand(i + 5) * 1.1).toFixed(2)}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
    );
  }

  if (kind === "rings") {
    return (
      <div className={cls} aria-hidden>
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (kind === "stars") {
    return (
      <div className={cls} aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <i
            key={i}
            style={
              {
                left: `${rand(i + 2) * 100}%`,
                top: `${rand(i + 8) * 100}%`,
                animationDelay: `${-(rand(i + 1) * 3).toFixed(2)}s`,
                transform: `scale(${0.5 + rand(i + 6)})`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    );
  }

  if (kind === "crosses") {
    return (
      <div className={cls} aria-hidden>
        {Array.from({ length: 16 }).map((_, i) => (
          <i
            key={i}
            style={
              {
                left: `${8 + rand(i + 3) * 84}%`,
                top: `${8 + rand(i + 7) * 84}%`,
                animationDelay: `${-(rand(i + 4) * 2).toFixed(2)}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    );
  }

  if (kind === "spiral") {
    return (
      <div className={cls} aria-hidden>
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className={cls} aria-hidden>
      <span />
    </div>
  );
}

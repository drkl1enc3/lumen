import { useEffect, useRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { coverStyle } from "../lib/covers";
import { useCoverAccent } from "../lib/coverTheme";
import { cx } from "../lib/utils";
import type { Source } from "../lib/types";

export function Cover({
  seed,
  src,
  className,
  children,
  style,
  onClick,
}: {
  seed: number;
  src?: string;
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const accent = useCoverAccent();
  const base = coverStyle(seed, accent);
  return (
    <div
      className={cx("cover", className)}
      style={{
        ...base,
        ...(src
          ? {
              backgroundImage: `url("${src}"), ${base.backgroundImage}`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  active?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "ghost" | "solid" | "accent" | "flat";
}

export function IconButton({
  label,
  active,
  size = "md",
  variant = "ghost",
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cx("icon-btn", `icon-btn-${size}`, `icon-btn-${variant}`, active && "is-active", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cx("toggle", checked && "is-on", disabled && "is-disabled")}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  className,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cx("select", className, disabled && "is-disabled")}>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} className="select-chevron" />
    </div>
  );
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  className,
  ariaLabel,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <input
      aria-label={ariaLabel}
      className={cx("slider", className)}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      style={{ "--pct": `${pct}%` } as CSSProperties}
      onChange={(e) => onChange(Number(e.target.value))}
      onPointerDown={(e) => e.stopPropagation()}
    />
  );
}

export function Modal({
  open,
  onClose,
  children,
  className,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={cx("modal", className)} role="dialog" aria-modal aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  title,
  onClose,
  subtitle,
  id,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  id?: string;
}) {
  return (
    <div className="modal-head">
      <div>
        <h2 id={id}>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <IconButton label="close" size="sm" onClick={onClose}>
        <X size={18} />
      </IconButton>
    </div>
  );
}

export function SectionHead({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h3>{children}</h3>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("empty", className)}>
      {icon && <div className="empty-icon">{icon}</div>}
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

const sourceLabels: Record<Source, string> = {
  audius: "Audius",
  local: "Local",
  soundcloud: "SoundCloud",
  youtube: "YouTube",
};

export function SourceBadge({ source, short }: { source: Source; short?: boolean }) {
  return (
    <span className={cx("source-badge", `source-${source}`)}>
      <span className="source-dot" />
      {!short && sourceLabels[source]}
    </span>
  );
}

export function PlayingBars({ paused }: { paused?: boolean }) {
  return (
    <span className={cx("playing-bars", paused && "is-paused")} aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={cx("chip", active && "is-active")} onClick={onClick}>
      {children}
    </button>
  );
}

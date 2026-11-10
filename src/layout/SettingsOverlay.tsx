import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeftRight,
  AudioLines,
  Check,
  Circle,
  Clock3,
  CloudRain,
  Disc3,
  Download,
  ExternalLink,
  Flame,
  Flower2,
  FolderOpen,
  Gauge,
  HardDrive,
  Heart,
  Image as ImageIcon,
  Info,
  Keyboard,
  LayoutGrid,
  ListMusic,
  Mail,
  Maximize2,
  Minus,
  Moon,
  Network,
  Palette,
  PanelTop,
  PanelsTopLeft,
  Pin,
  PlayCircle,
  Plug,
  Plus,
  RotateCcw,
  RotateCw,
  Settings2,
  Shuffle,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Square,
  Star,
  Sun,
  ThumbsUp,
  Trash2,
  Type,
  Volume2,
  X,
} from "lucide-react";
import type { SettingsTab } from "../lib/types";
import { cx } from "../lib/utils";
import { useSettings, type Hotkey, type PanelElement } from "../store/settings";
import { useUI } from "../store/ui";
import { IconButton, Select, Slider, Toggle } from "../components/ui";
import { Visualizer } from "../components/Visualizer";
import { setFullscreen } from "../lib/tauri";
import type {
  CustomColors,
  FontFamily,
  ParticleKind,
  Radius,
  TabPosition,
  TabStyle,
  ThemePreset,
  VisualizerKind,
} from "../store/settings";

const tabs: { id: SettingsTab; icon: typeof Settings2 }[] = [
  { id: "general", icon: Settings2 },
  { id: "appearance", icon: Palette },
  { id: "background", icon: ImageIcon },
  { id: "tabs", icon: PanelsTopLeft },
  { id: "panel", icon: PanelTop },
  { id: "cover", icon: Disc3 },
  { id: "player", icon: PlayCircle },
  { id: "controls", icon: SlidersHorizontal },
  { id: "playback", icon: AudioLines },
  { id: "hotkeys", icon: Keyboard },
  { id: "integrations", icon: Plug },
  { id: "storage", icon: HardDrive },
  { id: "about", icon: Info },
];

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="settings-group">
      {title && <p className="settings-group-title">{title}</p>}
      <div className="settings-group-body">{children}</div>
    </section>
  );
}

function Row({
  title,
  hint,
  children,
  stacked,
  disabled,
}: {
  title: string;
  hint?: string;
  children?: ReactNode;
  stacked?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={cx("setting-row", stacked && "is-stacked", disabled && "is-disabled")}>
      <div className="setting-text">
        <span className="setting-title">{title}</span>
        {hint && <span className="setting-hint">{hint}</span>}
      </div>
      {children && <div className="setting-control">{children}</div>}
    </div>
  );
}

function Choice<T extends string>({
  value,
  onChange,
  items,
  columns = 3,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; icon?: ReactNode }[];
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cx("choice-grid", className)}
      style={{ "--choice-cols": columns } as CSSProperties}
    >
      {items.map((item) => (
        <button
          key={item.value}
          className={cx("choice-card", value === item.value && "is-active")}
          onClick={() => onChange(item.value)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function Flag({ code }: { code: string }) {
  return <span className={cx("flag", `flag-${code}`)} aria-hidden />;
}

function ImagePicker({
  value,
  onChange,
  label,
  hint,
  aspect,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  label: string;
  hint: string;
  aspect?: "square" | "wide";
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const toast = useUI((s) => s.toast);

  return (
    <Row title={label} hint={hint}>
      <div className="image-picker">
        {value && (
          <span
            className={cx("image-preview", aspect === "wide" && "is-wide")}
            style={{ backgroundImage: `url(${value})` }}
          />
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => input.current?.click()}>
          <ImageIcon size={14} />
          {t("settings.chooseImage")}
        </button>
        {value && (
          <IconButton
            label={t("settings.removeImage")}
            size="sm"
            onClick={() => {
              onChange(null);
              toast(t("toast.removed"));
            }}
          >
            <X size={14} />
          </IconButton>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => onChange(String(reader.result ?? ""));
            reader.readAsDataURL(file);
            e.target.value = "";
          }}
        />
      </div>
    </Row>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="color-row">
      <span>{label}</span>
      <div className="color-control">
        <code>{value}</code>
        <label className="color-chip" style={{ background: value }}>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
      </div>
    </div>
  );
}

function AccentSwatches() {
  const accent = useSettings((s) => s.accent);
  const themePreset = useSettings((s) => s.themePreset);
  const set = useSettings((s) => s.set);
  const setColor = useSettings((s) => s.setColor);
  const accents = [
    { id: "lavender", color: "#b3a1ff", label: "Lavender" },
    { id: "emerald", color: "#5eead4", label: "Emerald" },
    { id: "rose", color: "#fb8fa7", label: "Rose" },
    { id: "amber", color: "#f6c453", label: "Amber" },
    { id: "ice", color: "#7dd3fc", label: "Ice" },
  ] as const;
  return (
    <div className="accent-swatches">
      {accents.map((a) => (
        <button
          key={a.id}
          className={cx("accent-swatch", accent === a.id && "is-active")}
          title={a.label}
          onClick={() => {
            set("accent", a.id);
            if (themePreset === "custom") setColor("accent", a.color);
          }}
          style={{ "--swatch": a.color } as CSSProperties}
        >
          <span />
          {accent === a.id && <Check size={13} />}
        </button>
      ))}
    </div>
  );
}

function LanguagePicker() {
  const { i18n } = useTranslation();
  const language = useSettings((s) => s.language);
  const set = useSettings((s) => s.set);
  const toast = useUI((s) => s.toast);
  const langs = [
    { id: "en", label: "English" },
    { id: "ru", label: "Русский" },
    { id: "uk", label: "Українська" },
  ] as const;

  return (
    <div className="lang-grid">
      {langs.map((l) => (
        <button
          key={l.id}
          className={cx("lang-card", language === l.id && "is-active")}
          onClick={() => {
            set("language", l.id);
            toast(i18n.getFixedT(l.id)("toast.langChanged"), "success");
          }}
        >
          <Flag code={l.id} />
          <span>{l.label}</span>
          {language === l.id && <span className="lang-badge">{l.id.toUpperCase()}</span>}
        </button>
      ))}
    </div>
  );
}

function HotkeysSection() {
  const { t } = useTranslation();
  const enabled = useSettings((s) => s.hotkeysEnabled);
  const hotkeys = useSettings((s) => s.hotkeys);
  const set = useSettings((s) => s.set);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setEditing(null);
        return;
      }
      const parts: string[] = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.altKey) parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");
      if (e.metaKey) parts.push("Meta");
      const key = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return;
      parts.push(key);
      set(
        "hotkeys",
        hotkeys.map((h) => (h.action === editing ? { ...h, keys: parts.join(" ") } : h)),
      );
      setEditing(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [editing, hotkeys, set]);

  return (
    <>
      <Group title={t("settings.hotkeys")}>
        <Row title={t("settings.hotkeysEnable")} hint={t("settings.hotkeysEnableHint")}>
          <Toggle checked={enabled} onChange={(v) => set("hotkeysEnabled", v)} />
        </Row>
      </Group>
      <Group title={t("settings.hotkeysList")}>
        <div className="hotkey-list">
          {hotkeys.map((h: Hotkey) => (
            <div className="hotkey-row" key={h.action}>
              <span className="hotkey-action">{t(`hotkey.${h.action}`)}</span>
              <button
                className={cx("hotkey-keys", editing === h.action && "is-editing")}
                onClick={() => setEditing(h.action)}
              >
                {editing === h.action ? (
                  <span className="hotkey-capture">{t("settings.hotkeysPress")}</span>
                ) : (
                  h.keys.split(" ").map((k) => (
                    <kbd key={k} className="keycap">
                      {k}
                    </kbd>
                  ))
                )}
              </button>
            </div>
          ))}
        </div>
        <div className="hotkey-footer">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() =>
              set("hotkeys", [
                { action: "playPause", keys: "Space" },
                { action: "next", keys: "Ctrl →" },
                { action: "prev", keys: "Ctrl ←" },
                { action: "volumeUp", keys: "Ctrl ↑" },
                { action: "volumeDown", keys: "Ctrl ↓" },
                { action: "search", keys: "Ctrl K" },
                { action: "like", keys: "L" },
                { action: "queue", keys: "Q" },
                { action: "settings", keys: "Ctrl ," },
              ])
            }
          >
            <RotateCcw size={14} />
            {t("settings.hotkeysReset")}
          </button>
        </div>
      </Group>
    </>
  );
}

function StorageSection() {
  const { t } = useTranslation();
  const cacheLimit = useSettings((s) => s.cacheLimit);
  const toast = useUI((s) => s.toast);
  const [used, setUsed] = useState(1.42);
  const [folders, setFolders] = useState(["~/Music", "~/Downloads/Music"]);

  const pct = Math.min(100, (used / (cacheLimit / 1024)) * 100);

  return (
    <>
      <Group title={t("settings.storage")}>
        <div className="usage-card">
          <div className="usage-head">
            <div>
              <p className="usage-title">{t("settings.cacheUsage")}</p>
              <p className="usage-hint">{t("settings.cacheUsageHint")}</p>
            </div>
            <span className="usage-value">
              {used.toFixed(1)} GB / {(cacheLimit / 1024).toFixed(0)} GB
            </span>
          </div>
          <div className="usage-bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setUsed(0);
              toast(t("toast.cacheCleared"), "success");
            }}
          >
            <Trash2 size={14} />
            {t("settings.clearCache")}
          </button>
        </div>
      </Group>

      <Group title={t("settings.folders")}>
        <Row title={t("settings.folders")} hint={t("settings.foldersHint")} stacked>
          <div className="folder-list">
            {folders.map((folder) => (
              <div className="folder-row" key={folder}>
                <FolderOpen size={16} />
                <span className="folder-path">{folder}</span>
                <button
                  className="folder-remove"
                  aria-label={t("settings.removeFolder")}
                  onClick={() => setFolders((f) => f.filter((x) => x !== folder))}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              className="folder-add"
              onClick={() => {
                setFolders((f) => [...f, `~/Music/Library ${f.length + 1}`]);
                toast(t("toast.folderAdded"), "success");
              }}
            >
              <Plus size={15} />
              {t("settings.addFolder")}
            </button>
          </div>
        </Row>
      </Group>

      <Group>
        <Row title={t("settings.dbSize")} hint={t("settings.dbSizeHint")}>
          <span className="setting-value">48,3 MB</span>
        </Row>
        <Row title={t("settings.downloads")} hint={t("settings.downloadsHint")}>
          <span className="setting-value">12 · 380 MB</span>
        </Row>
      </Group>
    </>
  );
}

function AboutSection() {
  const { t } = useTranslation();
  const toast = useUI((s) => s.toast);
  const checkUpdates = useSettings((s) => s.checkUpdates);
  const set = useSettings((s) => s.set);
  const beta = useSettings((s) => s.betaChannel);
  const [checking, setChecking] = useState(false);

  return (
    <>
      <div className="about-card">
        <span className="about-logo">
          <svg viewBox="0 0 32 32" width="36" height="36">
            <defs>
              <linearGradient id="about-lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#d9ccff" />
                <stop offset="1" stopColor="#8d6bff" />
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="13" fill="none" stroke="url(#about-lg)" strokeWidth="2" />
            <circle cx="16" cy="16" r="5" fill="url(#about-lg)" />
            <g stroke="url(#about-lg)" strokeWidth="2" strokeLinecap="round">
              <path d="M16 1v4" />
              <path d="M16 27v4" />
              <path d="M1 16h4" />
              <path d="M27 16h4" />
            </g>
          </svg>
        </span>
        <div className="about-text">
          <h3>Lumen</h3>
          <p>
            {t("settings.version")} 0.1.0 · UI Preview
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          disabled={checking}
          onClick={() => {
            setChecking(true);
            setTimeout(() => {
              setChecking(false);
              toast(t("toast.noUpdate"));
            }, 900);
          }}
        >
          {t("settings.checkNow")}
        </button>
      </div>

      <Group>
        <Row title={t("settings.checkUpdates")} hint={t("settings.checkUpdatesHint")}>
          <Toggle checked={checkUpdates} onChange={(v) => set("checkUpdates", v)} />
        </Row>
        <Row title={t("settings.channel")}>
          <Select
            value={beta ? "beta" : "stable"}
            onChange={(v) => set("betaChannel", v === "beta")}
            options={[
              { value: "stable", label: t("settings.stable") },
              { value: "beta", label: t("settings.beta") },
            ]}
          />
        </Row>
      </Group>

      <Group>
        <button className="link-row" onClick={() => toast("https://lumen.fun")}>
          <ExternalLink size={15} />
          {t("settings.website")}
          <span>lumen.fun</span>
        </button>
        <button className="link-row" onClick={() => toast("github.com/lumen-player/lumen")}>
          <ExternalLink size={15} />
          {t("settings.source")}
          <span>github.com/lumen-player</span>
        </button>
        <button className="link-row" onClick={() => toast("MIT · OFL · Apache-2.0")}>
          <ExternalLink size={15} />
          {t("settings.licenses")}
          <span>MIT</span>
        </button>
      </Group>

      <p className="about-credits">{t("settings.credits")}</p>
    </>
  );
}

const themePresets = [
  { id: "dark" as ThemePreset, label: "settings.themeDark", bg: "#0b0b0f", fg: "#ececf2", accent: "#b3a1ff" },
  { id: "light" as ThemePreset, label: "settings.themeLight", bg: "#f2f0f7", fg: "#17151d", accent: "#6d4bff" },
  { id: "midnight" as ThemePreset, label: "settings.themeMidnight", bg: "#050b1a", fg: "#dfe8ff", accent: "#5eead4" },
  { id: "custom" as ThemePreset, label: "settings.themeCustom", bg: "#141019", fg: "#f4efff", accent: "#ff8fd8" },
];

const particleItems: { value: ParticleKind; label: string; icon: ReactNode }[] = [
  { value: "off", label: "particle.off", icon: <X size={17} /> },
  { value: "snow", label: "particle.snow", icon: <Snowflake size={17} /> },
  { value: "rain", label: "particle.rain", icon: <CloudRain size={17} /> },
  { value: "stars", label: "particle.stars", icon: <Star size={17} /> },
  { value: "dots", label: "particle.dots", icon: <Circle size={17} /> },
  { value: "hearts", label: "particle.hearts", icon: <Heart size={17} /> },
  { value: "fireflies", label: "particle.fireflies", icon: <Flame size={17} /> },
  { value: "sakura", label: "particle.sakura", icon: <Flower2 size={17} /> },
  { value: "network", label: "particle.network", icon: <Network size={17} /> },
];

const panelElements: { id: PanelElement; label: string; icon: ReactNode }[] = [
  { id: "title", label: "panel.title", icon: <Type size={15} /> },
  { id: "collapse", label: "panel.collapse", icon: <Minus size={15} /> },
  { id: "expand", label: "panel.expand", icon: <Maximize2 size={15} /> },
  { id: "pin", label: "panel.pin", icon: <Pin size={15} /> },
  { id: "close", label: "panel.close", icon: <X size={15} /> },
  { id: "mail", label: "panel.mail", icon: <Mail size={15} /> },
  { id: "logo", label: "panel.logo", icon: <Sparkles size={15} /> },
  { id: "version", label: "panel.version", icon: <AudioLines size={15} /> },
];

const visualizerItems: { value: VisualizerKind; label: string; icon: ReactNode }[] = [
  { value: "disabled", label: "settings.visualizerDisabled", icon: <X size={15} /> },
  { value: "bars", label: "settings.visualizerBars", icon: <AudioLines size={15} /> },
  { value: "wave", label: "settings.visualizerWave", icon: <AudioLines size={15} /> },
  { value: "circle", label: "settings.visualizerCircle", icon: <Circle size={15} /> },
  { value: "rings", label: "settings.visualizerRings", icon: <Disc3 size={15} /> },
  { value: "stars", label: "settings.visualizerStars", icon: <Star size={15} /> },
  { value: "radial", label: "settings.visualizerRadial", icon: <RotateCw size={15} /> },
  { value: "crosses", label: "settings.visualizerCrosses", icon: <X size={15} /> },
  { value: "spiral", label: "settings.visualizerSpiral", icon: <RotateCw size={15} /> },
];

export function SettingsOverlay() {
  const { t } = useTranslation();
  const open = useUI((s) => s.settingsOpen);
  const tab = useUI((s) => s.settingsTab);
  const close = useUI((s) => s.closeSettings);
  const setTab = useUI((s) => s.setSettingsTab);
  const toast = useUI((s) => s.toast);

  const settings = useSettings();
  const set = settings.set;
  const setPlayerButton = settings.setPlayerButton;
  const setPanelElement = settings.setPanelElement;
  const setColor = settings.setColor;

  if (!open) return null;

  const qualityOptions = [
    { value: "low" as const, label: t("settings.qualityLow") },
    { value: "normal" as const, label: t("settings.qualityNormal") },
    { value: "high" as const, label: t("settings.qualityHigh") },
    { value: "lossless" as const, label: t("settings.qualityLossless") },
  ];

  const buttonItems = [
    { id: "volume", label: t("settings.volume") },
    { id: "equalizer", label: t("settings.equalizer") },
    { id: "fullCover", label: t("settings.fullCover") },
    { id: "playlist", label: t("settings.playlistBtn") },
    { id: "like", label: t("settings.likeBtn") },
    { id: "source", label: t("settings.sourceBtn") },
    { id: "sleepTimer", label: t("settings.sleepBtn") },
    { id: "download", label: t("settings.downloadBtn") },
    { id: "ratings", label: t("settings.ratingsBtn") },
    { id: "speed", label: t("settings.speedBtn") },
  ];

  const themeColors: { key: keyof CustomColors; label: string }[] = [
    { key: "primary", label: t("settings.colorPrimary") },
    { key: "accent", label: t("settings.colorAccent") },
    { key: "background", label: t("settings.colorBackground") },
    { key: "foreground", label: t("settings.colorForeground") },
    { key: "card", label: t("settings.colorCard") },
    { key: "border", label: t("settings.colorBorder") },
  ];

  const randomTheme = () => {
    const accent = ["#b3a1ff", "#5eead4", "#fb8fa7", "#f6c453", "#7dd3fc"][
      Math.floor(Math.random() * 5)
    ];
    setColor("accent", accent);
    setColor("primary", accent);
    setColor("background", ["#070709", "#050b1a", "#120a14", "#0a120c"][Math.floor(Math.random() * 4)]);
    toast(t("settings.themeSaved"), "success");
  };

  return (
    <div className="settings-overlay">
      <div className="settings-backdrop" onClick={close} />
      <div className="settings-panel">
        <aside className="settings-rail">
          {tabs.map(({ id, icon: Icon }) => (
            <button
              key={id}
              className={cx("settings-rail-item", tab === id && "is-active")}
              title={t(`settings.${id}`)}
              onClick={() => setTab(id)}
            >
              <Icon size={19} />
            </button>
          ))}
          <span className="settings-rail-version">v0.1.0</span>
        </aside>

        <div className="settings-content">
          <header className="settings-head">
            <div>
              <p className="settings-head-eyebrow">{t("settings.title")}</p>
              <h1>{t(`settings.${tab}`)}</h1>
            </div>
            <IconButton label={t("common.close")} size="md" onClick={close}>
              <X size={19} />
            </IconButton>
          </header>

          <div className="settings-scroll" key={tab}>
            {tab === "general" && (
              <>
                <Group title={t("settings.language")}>
                  <LanguagePicker />
                </Group>
                <Group title={t("settings.main")}>
                  <Row title={t("settings.autoplay")} hint={t("settings.autoplayHint")}>
                    <Toggle checked={settings.autoplay} onChange={(v) => set("autoplay", v)} />
                  </Row>
                  <Row title={t("settings.autostart")} hint={t("settings.autostartHint")}>
                    <Toggle checked={settings.autostart} onChange={(v) => set("autostart", v)} />
                  </Row>
                  <Row title={t("settings.minimize")} hint={t("settings.minimizeHint")}>
                    <Toggle checked={settings.minimizeToTray} onChange={(v) => set("minimizeToTray", v)} />
                  </Row>
                </Group>
                <Group title={t("settings.queueGroup")}>
                  <Row title={t("settings.similar")} hint={t("settings.similarHint")}>
                    <Toggle checked={settings.similarTracks} onChange={(v) => set("similarTracks", v)} />
                  </Row>
                  <Row title={t("settings.restoreQueue")} hint={t("settings.restoreQueueHint")}>
                    <Toggle checked={settings.restoreQueue} onChange={(v) => set("restoreQueue", v)} />
                  </Row>
                  <Row title={t("settings.compactQueue")} hint={t("settings.compactQueueHint")}>
                    <Toggle checked={settings.compactQueue} onChange={(v) => set("compactQueue", v)} />
                  </Row>
                </Group>
              </>
            )}

            {tab === "appearance" && (
              <>
                <Group title={t("settings.theme")}>
                  <div className="setting-row is-stacked">
                    <div className="setting-text">
                      <span className="setting-title">{t("settings.theme")}</span>
                      <span className="setting-hint">{t("settings.themeHint")}</span>
                    </div>
                    <div className="theme-grid">
                      {themePresets.map((preset) => (
                        <button
                          key={preset.id}
                          className={cx("theme-card", settings.themePreset === preset.id && "is-active")}
                          onClick={() => set("themePreset", preset.id)}
                        >
                          <span
                            className="theme-preview"
                            style={{
                              background: `linear-gradient(135deg, ${preset.bg}, ${preset.accent}55)`,
                            }}
                          >
                            <i style={{ background: preset.fg }} />
                            <i style={{ background: preset.accent }} />
                          </span>
                          <span>{t(preset.label)}</span>
                          {settings.themePreset === preset.id && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {settings.themePreset === "custom" && (
                    <div className="theme-editor">
                      <p className="theme-editor-title">{t("settings.customTheme")}</p>
                      {themeColors.map((c) => (
                        <ColorRow
                          key={c.key}
                          label={c.label}
                          value={settings.customColors[c.key]}
                          onChange={(value) => setColor(c.key, value)}
                        />
                      ))}
                      <div className="theme-editor-actions">
                        <button className="btn btn-ghost btn-sm" onClick={randomTheme}>
                          <Shuffle size={14} />
                          {t("settings.randomColors")}
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => toast(t("settings.themeSaved"), "success")}
                        >
                          {t("settings.saveTheme")}
                        </button>
                      </div>
                    </div>
                  )}

                  <Row title={t("settings.accent")} hint={t("settings.accentHint")}>
                    <AccentSwatches />
                  </Row>
                </Group>

                <Group title={t("settings.interface")}>
                  <Row title={t("settings.transparency")} hint={t("settings.transparencyHint")}>
                    <div className="inline-slider">
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={settings.glass}
                        onChange={(v) => set("glass", v)}
                      />
                      <span className="setting-value">{settings.glass}%</span>
                    </div>
                  </Row>
                  <Row title={t("settings.opacity")} hint={t("settings.opacityHint")}>
                    <div className="inline-slider">
                      <Slider
                        min={40}
                        max={100}
                        step={1}
                        value={settings.opacity}
                        onChange={(v) => set("opacity", v)}
                      />
                      <span className="setting-value">{settings.opacity}%</span>
                    </div>
                  </Row>
                  <Row title={t("settings.fontFamily")}>
                    <Select
                      value={settings.fontFamily}
                      onChange={(v) => set("fontFamily", v as FontFamily)}
                      options={[
                        { value: "inter", label: t("settings.fontDefault") },
                        { value: "system", label: t("settings.fontSystem") },
                        { value: "serif", label: t("settings.fontSerif") },
                        { value: "mono", label: t("settings.fontMono") },
                      ]}
                    />
                  </Row>
                  <Row title={t("settings.fontSize")} hint={t("settings.fontSizeHint")}>
                    <div className="inline-slider">
                      <Slider
                        min={12}
                        max={20}
                        step={1}
                        value={settings.fontSize}
                        onChange={(v) => set("fontSize", v)}
                      />
                      <span className="setting-value">{settings.fontSize}px</span>
                    </div>
                  </Row>
                  <Row title={t("settings.fontScale")} hint={t("settings.fontScaleHint")}>
                    <div className="inline-slider">
                      <Slider
                        min={90}
                        max={115}
                        step={1}
                        value={settings.fontScale}
                        onChange={(v) => set("fontScale", v)}
                      />
                      <span className="setting-value">{settings.fontScale}%</span>
                    </div>
                  </Row>
                  <Row title={t("settings.radius")} hint={t("settings.radiusHint")} stacked>
                    <Choice<Radius>
                      value={settings.radius}
                      onChange={(v) => set("radius", v)}
                      columns={4}
                      items={[
                        { value: "none", label: t("settings.radiusNone"), icon: <Square size={15} /> },
                        { value: "small", label: t("settings.radiusSmall"), icon: <Square size={15} /> },
                        { value: "medium", label: t("settings.radiusMedium"), icon: <Square size={15} /> },
                        { value: "large", label: t("settings.radiusLarge"), icon: <Square size={15} /> },
                      ]}
                    />
                  </Row>
                  <Row title={t("settings.animations")} hint={t("settings.animationsHint")}>
                    <Toggle checked={settings.animations} onChange={(v) => set("animations", v)} />
                  </Row>
                </Group>

                <Group title={t("settings.scaling")}>
                  <Row title={t("settings.scaling")} hint={t("settings.scalingHint")} stacked>
                    <div className="scaling-grid">
                      <div>
                        <span className="scaling-label">
                          <Maximize2 size={14} /> {t("settings.scaleFullscreen")}
                        </span>
                        <div className="inline-slider">
                          <Slider
                            min={70}
                            max={130}
                            step={5}
                            value={settings.fullscreenScale}
                            onChange={(v) => set("fullscreenScale", v)}
                          />
                          <span className="setting-value">{settings.fullscreenScale}%</span>
                        </div>
                      </div>
                      <div>
                        <span className="scaling-label">
                          <Square size={13} /> {t("settings.scaleWindowed")}
                        </span>
                        <div className="inline-slider">
                          <Slider
                            min={70}
                            max={130}
                            step={5}
                            value={settings.windowedScale}
                            onChange={(v) => set("windowedScale", v)}
                          />
                          <span className="setting-value">{settings.windowedScale}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="scaling-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          set("scaleMode", "fullscreen");
                          void setFullscreen(true);
                        }}
                      >
                        <Maximize2 size={14} />
                        {t("settings.applyFullscreen")}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          set("scaleMode", "windowed");
                          void setFullscreen(false);
                        }}
                      >
                        <Square size={13} />
                        {t("settings.applyWindowed")}
                      </button>
                    </div>
                  </Row>
                </Group>
              </>
            )}

            {tab === "background" && (
              <>
                <Group title={t("settings.background")}>
                  <ImagePicker
                    value={settings.bgImage}
                    onChange={(v) => set("bgImage", v)}
                    label={t("settings.bgImage")}
                    hint={t("settings.bgImageHint")}
                    aspect="wide"
                  />
                  <Row title={t("settings.bgImageOpacity")}>
                    <div className="inline-slider">
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={settings.bgImageOpacity}
                        onChange={(v) => set("bgImageOpacity", v)}
                      />
                      <span className="setting-value">{settings.bgImageOpacity}%</span>
                    </div>
                  </Row>
                  <Row title={t("settings.bgTransparency")} hint={t("settings.bgTransparencyHint")}>
                    <div className="inline-slider">
                      <Slider
                        min={0}
                        max={90}
                        step={1}
                        value={settings.bgTransparency}
                        onChange={(v) => set("bgTransparency", v)}
                      />
                      <span className="setting-value">{settings.bgTransparency}%</span>
                    </div>
                  </Row>
                </Group>

                <Group title={t("settings.particles")}>
                  <Row title={t("settings.particlesStyle")} hint={t("settings.particlesStyleHint")} stacked>
                    <div className="particle-grid">
                      {particleItems.map((item) => (
                        <button
                          key={item.value}
                          className={cx("particle-card", settings.particles === item.value && "is-active")}
                          onClick={() => set("particles", item.value)}
                        >
                          {item.icon}
                          <span>{t(item.label)}</span>
                        </button>
                      ))}
                    </div>
                  </Row>
                  <ImagePicker
                    value={settings.particleImage}
                    onChange={(v) => set("particleImage", v)}
                    label={t("settings.particleImage")}
                    hint={t("settings.particleImageHint")}
                  />
                  <Row title={t("settings.particleCount")}>
                    <div className="inline-slider">
                      <Slider
                        min={10}
                        max={150}
                        step={5}
                        value={settings.particleCount}
                        onChange={(v) => set("particleCount", v)}
                      />
                      <span className="setting-value">{settings.particleCount}</span>
                    </div>
                  </Row>
                  <Row title={t("settings.particleSpeed")}>
                    <div className="inline-slider">
                      <Slider
                        min={0.2}
                        max={4}
                        step={0.1}
                        value={settings.particleSpeed}
                        onChange={(v) => set("particleSpeed", v)}
                      />
                      <span className="setting-value">{settings.particleSpeed.toFixed(1)}x</span>
                    </div>
                  </Row>
                  <Row title={t("settings.particleSize")}>
                    <div className="inline-slider">
                      <Slider
                        min={1}
                        max={8}
                        step={0.5}
                        value={settings.particleSize}
                        onChange={(v) => set("particleSize", v)}
                      />
                      <span className="setting-value">{settings.particleSize}px</span>
                    </div>
                  </Row>
                  <Row title={t("settings.particleParallax")} hint={t("settings.particleParallaxHint")}>
                    <Toggle
                      checked={settings.particleParallax}
                      onChange={(v) => set("particleParallax", v)}
                    />
                  </Row>
                  <Row title={t("settings.particleColor")} hint={t("settings.particleColorHint")}>
                    <div className="inline-color">
                      <Toggle
                        checked={settings.particleColorEnabled}
                        onChange={(v) => set("particleColorEnabled", v)}
                      />
                      <label
                        className="color-chip"
                        style={{ background: settings.particleColor }}
                      >
                        <input
                          type="color"
                          value={settings.particleColor}
                          onChange={(e) => set("particleColor", e.target.value)}
                        />
                      </label>
                    </div>
                  </Row>
                </Group>
              </>
            )}

            {tab === "tabs" && (
              <>
                <Group title={t("settings.tabs")}>
                  <Row title={t("settings.tabPosition")} hint={t("settings.tabPositionHint")} stacked>
                    <Choice<TabPosition>
                      value={settings.tabPosition}
                      onChange={(v) => set("tabPosition", v)}
                      columns={4}
                      items={[
                        { value: "top", label: t("pos.top"), icon: <PanelTop size={15} /> },
                        { value: "bottom", label: t("pos.bottom"), icon: <PanelTop size={15} /> },
                        { value: "left", label: t("pos.left"), icon: <PanelsTopLeft size={15} /> },
                        { value: "right", label: t("pos.right"), icon: <PanelsTopLeft size={15} /> },
                      ]}
                    />
                  </Row>
                  <Row title={t("settings.tabStyle")} hint={t("settings.tabStyleHint")} stacked>
                    <Choice<TabStyle>
                      value={settings.tabStyle}
                      onChange={(v) => set("tabStyle", v)}
                      columns={3}
                      items={[
                        { value: "default", label: t("settings.tabDefault"), icon: <PanelTop size={15} /> },
                        { value: "compact", label: t("settings.tabCompact"), icon: <PanelsTopLeft size={15} /> },
                        { value: "full", label: t("settings.tabFull"), icon: <LayoutGrid size={15} /> },
                      ]}
                    />
                  </Row>
                  <Row title={t("settings.tabAutoHide")} hint={t("settings.tabAutoHideHint")}>
                    <Toggle checked={settings.tabAutoHide} onChange={(v) => set("tabAutoHide", v)} />
                  </Row>
                </Group>
              </>
            )}

            {tab === "panel" && (
              <>
                <Group title={t("settings.panel")}>
                  <Row title={t("settings.panelStyle")} hint={t("settings.panelStyleHint")} stacked>
                    <Choice<"default" | "compact">
                      value={settings.panelStyle}
                      onChange={(v) => set("panelStyle", v)}
                      columns={2}
                      items={[
                        { value: "default", label: t("settings.panelDefault"), icon: <PanelTop size={15} /> },
                        { value: "compact", label: t("settings.panelCompact"), icon: <Minus size={15} /> },
                      ]}
                    />
                  </Row>
                  <Row
                    title={t("settings.panelElements")}
                    hint={t("settings.panelElementsHint")}
                    stacked
                  >
                    <div className="panel-grid">
                      {panelElements.map((el) => (
                        <button
                          key={el.id}
                          className={cx(
                            "control-tile",
                            settings.panelElements[el.id] && "is-active",
                          )}
                          onClick={() => setPanelElement(el.id, !settings.panelElements[el.id])}
                        >
                          {el.icon}
                          {t(el.label)}
                        </button>
                      ))}
                    </div>
                  </Row>
                  <Row title={t("settings.panelAutoHide")} hint={t("settings.panelAutoHideHint")}>
                    <Toggle checked={settings.panelAutoHide} onChange={(v) => set("panelAutoHide", v)} />
                  </Row>
                </Group>
              </>
            )}

            {tab === "cover" && (
              <Group title={t("settings.cover")}>
                <ImagePicker
                  value={settings.customCover}
                  onChange={(v) => set("customCover", v)}
                  label={t("settings.coverCustom")}
                  hint={t("settings.coverCustomHint")}
                />
                <Row title={t("settings.coverPosition")} hint={t("settings.coverPositionHint")} stacked>
                  <Choice<"left" | "right">
                    value={settings.coverPosition}
                    onChange={(v) => set("coverPosition", v)}
                    columns={2}
                    items={[
                      { value: "left", label: t("settings.coverLeft"), icon: <PanelTop size={15} /> },
                      { value: "right", label: t("settings.coverRight"), icon: <PanelTop size={15} /> },
                    ]}
                  />
                </Row>
                <Row title={t("settings.coverViz")} hint={t("settings.coverVizHint")}>
                  <Toggle
                    checked={settings.coverVisualizer}
                    onChange={(v) => {
                      set("coverVisualizer", v);
                      if (v && settings.visualizer === "disabled") set("visualizer", "bars");
                    }}
                  />
                </Row>
                <Row title={t("settings.coverInCover")} hint={t("settings.coverInCoverHint")}>
                  <Toggle checked={settings.coverInCover} onChange={(v) => set("coverInCover", v)} />
                </Row>
              </Group>
            )}

            {tab === "player" && (
              <>
                <Group title={t("settings.player")}>
                  <Row title={t("settings.align")} hint={t("settings.alignHint")} stacked>
                    <Choice<"left" | "center" | "right">
                      value={settings.playerAlign}
                      onChange={(v) => set("playerAlign", v)}
                      columns={3}
                      items={[
                        { value: "left", label: t("pos.left"), icon: <AlignLeft size={15} /> },
                        { value: "center", label: t("pos.center"), icon: <AlignCenter size={15} /> },
                        { value: "right", label: t("pos.right"), icon: <AlignRight size={15} /> },
                      ]}
                    />
                  </Row>
                  <Row title={t("settings.playerStyle")} hint={t("settings.playerStyleHint")} stacked>
                    <Choice<"normal" | "vinyl" | "large">
                      value={settings.playerStyle}
                      onChange={(v) => set("playerStyle", v)}
                      columns={3}
                      items={[
                        { value: "normal", label: t("settings.playerNormal"), icon: <LayoutGrid size={15} /> },
                        { value: "vinyl", label: t("settings.playerVinyl"), icon: <Disc3 size={15} /> },
                        { value: "large", label: t("settings.playerLarge"), icon: <Maximize2 size={15} /> },
                      ]}
                    />
                  </Row>
                  <Row title={t("settings.sliderType")} hint={t("settings.sliderTypeHint")} stacked>
                    <Choice<"default" | "thin" | "ios" | "wave">
                      value={settings.sliderStyle}
                      onChange={(v) => set("sliderStyle", v)}
                      columns={4}
                      items={[
                        { value: "default", label: t("settings.sliderNormal"), icon: <Circle size={14} /> },
                        { value: "thin", label: t("settings.sliderThin"), icon: <Minus size={15} /> },
                        { value: "ios", label: t("settings.sliderIos"), icon: <Minus size={15} /> },
                        { value: "wave", label: t("settings.sliderWave"), icon: <AudioLines size={15} /> },
                      ]}
                    />
                  </Row>
                  <Row title={t("settings.visualizer")} hint={t("settings.visualizerHint")}>
                    <Select
                      value={settings.visualizer}
                      onChange={(v) => set("visualizer", v as VisualizerKind)}
                      options={visualizerItems.map((v) => ({ value: v.value, label: t(v.label) }))}
                    />
                  </Row>
                  {settings.visualizer !== "disabled" && (
                    <div className="viz-preview">
                      <Visualizer kind={settings.visualizer} />
                    </div>
                  )}
                  <Row title={t("settings.showQueue")} hint={t("settings.showQueueHint")}>
                    <Toggle checked={settings.showQueue} onChange={(v) => set("showQueue", v)} />
                  </Row>
                  <Row title={t("settings.nextPreview")} hint={t("settings.nextPreviewHint")}>
                    <Toggle checked={settings.nextTrackPreview} onChange={(v) => set("nextTrackPreview", v)} />
                  </Row>
                  <Row title={t("settings.compactQueue")} hint={t("settings.compactQueueHint")}>
                    <Toggle checked={settings.compactQueue} onChange={(v) => set("compactQueue", v)} />
                  </Row>
                </Group>
              </>
            )}

            {tab === "controls" && (
              <>
                <Group title={t("settings.buttons")}>
                  <p className="settings-note">{t("settings.controlsHint")}</p>
                  <div className="control-grid">
                    {buttonItems.map((b) => (
                      <button
                        key={b.id}
                        className={cx("control-tile", settings.playerButtons[b.id] && "is-active")}
                        onClick={() => setPlayerButton(b.id, !settings.playerButtons[b.id])}
                      >
                        <span className="control-dot" />
                        {b.label}
                      </button>
                    ))}
                  </div>
                </Group>
                <Group title={t("settings.miniStyle")}>
                  <Row title={t("settings.miniStyle")} hint={t("settings.miniStyleHint")} stacked>
                    <div className="mini-style-grid">
                      {(["full", "compact", "minimal"] as const).map((style) => (
                        <button
                          key={style}
                          className={cx("mini-style-card", settings.miniStyle === style && "is-active")}
                          onClick={() => set("miniStyle", style)}
                        >
                          <span className={cx("mini-style-preview", `preview-${style}`)}>
                            <span className="msp-art" />
                            <span className="msp-lines">
                              <i />
                              <i />
                            </span>
                          </span>
                          <span>
                            {style === "full"
                              ? t("settings.miniFull")
                              : style === "compact"
                                ? t("settings.miniCompact")
                                : t("settings.miniMinimal")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </Row>
                </Group>
              </>
            )}

            {tab === "playback" && (
              <>
                <Group title={t("settings.quality")}>
                  <Row title={t("settings.quality")} hint={t("settings.qualityHint")}>
                    <Select
                      value={settings.audioQuality}
                      onChange={(v) => set("audioQuality", v)}
                      options={qualityOptions}
                    />
                  </Row>
                  <Row title={t("settings.downloadQuality")} hint={t("settings.downloadQualityHint")}>
                    <Select
                      value={settings.downloadQuality}
                      onChange={(v) => set("downloadQuality", v)}
                      options={qualityOptions}
                    />
                  </Row>
                </Group>

                <Group title={t("settings.playback")}>
                  <Row title={t("settings.crossfade")} hint={t("settings.crossfadeHint")}>
                    <div className="inline-slider">
                      <Slider
                        min={0}
                        max={12}
                        step={1}
                        value={settings.crossfade}
                        onChange={(v) => set("crossfade", v)}
                      />
                      <span className="setting-value">{settings.crossfade} s</span>
                    </div>
                  </Row>
                  <Row title={t("settings.gapless")} hint={t("settings.gaplessHint")}>
                    <Toggle checked={settings.gapless} onChange={(v) => set("gapless", v)} />
                  </Row>
                  <Row title={t("settings.normalize")} hint={t("settings.normalizeHint")}>
                    <Toggle checked={settings.normalize} onChange={(v) => set("normalize", v)} />
                  </Row>
                  <Row title={t("settings.speed")} hint={t("player.speed")}>
                    <div className="inline-slider">
                      <Slider
                        min={0.5}
                        max={2}
                        step={0.05}
                        value={settings.playbackSpeed}
                        onChange={(v) => set("playbackSpeed", v)}
                      />
                      <span className="setting-value">{settings.playbackSpeed.toFixed(2)}×</span>
                    </div>
                  </Row>
                  <Row title={t("settings.equalizer")} hint={t("settings.equalizerHint")}>
                    <button className="btn btn-ghost btn-sm" onClick={() => toast(t("toast.demoNotice"))}>
                      {t("settings.equalizer")}
                    </button>
                  </Row>
                </Group>

                <Group title={t("settings.cache")}>
                  <Row title={t("settings.cache")} hint={t("settings.cacheHint")}>
                    <Toggle checked={settings.cacheEnabled} onChange={(v) => set("cacheEnabled", v)} />
                  </Row>
                  <Row title={t("settings.cacheLimit")}>
                    <Select
                      value={String(settings.cacheLimit)}
                      onChange={(v) => set("cacheLimit", Number(v))}
                      options={[512, 1024, 2048, 4096].map((n) => ({
                        value: String(n),
                        label: `${n} MB`,
                      }))}
                    />
                  </Row>
                </Group>
              </>
            )}

            {tab === "hotkeys" && <HotkeysSection />}
            {tab === "integrations" && (
              <>
                <Group title={t("settings.integrations")}>
                  <Row title={t("settings.discord")} hint={t("settings.discordHint")}>
                    <Toggle checked={settings.discord} onChange={(v) => set("discord", v)} />
                  </Row>
                  <Row
                    title={t("settings.discordTrack")}
                    hint={t("settings.discordTrackHint")}
                    disabled={!settings.discord}
                  >
                    <Toggle checked={settings.discordShowTrack} onChange={(v) => set("discordShowTrack", v)} />
                  </Row>
                </Group>
                <Group>
                  <Row title={t("settings.mpris")} hint={t("settings.mprisHint")}>
                    <Toggle checked={settings.mpris} onChange={(v) => set("mpris", v)} />
                  </Row>
                  <Row title={t("settings.tray")} hint={t("settings.trayHint")}>
                    <Toggle checked={settings.tray} onChange={(v) => set("tray", v)} />
                  </Row>
                  <Row title={t("settings.deeplinks")} hint={t("settings.deeplinksHint")}>
                    <Toggle checked={settings.deeplinks} onChange={(v) => set("deeplinks", v)} />
                  </Row>
                </Group>
                <Group title="Last.fm">
                  <Row title={t("settings.lastfm")} hint={t("settings.lastfmHint")}>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={settings.lastfm}
                      onClick={() => {
                        set("lastfm", true);
                        toast(t("settings.connected"), "success");
                      }}
                    >
                      {settings.lastfm ? t("settings.connected") : t("settings.connect")}
                    </button>
                  </Row>
                </Group>
              </>
            )}
            {tab === "storage" && <StorageSection />}
            {tab === "about" && <AboutSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

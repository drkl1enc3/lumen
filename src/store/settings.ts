import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Accent } from "../lib/types";
import { normalizeHotkey } from "../lib/hotkeys";
import { appStorage } from "../lib/persist";

export interface Hotkey {
  action: string;
  keys: string;
}

export type ThemePreset = "dark" | "light" | "midnight" | "custom";
export type FontFamily = "inter" | "system" | "serif" | "mono";
export type Radius = "none" | "small" | "medium" | "large";
export type ParticleKind =
  | "off"
  | "snow"
  | "rain"
  | "stars"
  | "dots"
  | "hearts"
  | "fireflies"
  | "sakura"
  | "network";
export type VisualizerKind =
  | "disabled"
  | "bars"
  | "wave"
  | "orbit"
  | "circle"
  | "rings"
  | "stars"
  | "radial"
  | "crosses"
  | "spiral";
export type TabPosition = "top" | "bottom" | "left" | "right";
export type TabStyle = "default" | "compact" | "full";
export type EqualizerPreset = "flat" | "bass" | "vocal" | "rock" | "pop" | "jazz";
export type PanelElement =
  | "title"
  | "collapse"
  | "expand"
  | "pin"
  | "close"
  | "mail"
  | "logo"
  | "version";

export interface CustomColors {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  card: string;
  border: string;
}

export interface SettingsState {
  language: "ru" | "en" | "uk";
  accent: Accent;
  autoplay: boolean;
  autostart: boolean;
  minimizeToTray: boolean;
  restoreQueue: boolean;
  audioQuality: "low" | "normal" | "high" | "lossless";
  downloadQuality: "low" | "normal" | "high" | "lossless";
  downloadFolder: string | null;
  gapless: boolean;
  normalize: boolean;
  visualizer: VisualizerKind;
  cacheLimit: number;
  miniStyle: "full" | "compact" | "minimal";
  glass: number;
  opacity: number;
  animations: boolean;
  fontScale: number;

  themePreset: ThemePreset;
  customColors: CustomColors;
  fontFamily: FontFamily;
  fontSize: number;
  radius: Radius;
  scaleMode: "fullscreen" | "windowed";
  fullscreenScale: number;
  windowedScale: number;

  bgImage: string | null;
  bgImageOpacity: number;
  bgTransparency: number;
  particles: ParticleKind;
  particleCount: number;
  particleSpeed: number;
  particleSize: number;
  particleImage: string | null;
  particleColorEnabled: boolean;
  particleColor: string;
  particleParallax: boolean;

  tabPosition: TabPosition;
  tabStyle: TabStyle;
  tabAutoHide: boolean;
  panelStyle: "default" | "compact";
  panelElements: Record<PanelElement, boolean>;
  panelAutoHide: boolean;
  panelElementsOrder: PanelElement[];

  customCover: string | null;
  playlistCover: string | null;
  coverThemeSync: boolean;
  coverPosition: "left" | "right";
  coverVisualizer: boolean;
  coverInCover: boolean;

  playerAlign: "left" | "center" | "right";
  playerStyle: "normal" | "vinyl" | "large";
  sliderStyle: "default" | "thin" | "ios" | "wave";
  showQueue: boolean;
  nextTrackPreview: boolean;

  equalizerEnabled: boolean;
  equalizerPreset: EqualizerPreset;
  equalizerBands: number[];
  lyricsEnabled: boolean;

  playerButtons: Record<string, boolean>;
  hotkeysEnabled: boolean;
  hotkeys: Hotkey[];
  discord: boolean;
  discordShowTrack: boolean;
  discordAppId: string;
  mpris: boolean;
  tray: boolean;
  deeplinks: boolean;
  lastfm: boolean;
  lastfmApiKey: string;
  lastfmApiSecret: string;
  lastfmSessionKey: string;
  lastfmUsername: string;
  checkUpdates: boolean;
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  setPlayerButton: (id: string, value: boolean) => void;
  setPanelElement: (id: PanelElement, value: boolean) => void;
  setColor: (key: keyof CustomColors, value: string) => void;
  reset: () => void;
}

export const defaultHotkeys: Hotkey[] = [
  { action: "playPause", keys: "Space" },
  { action: "next", keys: "Ctrl ArrowRight" },
  { action: "prev", keys: "Ctrl ArrowLeft" },
  { action: "volumeUp", keys: "Ctrl ArrowUp" },
  { action: "volumeDown", keys: "Ctrl ArrowDown" },
  { action: "search", keys: "Ctrl K" },
  { action: "like", keys: "L" },
  { action: "queue", keys: "Q" },
  { action: "settings", keys: "Ctrl ," },
];

const defaults = {
  language: "ru" as const,
  accent: "lavender" as Accent,
  autoplay: false,
  autostart: false,
  minimizeToTray: true,
  restoreQueue: true,
  audioQuality: "high" as const,
  downloadQuality: "high" as const,
  downloadFolder: null as string | null,
  gapless: true,
  normalize: false,
  visualizer: "disabled" as VisualizerKind,
  cacheLimit: 2048,
  miniStyle: "full" as const,
  glass: 62,
  opacity: 86,
  animations: true,
  fontScale: 100,

  themePreset: "dark" as ThemePreset,
  customColors: {
    primary: "#b3a1ff",
    accent: "#b3a1ff",
    background: "#070709",
    foreground: "#ececf2",
    card: "#121218",
    border: "#2a2a35",
  } as CustomColors,
  fontFamily: "inter" as FontFamily,
  fontSize: 16,
  radius: "medium" as Radius,
  scaleMode: "fullscreen" as const,
  fullscreenScale: 100,
  windowedScale: 100,

  bgImage: null as string | null,
  bgImageOpacity: 55,
  bgTransparency: 25,
  particles: "off" as ParticleKind,
  particleCount: 50,
  particleSpeed: 2,
  particleSize: 2,
  particleImage: null as string | null,
  particleColorEnabled: false,
  particleColor: "#ffffff",
  particleParallax: false,

  tabPosition: "top" as TabPosition,
  tabStyle: "default" as TabStyle,
  tabAutoHide: false,
  panelStyle: "default" as const,
  panelElements: {
    title: true,
    collapse: true,
    expand: true,
    pin: false,
    close: true,
    mail: true,
    logo: true,
    version: true,
  } as Record<PanelElement, boolean>,
  panelElementsOrder: [
    "logo",
    "title",
    "collapse",
    "expand",
    "pin",
    "mail",
    "version",
    "close",
  ] as PanelElement[],
  panelAutoHide: false,

  customCover: null as string | null,
  playlistCover: null as string | null,
  coverThemeSync: true,
  coverPosition: "left" as const,
  coverVisualizer: false,
  coverInCover: false,

  playerAlign: "left" as const,
  playerStyle: "normal" as const,
  sliderStyle: "default" as const,
  showQueue: true,
  nextTrackPreview: true,

  equalizerEnabled: false,
  equalizerPreset: "flat" as EqualizerPreset,
  equalizerBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  lyricsEnabled: true,

  playerButtons: {
    volume: true,
    equalizer: true,
    playlist: true,
    like: true,
    source: true,
    sleepTimer: true,
    download: true,
    speed: true,
    } as Record<string, boolean>,
  hotkeysEnabled: true,
  hotkeys: defaultHotkeys,
  discord: false,
  discordShowTrack: true,
  discordAppId: "",
  mpris: true,
  tray: true,
  deeplinks: true,
  lastfm: false,
  lastfmApiKey: "",
  lastfmApiSecret: "",
  lastfmSessionKey: "",
  lastfmUsername: "",
  checkUpdates: true,
};

function isHotkey(value: unknown): value is Hotkey {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Hotkey).action === "string" &&
      typeof (value as Hotkey).keys === "string",
  );
}

function mergeHotkeys(saved: unknown): Hotkey[] {
  const savedMap = new Map<string, string>();
  if (Array.isArray(saved)) {
    for (const item of saved) {
      if (isHotkey(item)) savedMap.set(item.action, normalizeHotkey(item.keys));
    }
  }
  return defaults.hotkeys.map((hotkey) => ({
    action: hotkey.action,
    keys: savedMap.get(hotkey.action) ?? hotkey.keys,
  }));
}

function numberArray(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value) || value.length !== fallback.length) return fallback;
  return value.map((item, index) =>
    typeof item === "number" && Number.isFinite(item)
      ? Math.max(-12, Math.min(12, item))
      : fallback[index],
  );
}

/** Fill missing nested keys and reject corrupted persisted values. */
export function mergeSettings(persisted: unknown, current: SettingsState): SettingsState {
  const saved =
    persisted && typeof persisted === "object" ? (persisted as Partial<SettingsState>) : {};
  return {
    ...current,
    ...saved,
    customColors: { ...current.customColors, ...(saved.customColors ?? {}) },
    panelElements: { ...current.panelElements, ...(saved.panelElements ?? {}) },
    playerButtons: { ...current.playerButtons, ...(saved.playerButtons ?? {}) },
    panelElementsOrder:
      Array.isArray(saved.panelElementsOrder) && saved.panelElementsOrder.length
        ? saved.panelElementsOrder.filter((item) =>
            current.panelElementsOrder.includes(item),
          )
        : current.panelElementsOrder,
    hotkeys: mergeHotkeys(saved.hotkeys),
    equalizerBands: numberArray(saved.equalizerBands, current.equalizerBands),
    // Functions are never persisted, but an old/broken value must not replace
    // the live actions from the store initializer.
    set: current.set,
    setPlayerButton: current.setPlayerButton,
    setPanelElement: current.setPanelElement,
    setColor: current.setColor,
    reset: current.reset,
  };
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      set: (key, value) => set({ [key]: value } as unknown as Partial<SettingsState>),
      setPlayerButton: (id, value) =>
        set((state) => ({ playerButtons: { ...state.playerButtons, [id]: value } })),
      setPanelElement: (id, value) =>
        set((state) => ({ panelElements: { ...state.panelElements, [id]: value } })),
      setColor: (key, value) =>
        set((state) => ({
          customColors: { ...state.customColors, [key]: value },
          themePreset: "custom",
        })),
      reset: () => set({ ...defaults }),
    }),
    {
      name: "lumen.settings.v2",
      storage: createJSONStorage(() => appStorage),
      skipHydration: true,
      merge: (persisted, current) => mergeSettings(persisted, current),
    },
  ),
);

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Accent } from "../lib/types";

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
  similarTracks: boolean;
  restoreQueue: boolean;
  compactQueue: boolean;
  audioQuality: "low" | "normal" | "high" | "lossless";
  downloadQuality: "low" | "normal" | "high" | "lossless";
  crossfade: number;
  gapless: boolean;
  normalize: boolean;
  playbackSpeed: number;
  visualizer: VisualizerKind;
  cacheEnabled: boolean;
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
  coverPosition: "left" | "right";
  coverVisualizer: boolean;
  coverInCover: boolean;

  playerAlign: "left" | "center" | "right";
  playerStyle: "normal" | "vinyl" | "large";
  sliderStyle: "default" | "thin" | "ios" | "wave";
  showQueue: boolean;
  nextTrackPreview: boolean;

  playerButtons: Record<string, boolean>;
  hotkeysEnabled: boolean;
  hotkeys: Hotkey[];
  discord: boolean;
  discordShowTrack: boolean;
  mpris: boolean;
  tray: boolean;
  deeplinks: boolean;
  lastfm: boolean;
  checkUpdates: boolean;
  betaChannel: boolean;
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  setPlayerButton: (id: string, value: boolean) => void;
  setPanelElement: (id: PanelElement, value: boolean) => void;
  setColor: (key: keyof CustomColors, value: string) => void;
  reset: () => void;
}

const defaults = {
  language: "ru" as const,
  accent: "lavender" as Accent,
  autoplay: false,
  autostart: false,
  minimizeToTray: true,
  similarTracks: false,
  restoreQueue: true,
  compactQueue: true,
  audioQuality: "high" as const,
  downloadQuality: "high" as const,
  crossfade: 0,
  gapless: true,
  normalize: false,
  playbackSpeed: 1,
  visualizer: "disabled" as VisualizerKind,
  cacheEnabled: true,
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
  coverPosition: "left" as const,
  coverVisualizer: false,
  coverInCover: false,

  playerAlign: "left" as const,
  playerStyle: "normal" as const,
  sliderStyle: "default" as const,
  showQueue: true,
  nextTrackPreview: true,

  playerButtons: {
    volume: true,
    equalizer: true,
    fullCover: true,
    playlist: true,
    like: true,
    source: true,
    sleepTimer: true,
    download: true,
    ratings: true,
    speed: true,
    compactQueue: true,
  } as Record<string, boolean>,
  hotkeysEnabled: true,
  hotkeys: [
    { action: "playPause", keys: "Space" },
    { action: "next", keys: "Ctrl →" },
    { action: "prev", keys: "Ctrl ←" },
    { action: "volumeUp", keys: "Ctrl ↑" },
    { action: "volumeDown", keys: "Ctrl ↓" },
    { action: "search", keys: "Ctrl K" },
    { action: "like", keys: "L" },
    { action: "queue", keys: "Q" },
    { action: "settings", keys: "Ctrl ," },
  ] as Hotkey[],
  discord: true,
  discordShowTrack: true,
  mpris: true,
  tray: true,
  deeplinks: true,
  lastfm: false,
  checkUpdates: true,
  betaChannel: false,
};

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
    { name: "lumen.settings.v2" },
  ),
);

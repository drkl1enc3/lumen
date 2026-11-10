import { create } from "zustand";
import type { SettingsTab } from "../lib/types";
import { uid } from "../lib/utils";

export interface Toast {
  id: string;
  message: string;
  kind: "info" | "success" | "error";
}

interface UIState {
  settingsOpen: boolean;
  settingsTab: SettingsTab;
  queueOpen: boolean;
  nowPlayingOpen: boolean;
  miniOpen: boolean;
  miniPos: { x: number; y: number };
  listenTogetherOpen: boolean;
  loginOpen: boolean;
  createPlaylistOpen: boolean;
  addToPlaylistTrackId: string | null;
  contextMenu: { x: number; y: number; trackId: string } | null;
  toasts: Toast[];
  openSettings: (tab?: SettingsTab) => void;
  closeSettings: () => void;
  setSettingsTab: (tab: SettingsTab) => void;
  toggleQueue: (open?: boolean) => void;
  toggleNowPlaying: (open?: boolean) => void;
  toggleMini: (open?: boolean) => void;
  setMiniPos: (pos: { x: number; y: number }) => void;
  setListenTogether: (open: boolean) => void;
  setLogin: (open: boolean) => void;
  setCreatePlaylist: (open: boolean) => void;
  setAddToPlaylist: (trackId: string | null) => void;
  openContextMenu: (x: number, y: number, trackId: string) => void;
  closeContextMenu: () => void;
  toast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: string) => void;
}

export const useUI = create<UIState>((set) => ({
  settingsOpen: false,
  settingsTab: "general",
  queueOpen: false,
  nowPlayingOpen: false,
  miniOpen: false,
  miniPos: { x: -1, y: -1 },
  listenTogetherOpen: false,
  loginOpen: false,
  createPlaylistOpen: false,
  addToPlaylistTrackId: null,
  contextMenu: null,
  toasts: [],
  openSettings: (tab = "general") => set({ settingsOpen: true, settingsTab: tab }),
  closeSettings: () => set({ settingsOpen: false }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  toggleQueue: (open) => set((s) => ({ queueOpen: open ?? !s.queueOpen })),
  toggleNowPlaying: (open) => set((s) => ({ nowPlayingOpen: open ?? !s.nowPlayingOpen })),
  toggleMini: (open) => set((s) => ({ miniOpen: open ?? !s.miniOpen })),
  setMiniPos: (pos) => set({ miniPos: pos }),
  setListenTogether: (open) => set({ listenTogetherOpen: open }),
  setLogin: (open) => set({ loginOpen: open }),
  setCreatePlaylist: (open) => set({ createPlaylistOpen: open }),
  setAddToPlaylist: (trackId) => set({ addToPlaylistTrackId: trackId }),
  openContextMenu: (x, y, trackId) => set({ contextMenu: { x, y, trackId } }),
  closeContextMenu: () => set({ contextMenu: null }),
  toast: (message, kind = "info") => {
    const id = uid("toast");
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

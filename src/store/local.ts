import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Track } from "../lib/types";
import { appStorage } from "../lib/persist";
import { isTauri } from "../lib/tauri";
import { scanLocal, setLocalRoots } from "../lib/integrations";

interface LocalState {
  folders: string[];
  tracks: Track[];
  scanning: boolean;
  error: string | null;
  lastScan: number | null;
  addFolders: (folders: string[]) => void;
  removeFolder: (folder: string) => void;
  scan: () => Promise<void>;
  clear: () => void;
}

function toTrack(item: {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  duration: number;
  path: string;
  cover: number;
}): Track {
  return {
    id: item.id,
    title: item.title,
    artistId: "local",
    artist: item.artist,
    album: item.album ?? undefined,
    duration: Math.max(1, Math.round(item.duration)),
    cover: item.cover,
    source: "local",
    path: item.path,
  };
}

export const useLocal = create<LocalState>()(
  persist(
    (set, get) => ({
      folders: [],
      tracks: [],
      scanning: false,
      error: null,
      lastScan: null,
      addFolders: (folders) => {
        const merged = [...new Set([...get().folders, ...folders.map((folder) => folder.trim())])]
          .filter(Boolean);
        set({ folders: merged });
        void get().scan();
      },
      removeFolder: (folder) => {
        set({ folders: get().folders.filter((item) => item !== folder) });
        void get().scan();
      },
      scan: async () => {
        const folders = get().folders;
        if (!isTauri) {
          set({ error: "Локальная фонотека доступна только в приложении Lumen" });
          return;
        }
        set({ scanning: true, error: null });
        try {
          await setLocalRoots(folders);
          const result = folders.length ? await scanLocal(folders) : [];
          set({
            tracks: result.map(toTrack),
            scanning: false,
            lastScan: Date.now(),
          });
        } catch (error) {
          set({ scanning: false, error: String(error) });
        }
      },
      clear: () => set({ tracks: [], lastScan: null }),
    }),
    {
      name: "lumen.local.v1",
      storage: createJSONStorage(() => appStorage),
      skipHydration: true,
      partialize: (state) => ({
        folders: state.folders,
        tracks: state.tracks,
        lastScan: state.lastScan,
      }),
    },
  ),
);

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mockFavorites, mockHistory, playlists as mockPlaylists } from "../lib/mock";
import type { Playlist } from "../lib/types";
import { uid } from "../lib/utils";
import { useSettings } from "./settings";

interface LibraryState {
  favorites: string[];
  playlists: Playlist[];
  recent: string[];
  stats: Record<string, number>;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  createPlaylist: (name: string, description?: string) => Playlist;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  reorderPlaylist: (playlistId: string, from: number, to: number) => void;
  registerPlay: (id: string) => void;
  clearHistory: () => void;
}

const seedStats: Record<string, number> = {
  "midnight-transit-1": 14,
  "paper-moons-1": 11,
  "signal-bloom-1": 9,
  "velvet-rust-2": 8,
  "afterglow-1": 7,
  "slow-hours-2": 6,
  "wildwood-3": 5,
  "still-water-3": 4,
  "midnight-transit-3": 4,
  "pixel-coast-2": 3,
};

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: mockFavorites,
      playlists: mockPlaylists,
      recent: mockHistory,
      stats: seedStats,
      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((f) => f !== id)
            : [id, ...state.favorites],
        })),
      isFavorite: (id) => get().favorites.includes(id),
      createPlaylist: (name, description) => {
        const lang = useSettings.getState().language;
        const playlist: Playlist = {
          id: uid("pl"),
          name,
          description,
          cover: Math.floor(Math.random() * 10),
          source: "mixed",
          trackIds: [],
          author: lang === "en" ? "You" : lang === "uk" ? "Ви" : "Вы",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({ playlists: [playlist, ...state.playlists] }));
        return playlist;
      },
      renamePlaylist: (id, name) =>
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p,
          ),
        })),
      deletePlaylist: (id) =>
        set((state) => ({ playlists: state.playlists.filter((p) => p.id !== id) })),
      addToPlaylist: (playlistId, trackId) =>
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId && !p.trackIds.includes(trackId)
              ? { ...p, trackIds: [...p.trackIds, trackId], updatedAt: Date.now() }
              : p,
          ),
        })),
      removeFromPlaylist: (playlistId, trackId) =>
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId), updatedAt: Date.now() }
              : p,
          ),
        })),
      reorderPlaylist: (playlistId, from, to) =>
        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id !== playlistId) return p;
            const ids = [...p.trackIds];
            const [moved] = ids.splice(from, 1);
            ids.splice(to, 0, moved);
            return { ...p, trackIds: ids, updatedAt: Date.now() };
          }),
        })),
      registerPlay: (id) =>
        set((state) => ({
          recent: [id, ...state.recent.filter((r) => r !== id)].slice(0, 60),
          stats: { ...state.stats, [id]: (state.stats[id] ?? 0) + 1 },
        })),
      clearHistory: () => set({ recent: [] }),
    }),
    { name: "lumen.library.v1" },
  ),
);

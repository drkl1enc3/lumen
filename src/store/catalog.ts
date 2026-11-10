import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Track } from "../lib/types";

const MAX_TRACKS = 3000;

interface CatalogState {
  external: Record<string, Track>;
  upsert: (tracks: Track[]) => void;
  markPreview: (id: string) => void;
}

export const useCatalog = create<CatalogState>()(
  persist(
    (set) => ({
      external: {},
      upsert: (tracks) =>
        set((state) => {
          const external = { ...state.external };
          for (const track of tracks) {
            if (!track.external) continue;
            const existing = external[track.id];
            external[track.id] = {
              ...existing,
              ...track,
              previewOnly: Boolean(existing?.previewOnly || track.previewOnly),
            };
          }
          const ids = Object.keys(external);
          if (ids.length > MAX_TRACKS) {
            for (const id of ids.slice(0, ids.length - MAX_TRACKS)) {
              delete external[id];
            }
          }
          return { external };
        }),
      markPreview: (id) =>
        set((state) => {
          const track = state.external[id];
          if (!track || track.previewOnly) return {};
          return { external: { ...state.external, [id]: { ...track, previewOnly: true } } };
        }),
    }),
    { name: "lumen.catalog.v1" },
  ),
);

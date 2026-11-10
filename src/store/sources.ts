import { create } from "zustand";
import { isTauri } from "../lib/tauri";
import {
  clearCache,
  getCacheInfo,
  getSourceStatus,
  type CacheInfo,
  type SourceStatus,
} from "../lib/sources";

interface SourcesState {
  status: SourceStatus | null;
  cache: CacheInfo | null;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clear: () => Promise<boolean>;
}

export const useSources = create<SourcesState>((set) => ({
  status: null,
  cache: null,
  refreshing: false,
  error: null,
  refresh: async () => {
    if (!isTauri) return;
    set({ refreshing: true, error: null });
    try {
      const [status, cache] = await Promise.all([getSourceStatus(), getCacheInfo()]);
      set({ status, cache, refreshing: false });
    } catch (error) {
      set({ refreshing: false, error: String(error) });
    }
  },
  clear: async () => {
    if (!isTauri) return false;
    set({ refreshing: true, error: null });
    try {
      await clearCache();
      const cache = await getCacheInfo();
      set({ cache, refreshing: false });
      return true;
    } catch (error) {
      set({ refreshing: false, error: String(error) });
      return false;
    }
  },
}));

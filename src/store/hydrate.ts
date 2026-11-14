import { isTauri } from "../lib/tauri";
import { setLocalRoots } from "../lib/integrations";
import { useCatalog } from "./catalog";
import { useLibrary } from "./library";
import { useLocal } from "./local";
import { usePlayer } from "./player";
import { useSettings } from "./settings";

/**
 * Zustand persist is configured with `skipHydration` so every store can be
 * restored from disk before React renders. This avoids a visible flash of
 * default settings and, more importantly, prevents defaults from overwriting
 * the saved state during the first render.
 */
export async function hydrateStores(): Promise<void> {
  await useSettings.persist.rehydrate();
  await Promise.all([
    usePlayer.persist.rehydrate(),
    useLibrary.persist.rehydrate(),
    useCatalog.persist.rehydrate(),
    useLocal.persist.rehydrate(),
  ]);

  const local = useLocal.getState();
  if (isTauri && local.folders.length) {
    await setLocalRoots(local.folders).catch(() => undefined);
  }

  const settings = useSettings.getState();
  const player = usePlayer.getState();
  const queue = settings.restoreQueue ? player.queue : [];
  const index = queue.length ? Math.min(Math.max(0, player.index), queue.length - 1) : 0;
  const track = queue[index];
  const resume = settings.restoreQueue && track
    ? Math.min(Math.max(0, player.resumePosition), Math.max(1, track.duration))
    : 0;

  usePlayer.setState({
    queue,
    index,
    playing: Boolean(settings.autoplay && queue.length),
    loading: false,
    loadProgress: 0,
    loadError: null,
    progress: resume,
    resumePosition: resume,
    sleepTimer: null,
    sleepEndsAt: null,
  });
}

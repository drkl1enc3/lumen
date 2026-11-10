import type { Track } from "./types";
import { trackById } from "./mock";
import { useCatalog } from "../store/catalog";

export function resolveTrack(id: string): Track | undefined {
  return trackById.get(id) ?? useCatalog.getState().external[id];
}

export function resolveTracks(ids: string[]): Track[] {
  return ids
    .map((id) => resolveTrack(id))
    .filter((track): track is Track => Boolean(track));
}

export function isExternalTrack(track: Track | undefined): boolean {
  return Boolean(
    track &&
      (track.external ||
        track.source === "youtube" ||
        track.source === "soundcloud"),
  );
}


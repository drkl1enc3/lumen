import type { Track } from "./types";
import { trackById } from "./mock";
import { useCatalog } from "../store/catalog";
import { useLocal } from "../store/local";

export function resolveTrack(id: string): Track | undefined {
  return (
    trackById.get(id) ??
    useCatalog.getState().external[id] ??
    useLocal.getState().tracks.find((track) => track.id === id)
  );
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

export function isLocalTrack(track: Track | undefined): boolean {
  return Boolean(track && track.source === "local" && track.path);
}

export function isPlayableTrack(track: Track | undefined): boolean {
  return Boolean(track && (isExternalTrack(track) || isLocalTrack(track)));
}

export function isDemoTrack(track: Track | undefined): boolean {
  return Boolean(track && !isPlayableTrack(track));
}


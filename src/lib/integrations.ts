import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Track } from "./types";

export interface MediaUpdate {
  playing: boolean;
  title: string | null;
  artist: string | null;
  album: string | null;
  duration: number | null;
  volume: number;
  cover: string | null;
}

export interface MediaControlEvent {
  action: "play" | "pause" | "toggle" | "next" | "prev" | "stop" | "seek" | "seekBy";
  position?: number;
  delta?: number;
}

export interface LocalTrackDto {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  duration: number;
  path: string;
  cover: number;
  trackNo?: number | null;
}

export interface Lyrics {
  plain: string | null;
  synced: string | null;
  source: string;
}

export interface LastFmSession {
  sessionKey: string;
  username: string;
}

export interface FileDownloadProgress {
  trackId: string;
  percent: number;
  phase: string;
}

export async function setMediaEnabled(enabled: boolean): Promise<void> {
  await invoke("set_media_enabled", { enabled });
}

export async function updateMedia(payload: MediaUpdate): Promise<void> {
  await invoke("media_update", { ...payload });
}

export function onMediaControl(cb: (event: MediaControlEvent) => void): Promise<UnlistenFn> {
  return listen<MediaControlEvent>("lumen://media-control", (event) => cb(event.payload));
}

export async function setTrayEnabled(enabled: boolean): Promise<void> {
  await invoke("set_tray_enabled", { enabled });
}

export async function isTrayAvailable(): Promise<boolean> {
  return invoke<boolean>("tray_available");
}

export async function quitApp(): Promise<void> {
  await invoke("quit_app");
}

export function onTrayAction(cb: (action: string) => void): Promise<UnlistenFn> {
  return listen<string>("lumen://tray-action", (event) => cb(event.payload));
}

export function onDeepLink(cb: (urls: string[]) => void): Promise<UnlistenFn> {
  return listen<string[]>("lumen://deep-link", (event) => cb(event.payload));
}

export async function getDeepLinkCurrent(): Promise<string[]> {
  return invoke<string[]>("deep_link_current");
}

export function onSecondInstance(cb: (argv: string[]) => void): Promise<UnlistenFn> {
  return listen<string[]>("lumen://second-instance", (event) => cb(event.payload));
}

export async function discordConnect(appId: string): Promise<void> {
  await invoke("discord_connect", { appId });
}

export async function discordDisconnect(): Promise<void> {
  await invoke("discord_disconnect");
}

export async function discordUpdate(payload: {
  title: string | null;
  artist: string | null;
  album: string | null;
  playing: boolean;
  showTrack: boolean;
}): Promise<void> {
  await invoke("discord_update", payload);
}

export async function lastfmGetToken(apiKey: string, apiSecret: string): Promise<string> {
  return invoke<string>("lastfm_get_token", { apiKey, apiSecret });
}

export async function lastfmGetSession(
  apiKey: string,
  apiSecret: string,
  token: string,
): Promise<LastFmSession> {
  return invoke<LastFmSession>("lastfm_get_session", { apiKey, apiSecret, token });
}

export async function lastfmNowPlaying(
  apiKey: string,
  apiSecret: string,
  sessionKey: string,
  track: Track,
): Promise<void> {
  await invoke("lastfm_now_playing", {
    apiKey,
    apiSecret,
    sessionKey,
    artist: track.artist,
    track: track.title,
    album: track.album ?? null,
    duration: Math.max(1, Math.round(track.duration)),
  });
}

export async function lastfmScrobble(
  apiKey: string,
  apiSecret: string,
  sessionKey: string,
  track: Track,
  timestamp: number,
): Promise<void> {
  await invoke("lastfm_scrobble", {
    apiKey,
    apiSecret,
    sessionKey,
    artist: track.artist,
    track: track.title,
    album: track.album ?? null,
    duration: Math.max(1, Math.round(track.duration)),
    timestamp,
  });
}

export async function fetchLyrics(track: Track): Promise<Lyrics | null> {
  return invoke<Lyrics | null>("fetch_lyrics", {
    title: track.title,
    artist: track.artist,
    album: track.album ?? null,
    duration: Math.max(1, Math.round(track.duration)),
  });
}

export async function setAudioFilters(
  normalize: boolean,
  equalizerEnabled: boolean,
  bands: number[],
): Promise<void> {
  await invoke("set_audio_filters", { normalize, equalizerEnabled, bands });
}

export async function setGapless(enabled: boolean): Promise<void> {
  await invoke("set_gapless", { enabled });
}

export async function setLocalRoots(roots: string[]): Promise<void> {
  await invoke("set_local_roots", { roots });
}

export async function scanLocal(folders: string[]): Promise<LocalTrackDto[]> {
  return invoke<LocalTrackDto[]>("scan_local", { folders });
}

export async function downloadTrack(payload: {
  url: string;
  trackId: string;
  quality: string;
  folder: string | null;
}): Promise<string> {
  return invoke<string>("download_track", payload);
}

export function onFileDownloadProgress(
  cb: (progress: FileDownloadProgress) => void,
): Promise<UnlistenFn> {
  return listen<FileDownloadProgress>("lumen://file-download-progress", (event) =>
    cb(event.payload),
  );
}

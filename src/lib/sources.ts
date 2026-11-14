import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { hashString } from "./utils";
import type { Source, Track } from "./types";

export interface RemoteTrackDto {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail?: string | null;
  url: string;
  source: string;
  plays?: number | null;
  preview: boolean;
}

export interface PreparedTrack {
  path: string;
  duration: number;
  preview: boolean;
  cached: boolean;
}

export interface ToolInfo {
  path: string;
  version: string;
}

export interface SourceStatus {
  ytdlp: ToolInfo | null;
  ffmpeg: ToolInfo | null;
  ffprobe: ToolInfo | null;
  mpv: ToolInfo | null;
  cacheBytes: number;
  cacheFiles: number;
  cacheDir: string;
}

export interface CacheInfo {
  bytes: number;
  files: number;
  dir: string;
}

export interface DownloadProgress {
  trackId: string;
  percent: number;
  phase: string;
}

const notTauri = "Источники доступны только в приложении Lumen";

export function detectMediaSource(value: string): "youtube" | "soundcloud" | null {
  const lower = value.trim().toLowerCase();
  if (!/^https?:\/\//.test(lower)) return null;
  try {
    const host = new URL(lower).hostname.replace(/^www\./, "");
    if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com")) {
      return "youtube";
    }
    if (host === "soundcloud.com" || host.endsWith(".soundcloud.com")) {
      return "soundcloud";
    }
  } catch {
    return null;
  }
  return null;
}

function toTrack(dto: RemoteTrackDto): Track {
  return {
    id: dto.id,
    title: dto.title,
    artistId: "external",
    artist: dto.artist,
    duration: Math.max(1, Math.round(dto.duration || 0)),
    cover: hashString(dto.id) % 10,
    source: dto.source as Source,
    plays: dto.plays ?? undefined,
    artwork: dto.thumbnail || undefined,
    webpageUrl: dto.url,
    external: true,
    previewOnly: dto.preview,
  };
}

export async function searchSource(
  query: string,
  source: "youtube" | "soundcloud",
  limit = 12,
): Promise<Track[]> {
  if (!("__TAURI_INTERNALS__" in window)) throw new Error(notTauri);
  const result = await invoke<RemoteTrackDto[]>("source_search", { query, source, limit });
  return result.map(toTrack);
}

export async function prepareTrack(track: Track, quality = "high"): Promise<PreparedTrack> {
  if (!("__TAURI_INTERNALS__" in window)) throw new Error(notTauri);
  if (!track.webpageUrl) throw new Error("У трека нет ссылки на источник");
  return invoke<PreparedTrack>("prepare_track", {
    url: track.webpageUrl,
    trackId: track.id,
    quality,
  });
}

export async function getSourceStatus(): Promise<SourceStatus> {
  return invoke<SourceStatus>("source_status");
}

export async function getCacheInfo(): Promise<CacheInfo> {
  return invoke<CacheInfo>("cache_info");
}

export async function clearCache(): Promise<void> {
  return invoke<void>("clear_cache");
}

export async function setCacheLimit(maxMb: number): Promise<void> {
  return invoke<void>("set_cache_limit", { maxMb });
}

export async function playFile(
  path: string,
  options: {
    paused: boolean;
    position?: number;
    volume?: number;
    muted?: boolean;
    speed?: number;
  },
): Promise<void> {
  return invoke<void>("play_file", {
    path,
    paused: options.paused,
    position: options.position ?? 0,
    volume: options.volume ?? 1,
    muted: options.muted ?? false,
    speed: options.speed ?? 1,
  });
}

export async function setMpvPaused(paused: boolean): Promise<void> {
  return invoke<void>("set_pause", { paused });
}

export async function seekMpv(seconds: number): Promise<void> {
  return invoke<void>("seek", { seconds });
}

export async function setMpvVolume(volume: number, muted: boolean): Promise<void> {
  return invoke<void>("set_volume", { volume, muted });
}

export async function setMpvSpeed(speed: number): Promise<void> {
  return invoke<void>("set_speed", { speed });
}

export async function stopMpv(): Promise<void> {
  return invoke<void>("stop");
}

export async function onPlaybackPosition(cb: (seconds: number) => void): Promise<UnlistenFn> {
  return listen<number>("lumen://playback-position", (event) => cb(event.payload));
}

export async function onPlaybackDuration(cb: (seconds: number) => void): Promise<UnlistenFn> {
  return listen<number>("lumen://playback-duration", (event) => cb(event.payload));
}

export async function onPlaybackEnded(cb: () => void): Promise<UnlistenFn> {
  return listen("lumen://playback-ended", () => cb());
}

export async function onPlaybackError(cb: (message: string) => void): Promise<UnlistenFn> {
  return listen<string>("lumen://playback-error", (event) => cb(event.payload));
}

export async function onDownloadProgress(
  cb: (progress: DownloadProgress) => void,
): Promise<UnlistenFn> {
  return listen<DownloadProgress>("lumen://download-progress", (event) => cb(event.payload));
}

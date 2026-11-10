import type { Track } from "./types";

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatLongTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")} млн`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")} тыс.`;
  return String(n);
}

export function formatTotalDuration(tracks: Track[]): string {
  const total = tracks.reduce((acc, t) => acc + t.duration, 0);
  return formatLongTime(total);
}

export function pluralTracks(n: number, lang: string): string {
  if (lang === "en") return `${n} ${n === 1 ? "track" : "tracks"}`;
  if (lang === "uk") return `${n} трек${n % 10 === 1 && n % 100 !== 11 ? "" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "и" : "ів"}`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "треков";
  if (mod10 === 1 && mod100 !== 11) word = "трек";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = "трека";
  return `${n} ${word}`;
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

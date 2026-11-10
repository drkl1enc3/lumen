export type Source = "audius" | "local" | "soundcloud" | "youtube";

export interface Artist {
  id: string;
  name: string;
  avatar: number;
  followers: number;
  genre: string;
  bio?: string;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  year: number;
  cover: number;
  trackIds: string[];
  source: Source;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  albumId?: string;
  album?: string;
  duration: number;
  cover: number;
  source: Source;
  path?: string;
  plays?: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover: number;
  source: Source | "mixed";
  trackIds: string[];
  author?: string;
  createdAt: number;
  updatedAt: number;
}

export type RepeatMode = "off" | "all" | "one";

export type SettingsTab =
  | "general"
  | "playback"
  | "appearance"
  | "controls"
  | "hotkeys"
  | "integrations"
  | "storage"
  | "about";

export type Accent = "lavender" | "emerald" | "rose" | "amber" | "ice";

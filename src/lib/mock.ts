import type { Album, Artist, Playlist, Track } from "./types";

/**
 * Release builds start with an empty library. Tracks arrive from the online
 * sources (SoundCloud / YouTube), playlists are created by the user.
 */
export const artists: Artist[] = [];
export const albums: Album[] = [];
export const tracks: Track[] = [];
export const localTracksList: Track[] = [];
export const playlists: Playlist[] = [];
export const mockHistory: string[] = [];
export const mockFavorites: string[] = [];

export const trackById = new Map(tracks.map((t) => [t.id, t]));
export const artistByIdMap = new Map(artists.map((a) => [a.id, a]));
export const albumByIdMap = new Map(albums.map((a) => [a.id, a]));

export function tracksByIds(ids: string[]): Track[] {
  return ids.map((id) => trackById.get(id)).filter((t): t is Track => Boolean(t));
}

export function searchCatalog(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { tracks: [], albums: [], artists: [], playlists: [] };
  }
  const match = (s: string) => s.toLowerCase().includes(q);
  return {
    tracks: tracks.filter((t) => match(t.title) || match(t.artist) || match(t.album ?? "")),
    albums: albums.filter((a) => match(a.title) || match(a.artist)),
    artists: artists.filter((a) => match(a.name) || match(a.genre)),
    playlists: playlists.filter((p) => match(p.name) || match(p.description ?? "")),
  };
}

export const topTracks: Track[] = [];
export const topArtists: Artist[] = [];
export const waveTracks: Track[] = [];

import type { Album, Artist, Playlist, Track } from "./types";

interface AlbumDef {
  id: string;
  title: string;
  artistId: string;
  year: number;
  titles: string[];
}

export const artists: Artist[] = [
  { id: "neon-harbor", name: "Neon Harbor", avatar: 1, followers: 1_284_000, genre: "Synthwave", bio: "Ночные синтезаторы, неоновые магистрали и медленные рассветы." },
  { id: "mira-vale", name: "Mira Vale", avatar: 2, followers: 842_300, genre: "Dream Pop", bio: "Тёплый вокал поверх стеклянных гитар." },
  { id: "kaito-ren", name: "Kaito Ren", avatar: 3, followers: 512_900, genre: "Electronic", bio: "Электроника из Токио: точные ритмы и влажный воздух." },
  { id: "aster-fields", name: "Aster Fields", avatar: 4, followers: 376_100, genre: "Indie", bio: "Инди-группа из трёх человек и одного старого синтезатора." },
  { id: "lowlight", name: "Lowlight", avatar: 5, followers: 298_400, genre: "Lo-Fi", bio: "Музыка для дождливых окон." },
  { id: "sable-grove", name: "Sable Grove", avatar: 6, followers: 654_200, genre: "R&B", bio: "Бархатный ритм-н-блюз с шероховатыми краями." },
  { id: "vela-ray", name: "Vela Ray", avatar: 7, followers: 921_500, genre: "Alt Pop", bio: "Поп-музыка, которой тесно в куплетах." },
  { id: "north-arcade", name: "North Arcade", avatar: 8, followers: 187_700, genre: "Chiptune", bio: "8-битные приключения без сохранений." },
  { id: "ivy-echo", name: "Ivy & Echo", avatar: 9, followers: 142_800, genre: "Folk", bio: "Два голоса, гитара и запись у моря." },
  { id: "mono-lake", name: "Mono Lake", avatar: 10, followers: 233_600, genre: "Ambient", bio: "Долгие формы, тишина и вода." },
];

const albumDefs: AlbumDef[] = [
  {
    id: "midnight-transit",
    title: "Midnight Transit",
    artistId: "neon-harbor",
    year: 2025,
    titles: ["Last Train Home", "Chrome Rain", "Interchange", "4AM", "Neon Harbor"],
  },
  {
    id: "paper-moons",
    title: "Paper Moons",
    artistId: "mira-vale",
    year: 2024,
    titles: ["Paper Moons", "Softly, Then All At Once", "Blue Hour", "Undertow"],
  },
  {
    id: "signal-bloom",
    title: "Signal Bloom",
    artistId: "kaito-ren",
    year: 2026,
    titles: ["Signal Bloom", "Wet Concrete", "Shinjuku Static", "Half Light", "Modular Heart"],
  },
  {
    id: "golden-static",
    title: "Golden Static",
    artistId: "aster-fields",
    year: 2023,
    titles: ["Golden Static", "Backyard Cinema", "Slow Parade", "Amber Rooms"],
  },
  {
    id: "slow-hours",
    title: "Slow Hours",
    artistId: "lowlight",
    year: 2025,
    titles: ["Slow Hours", "Rain on Glass", "Tea at 3", "Dust Motes", "Late Bus"],
  },
  {
    id: "velvet-rust",
    title: "Velvet Rust",
    artistId: "sable-grove",
    year: 2024,
    titles: ["Velvet Rust", "Honey & Smoke", "Side Street", "No Rush"],
  },
  {
    id: "afterglow",
    title: "Afterglow",
    artistId: "vela-ray",
    year: 2026,
    titles: ["Afterglow", "Bright Noise", "Lucky Sore", "Polaroid", "Say It Twice"],
  },
  {
    id: "pixel-coast",
    title: "Pixel Coast",
    artistId: "north-arcade",
    year: 2022,
    titles: ["Pixel Coast", "Save Slot", "Boss Rush", "Game Over (Reprise)"],
  },
  {
    id: "wildwood",
    title: "Wildwood",
    artistId: "ivy-echo",
    year: 2021,
    titles: ["Wildwood", "Salt & Pine", "Letters Home", "Low Tide"],
  },
  {
    id: "still-water",
    title: "Still Water",
    artistId: "mono-lake",
    year: 2023,
    titles: ["Still Water I", "Still Water II", "Drift", "Shoreline"],
  },
];

const artistById = Object.fromEntries(artists.map((a) => [a.id, a]));

export const albums: Album[] = [];
export const tracks: Track[] = [];

albumDefs.forEach((def, albumIndex) => {
  const artist = artistById[def.artistId];
  const trackIds: string[] = [];
  def.titles.forEach((title, i) => {
    const id = `${def.id}-${i + 1}`;
    trackIds.push(id);
    tracks.push({
      id,
      title,
      artistId: artist.id,
      artist: artist.name,
      albumId: def.id,
      album: def.title,
      duration: 158 + ((albumIndex * 31 + i * 47) % 152),
      cover: albumIndex,
      source: "audius",
      plays: 3_000 + ((albumIndex * 911 + i * 577 + 13) % 48_000),
    });
  });
  albums.push({
    id: def.id,
    title: def.title,
    artistId: artist.id,
    artist: artist.name,
    year: def.year,
    cover: albumIndex,
    trackIds,
    source: "audius",
  });
});

const localTracks: Track[] = [
  { id: "local-1", title: "Field Recording 04", artist: "Archive", artistId: "local", album: "Home Tapes", duration: 214, cover: 7, source: "local", path: "~/Music/Home Tapes/04 - Field Recording.wav" },
  { id: "local-2", title: "Sunday Tape", artist: "Archive", artistId: "local", album: "Home Tapes", duration: 186, cover: 9, source: "local", path: "~/Music/Home Tapes/07 - Sunday Tape.flac" },
  { id: "local-3", title: "Slow Morning", artist: "M. Orlov", artistId: "local", album: "Drafts", duration: 243, cover: 4, source: "local", path: "~/Music/Drafts/02 - Slow Morning.mp3" },
  { id: "local-4", title: "Old Piano", artist: "M. Orlov", artistId: "local", album: "Drafts", duration: 191, cover: 5, source: "local", path: "~/Music/Drafts/05 - Old Piano.mp3" },
  { id: "local-5", title: "Cassette Loop", artist: "Unknown", artistId: "local", album: "Loops", duration: 168, cover: 8, source: "local", path: "~/Music/Loops/cassette_loop_02.mp3" },
  { id: "local-6", title: "Rain Window", artist: "Unknown", artistId: "local", album: "Loops", duration: 302, cover: 2, source: "local", path: "~/Music/Loops/rain_window.flac" },
];

tracks.push(...localTracks);

const allIds = tracks.map((t) => t.id);
const pick = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => allIds[(i * 7 + offset) % allIds.length]);

export const playlists: Playlist[] = [
  {
    id: "pl-night-drive",
    name: "Ночная дорога",
    description: "Синтвейв, неон и пустая трасса",
    cover: 0,
    source: "mixed",
    trackIds: ["midnight-transit-1", "midnight-transit-2", "midnight-transit-4", "signal-bloom-3", "pixel-coast-2", "afterglow-2", "velvet-rust-3", "midnight-transit-5"],
    createdAt: Date.now() - 86400000 * 40,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: "pl-focus",
    name: "Фокус",
    description: "Фоновая электроника без слов",
    cover: 1,
    source: "mixed",
    trackIds: ["signal-bloom-1", "signal-bloom-4", "still-water-1", "still-water-3", "slow-hours-1", "slow-hours-4"],
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: "pl-morning",
    name: "Утро",
    cover: 3,
    source: "mixed",
    trackIds: ["paper-moons-1", "paper-moons-3", "wildwood-1", "golden-static-2", "slow-hours-3"],
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: "pl-synth",
    name: "Синтвейв",
    cover: 5,
    source: "mixed",
    trackIds: ["midnight-transit-1", "midnight-transit-2", "midnight-transit-3", "midnight-transit-4", "pixel-coast-1", "pixel-coast-2", "pixel-coast-3"],
    createdAt: Date.now() - 86400000 * 12,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: "pl-evening",
    name: "Тихий вечер",
    cover: 8,
    source: "mixed",
    trackIds: ["paper-moons-2", "paper-moons-4", "velvet-rust-2", "velvet-rust-4", "wildwood-2"],
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 3600000 * 5,
  },
  {
    id: "pl-local",
    name: "Локальные записи",
    cover: 7,
    source: "local",
    trackIds: localTracks.map((t) => t.id),
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 3600000 * 2,
  },
];

export const mockHistory = [
  "signal-bloom-2",
  "mira-vale-paper-moons-1",
  "velvet-rust-1",
  "midnight-transit-3",
  "afterglow-4",
  "slow-hours-2",
  "paper-moons-3",
  "pixel-coast-2",
  "wildwood-1",
  "still-water-3",
].filter((id) => tracks.some((t) => t.id === id));

export const mockFavorites = [
  "midnight-transit-1",
  "paper-moons-1",
  "signal-bloom-1",
  "velvet-rust-2",
  "afterglow-1",
  "slow-hours-2",
  "wildwood-3",
  "still-water-3",
  "local-3",
];

export const localTracksList = localTracks;

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

export const topTracks = [...tracks]
  .filter((t) => t.plays)
  .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0))
  .slice(0, 8);

export const topArtists = [...artists].sort((a, b) => b.followers - a.followers).slice(0, 6);

export const waveTracks = [...tracks]
  .filter((t) => t.source === "audius")
  .sort((a, b) => ((a.id.charCodeAt(0) * 13 + a.duration) % 97) - ((b.id.charCodeAt(0) * 13 + b.duration) % 97));

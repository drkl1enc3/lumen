import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Search as SearchIcon, X } from "lucide-react";
import { searchCatalog } from "../lib/mock";
import { Chip, EmptyState, SectionHead } from "../components/ui";
import { TrackRow } from "../components/TrackRow";
import { AlbumCard, ArtistCard, PlaylistCard } from "../components/Cards";
import { cx } from "../lib/utils";
import type { Source, Track } from "../lib/types";
import { detectMediaSource, searchSource } from "../lib/sources";
import { isTauri } from "../lib/tauri";
import { useCatalog } from "../store/catalog";

type Tab = "tracks" | "albums" | "artists" | "playlists";
type SourceFilter = "all" | Source;
type RemoteState = "idle" | "loading" | "done" | "error";

function interleaveTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const youtube = tracks.filter((track) => track.source === "youtube");
  const soundcloud = tracks.filter((track) => track.source === "soundcloud");
  const other = tracks.filter(
    (track) => track.source !== "youtube" && track.source !== "soundcloud",
  );
  const merged: Track[] = [];
  const max = Math.max(youtube.length, soundcloud.length);
  for (let index = 0; index < max; index += 1) {
    if (youtube[index]) merged.push(youtube[index]);
    if (soundcloud[index]) merged.push(soundcloud[index]);
  }
  merged.push(...other);
  return merged.filter((track) => {
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}

export function SearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("tracks");
  const [source, setSource] = useState<SourceFilter>("all");
  const [recent, setRecent] = useState<string[]>(["Neon Harbor", "Paper Moons", "Kaito Ren"]);
  const [remoteTracks, setRemoteTracks] = useState<Track[]>([]);
  const [remoteState, setRemoteState] = useState<RemoteState>("idle");
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const remoteWanted =
    source === "all" || source === "soundcloud" || source === "youtube";

  useEffect(() => {
    if (source !== "all") setTab("tracks");
  }, [source]);

  useEffect(() => {
    const text = query.trim();
    if (!isTauri || text.length < 2 || !remoteWanted) {
      requestSeq.current += 1;
      setRemoteTracks([]);
      setRemoteState("idle");
      setRemoteError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      const request = ++requestSeq.current;
      setRemoteState("loading");
      setRemoteError(null);

      const detected = detectMediaSource(text);
      const targets: Array<"youtube" | "soundcloud"> = detected
        ? [detected]
        : source === "all"
          ? ["youtube", "soundcloud"]
          : [source as "youtube" | "soundcloud"];
      const limit = detected ? 1 : source === "all" ? 10 : 18;

      const settled = await Promise.allSettled(
        targets.map((target) => searchSource(text, target, limit)),
      );
      if (requestSeq.current !== request) return;

      const tracks: Track[] = [];
      const errors: string[] = [];
      for (const result of settled) {
        if (result.status === "fulfilled") tracks.push(...result.value);
        else errors.push(String(result.reason));
      }

      const merged = interleaveTracks(tracks);
      useCatalog.getState().upsert(merged);
      setRemoteTracks(merged);
      setRemoteState(errors.length === settled.length ? "error" : "done");
      setRemoteError(errors.length ? errors.join(" · ") : null);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [query, source, remoteWanted]);

  const localResults = useMemo(() => {
    const base = searchCatalog(query);
    if (source === "all") return base;
    if (source === "audius") {
      return {
        ...base,
        tracks: base.tracks.filter((track) => track.source === "audius"),
        albums: base.albums.filter((album) => album.source === "audius"),
        playlists: base.playlists.filter(
          (playlist) => playlist.source === "audius" || playlist.source === "mixed",
        ),
      };
    }
    if (source === "local") {
      return {
        ...base,
        tracks: base.tracks.filter((track) => track.source === "local"),
        albums: base.albums.filter((album) => album.source === "local"),
        artists: [],
        playlists: base.playlists.filter(
          (playlist) => playlist.source === "local" || playlist.source === "mixed",
        ),
      };
    }
    return { tracks: [], albums: [], artists: [], playlists: [] };
  }, [query, source]);

  const urlSource = detectMediaSource(query.trim());
  const remoteResults = useMemo(
    () =>
      source === "all" || urlSource
        ? remoteTracks
        : remoteTracks.filter((track) => track.source === source),
    [remoteTracks, source, urlSource],
  );

  const results = useMemo(
    () => ({ ...localResults, tracks: [...localResults.tracks, ...remoteResults] }),
    [localResults, remoteResults],
  );

  const total =
    results.tracks.length + results.albums.length + results.artists.length + results.playlists.length;

  const allTabs: { id: Tab; label: string; count: number }[] = [
    { id: "tracks", label: t("common.tracks"), count: results.tracks.length },
    { id: "albums", label: t("common.albums"), count: results.albums.length },
    { id: "artists", label: t("common.artists"), count: results.artists.length },
    { id: "playlists", label: t("common.playlists"), count: results.playlists.length },
  ];
  const tabs = allTabs.filter((item) => remoteWanted || item.id === "tracks");

  const sources: { id: SourceFilter; label: string }[] = [
    { id: "all", label: t("search.allSources") },
    { id: "soundcloud", label: t("search.soundcloud") },
    { id: "youtube", label: t("search.youtube") },
    { id: "audius", label: t("search.audius") },
    { id: "local", label: t("search.local") },
  ];

  const submit = () => {
    const q = query.trim();
    if (q && !recent.includes(q)) setRecent((value) => [q, ...value].slice(0, 6));
  };

  return (
    <div className="page search-page">
      <h1 className="page-title">{t("search.title")}</h1>

      <div className="search-bar">
        <SearchIcon size={18} className="search-bar-icon" />
        <input
          id="global-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={t("search.placeholder")}
          autoComplete="off"
        />
        {query ? (
          <button className="search-clear" aria-label={t("search.clear")} onClick={() => setQuery("")}>
            <X size={16} />
          </button>
        ) : (
          <kbd className="search-kbd">Ctrl K</kbd>
        )}
      </div>

      <div className="search-filters">
        {sources.map((item) => (
          <Chip key={item.id} active={source === item.id} onClick={() => setSource(item.id)}>
            {item.label}
          </Chip>
        ))}
      </div>

      {(remoteState === "loading" ||
        remoteError ||
        (!isTauri && query.trim() && remoteWanted)) && (
        <div className={cx("search-network-note", remoteError && "is-error")}>
          {remoteState === "loading" ? (
            <>
              <Loader2 size={14} className="spin" />
              {t("search.networkSearching")}
            </>
          ) : remoteError ? (
            <>{t("search.networkError")}: {remoteError}</>
          ) : (
            <>{t("search.networkOnlyApp")}</>
          )}
        </div>
      )}

      {!query.trim() ? (
        <>
          <SectionHead
            action={
              <button className="link-button" onClick={() => setRecent([])}>
                {t("search.clear")}
              </button>
            }
          >
            {t("search.recent")}
          </SectionHead>
          <div className="recent-queries">
            {recent.map((item) => (
              <button key={item} className="recent-query" onClick={() => setQuery(item)}>
                <SearchIcon size={13} />
                {item}
              </button>
            ))}
          </div>
          <EmptyState
            icon={<SearchIcon size={26} />}
            title={t("search.emptyTitle")}
            hint={t("search.emptyHint")}
          />
        </>
      ) : total === 0 && remoteState === "loading" ? (
        <div className="search-loading-list">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className="search-skeleton" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={<SearchIcon size={26} />}
          title={t("search.noResults")}
          hint={t("search.noResultsHint")}
        />
      ) : (
        <>
          <div className="search-tabs">
            {tabs.map((item) => (
              <button
                key={item.id}
                className={cx("search-tab", tab === item.id && "is-active")}
                onClick={() => setTab(item.id)}
              >
                {item.label}
                <span>{item.count}</span>
              </button>
            ))}
            <span className="search-result-note">
              {t("search.resultsFor")} «{query.trim()}»
            </span>
          </div>

          {tab === "tracks" && (
            <div className="track-list">
              {results.tracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index}
                  context={results.tracks}
                  showAlbum
                  showSource
                />
              ))}
              {results.tracks.length === 0 && <p className="list-empty">{t("common.empty")}</p>}
            </div>
          )}

          {tab === "albums" && (
            <div className="media-grid">
              {results.albums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          )}

          {tab === "artists" && (
            <div className="media-grid">
              {results.artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          )}

          {tab === "playlists" && (
            <div className="media-grid">
              {results.playlists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

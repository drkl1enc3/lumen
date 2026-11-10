import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search as SearchIcon, X } from "lucide-react";
import { searchCatalog } from "../lib/mock";
import { Chip, EmptyState, SectionHead } from "../components/ui";
import { TrackRow } from "../components/TrackRow";
import { AlbumCard, ArtistCard, PlaylistCard } from "../components/Cards";
import { cx } from "../lib/utils";

type Tab = "tracks" | "albums" | "artists" | "playlists";
type SourceFilter = "all" | "audius" | "local";

export function SearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("tracks");
  const [source, setSource] = useState<SourceFilter>("all");
  const [recent, setRecent] = useState<string[]>(["Neon Harbor", "Paper Moons", "Kaito Ren"]);

  const results = useMemo(() => {
    const base = searchCatalog(query);
    if (source === "all") return base;
    return {
      ...base,
      tracks: base.tracks.filter((tr) => tr.source === source),
      albums: base.albums.filter((a) => a.source === source),
      artists: source === "local" ? [] : base.artists,
      playlists: base.playlists.filter((p) => p.source === source || p.source === "mixed"),
    };
  }, [query, source]);

  const total =
    results.tracks.length + results.albums.length + results.artists.length + results.playlists.length;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "tracks", label: t("common.tracks"), count: results.tracks.length },
    { id: "albums", label: t("common.albums"), count: results.albums.length },
    { id: "artists", label: t("common.artists"), count: results.artists.length },
    { id: "playlists", label: t("common.playlists"), count: results.playlists.length },
  ];

  const sources: { id: SourceFilter; label: string }[] = [
    { id: "all", label: t("search.allSources") },
    { id: "audius", label: t("search.audius") },
    { id: "local", label: t("search.local") },
  ];

  const submit = () => {
    const q = query.trim();
    if (q && !recent.includes(q)) setRecent((r) => [q, ...r].slice(0, 6));
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
        {sources.map((s) => (
          <Chip key={s.id} active={source === s.id} onClick={() => setSource(s.id)}>
            {s.label}
          </Chip>
        ))}
      </div>

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
            {recent.map((r) => (
              <button key={r} className="recent-query" onClick={() => setQuery(r)}>
                <SearchIcon size={13} />
                {r}
              </button>
            ))}
          </div>
          <EmptyState
            icon={<SearchIcon size={26} />}
            title={t("search.emptyTitle")}
            hint={t("search.emptyHint")}
          />
        </>
      ) : total === 0 ? (
        <EmptyState
          icon={<SearchIcon size={26} />}
          title={t("search.noResults")}
          hint={t("search.noResultsHint")}
        />
      ) : (
        <>
          <div className="search-tabs">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                className={cx("search-tab", tab === tb.id && "is-active")}
                onClick={() => setTab(tb.id)}
              >
                {tb.label}
                <span>{tb.count}</span>
              </button>
            ))}
            <span className="search-result-note">
              {t("search.resultsFor")} «{query.trim()}»
            </span>
          </div>

          {tab === "tracks" && (
            <div className="track-list">
              {results.tracks.map((tr, i) => (
                <TrackRow
                  key={tr.id}
                  track={tr}
                  index={i}
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
              {results.albums.map((a) => (
                <AlbumCard key={a.id} album={a} />
              ))}
            </div>
          )}

          {tab === "artists" && (
            <div className="media-grid">
              {results.artists.map((a) => (
                <ArtistCard key={a.id} artist={a} />
              ))}
            </div>
          )}

          {tab === "playlists" && (
            <div className="media-grid">
              {results.playlists.map((p) => (
                <PlaylistCard key={p.id} playlist={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

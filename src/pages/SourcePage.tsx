import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cloud, Loader2, Play, Search as SearchIcon, Youtube } from "lucide-react";
import { Chip, EmptyState, SectionHead } from "../components/ui";
import { TrackRow } from "../components/TrackRow";
import { resolveTracks } from "../lib/catalog";
import { detectMediaSource, searchSource } from "../lib/sources";
import { isTauri } from "../lib/tauri";
import type { Track } from "../lib/types";
import { useCatalog } from "../store/catalog";
import { useLibrary } from "../store/library";
import { usePlayer } from "../store/player";
import { useSources } from "../store/sources";
import { cx } from "../lib/utils";

const genres = [
  { key: "source.genreElectronic", query: "electronic music" },
  { key: "source.genreLofi", query: "lofi hip hop" },
  { key: "source.genreHiphop", query: "hip hop" },
  { key: "source.genreRock", query: "rock music" },
  { key: "source.genreJazz", query: "jazz" },
  { key: "source.genreClassical", query: "classical music" },
] as const;

export function SourcePage({ source }: { source: "youtube" | "soundcloud" }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const play = usePlayer((state) => state.play);
  const recentIds = useLibrary((state) => state.recent);
  const favoriteIds = useLibrary((state) => state.favorites);
  const status = useSources((state) => state.status);

  const recent = useMemo(
    () => resolveTracks(recentIds).filter((track) => track.source === source).slice(0, 10),
    [recentIds, source],
  );
  const favorites = useMemo(
    () => resolveTracks(favoriteIds).filter((track) => track.source === source).slice(0, 10),
    [favoriteIds, source],
  );

  const Icon = source === "youtube" ? Youtube : Cloud;
  const label = source === "youtube" ? t("search.youtube") : t("search.soundcloud");
  const description =
    source === "youtube" ? t("source.youtubeHint") : t("source.soundcloudHint");

  const runSearch = async (text: string) => {
    const value = text.trim();
    if (!value) return;
    setQuery(value);
    setSearched(true);
    setError(null);

    if (!isTauri) {
      setError(t("search.networkOnlyApp"));
      setResults([]);
      return;
    }

    const detected = detectMediaSource(value);
    if (detected && detected !== source) {
      setError(t("source.wrongUrl"));
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const tracks = await searchSource(value, source, 18);
      useCatalog.getState().upsert(tracks);
      setResults(tracks);
    } catch (searchError) {
      setResults([]);
      setError(String(searchError));
    } finally {
      setLoading(false);
    }
  };

  const missingTools = status
    ? [
        !status.ytdlp ? "yt-dlp" : null,
        !status.ffmpeg ? "ffmpeg" : null,
        !status.mpv ? "mpv" : null,
      ].filter((item): item is string => Boolean(item))
    : [];

  const renderTracks = (tracks: Track[], withSource = false) => (
    <div className="track-list">
      {tracks.map((track, index) => (
        <TrackRow
          key={track.id}
          track={track}
          index={index}
          context={tracks}
          showSource={withSource}
        />
      ))}
    </div>
  );

  return (
    <div className={cx("page source-page", `source-page-${source}`)}>
      <section className={cx("source-hero", `is-${source}`)}>
        <span className="source-hero-icon">
          <Icon size={28} />
        </span>
        <div className="source-hero-text">
          <h1>{label}</h1>
          <p>{description}</p>
        </div>
        <span className="source-hero-badge">{label}</span>
      </section>

      {missingTools.length > 0 && (
        <div className="search-network-note is-error">
          {t("source.depsMissing")}: {missingTools.join(", ")}
        </div>
      )}

      <form
        className="search-bar source-search"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(query);
        }}
      >
        <SearchIcon size={18} className="search-bar-icon" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("source.searchPlaceholder", { source: label })}
          autoComplete="off"
        />
        {loading ? <Loader2 size={17} className="spin" /> : null}
        <button
          type="submit"
          className="btn btn-primary btn-sm source-search-btn"
          disabled={loading || !query.trim()}
        >
          {t("source.searchAction")}
        </button>
      </form>

      <div className="source-genres">
        {genres.map((genre) => (
          <Chip key={genre.key} onClick={() => void runSearch(genre.query)}>
            {t(genre.key)}
          </Chip>
        ))}
      </div>

      {error && <div className="search-network-note is-error">{error}</div>}

      {loading ? (
        <div className="search-loading-list">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className="search-skeleton" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <>
          <SectionHead
            action={
              <button className="btn btn-primary btn-sm" onClick={() => play(results, 0)}>
                <Play size={14} fill="currentColor" />
                {t("common.playAll")}
              </button>
            }
          >
            {t("source.results")} · {results.length}
          </SectionHead>
          {renderTracks(results)}
        </>
      ) : searched && !error ? (
        <EmptyState
          icon={<SearchIcon size={26} />}
          title={t("search.noResults")}
          hint={t("search.noResultsHint")}
        />
      ) : (
        <>
          {recent.length > 0 && (
            <>
              <SectionHead>{t("source.recent")}</SectionHead>
              {renderTracks(recent)}
            </>
          )}
          {favorites.length > 0 && (
            <>
              <SectionHead>{t("source.favorites")}</SectionHead>
              {renderTracks(favorites)}
            </>
          )}
          {recent.length === 0 && favorites.length === 0 && (
            <EmptyState
              icon={<Icon size={26} />}
              title={t("source.emptyTitle", { source: label })}
              hint={t("source.emptyHint")}
            />
          )}
        </>
      )}
    </div>
  );
}

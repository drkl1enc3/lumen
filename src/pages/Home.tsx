import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Clock3, Cloud, Heart, Play, Sparkles, TrendingUp, Users, Waves, Youtube } from "lucide-react";
import { albumByIdMap, artistByIdMap, waveTracks, tracks as allTracks } from "../lib/mock";
import { resolveTracks } from "../lib/catalog";
import { useLibrary } from "../store/library";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { formatCount, formatLongTime, pluralTracks } from "../lib/utils";
import { Cover, SectionHead } from "../components/ui";
import { PlaylistCard } from "../components/Cards";
import { playlists as seedPlaylists } from "../lib/mock";

export function Home() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const play = usePlayer((s) => s.play);
  const playTrack = usePlayer((s) => s.playTrack);
  const toast = useUI((s) => s.toast);
  const setListenTogether = useUI((s) => s.setListenTogether);

  const recentIds = useLibrary((s) => s.recent);
  const favoritesIds = useLibrary((s) => s.favorites);
  const stats = useLibrary((s) => s.stats);
  const userPlaylists = useLibrary((s) => s.playlists);

  const recent = resolveTracks(recentIds.slice(0, 10));
  const favorites = resolveTracks(favoritesIds);
  const waveReady = recentIds.length >= 5;

  const topEntries = Object.entries(stats)
    .map(([id, plays]) => ({ track: resolveTracks([id])[0], plays }))
    .filter((x) => x.track)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 4);

  const artistPlays = new Map<string, number>();
  topEntries.forEach(({ track, plays }) => {
    if (!track) return;
    artistPlays.set(track.artistId, (artistPlays.get(track.artistId) ?? 0) + plays);
  });
  const topArtists = [...artistPlays.entries()]
    .map(([id, plays]) => ({ artist: artistByIdMap.get(id), plays }))
    .filter((x) => x.artist)
    .slice(0, 4);

  const albumPlays = new Map<string, number>();
  topEntries.forEach(({ track, plays }) => {
    if (!track?.albumId) return;
    albumPlays.set(track.albumId, (albumPlays.get(track.albumId) ?? 0) + plays);
  });
  const topAlbums = [...albumPlays.entries()]
    .map(([id, plays]) => ({ album: albumByIdMap.get(id), plays }))
    .filter((x) => x.album)
    .slice(0, 3);

  const totalPlays = Object.values(stats).reduce((a, b) => a + b, 0);
  const totalMinutes = recent.reduce((a, t) => a + t.duration, 0);
  const maxPlays = Math.max(...Object.values(stats), 1);

  const startWave = () => {
    play(waveTracks, 0, { shuffle: true });
    toast(t("toast.waveStarted"), "success");
  };

  return (
    <div className="page home-page">
      <section className="wave-hero" onClick={startWave}>
        <button className="wave-play" aria-label={t("common.play")}>
          <Play size={18} fill="currentColor" />
        </button>
        <div className="wave-text">
          <h1>{t("home.waveTitle")}</h1>
          <p>{waveReady ? t("home.waveReady") : t("home.waveHint")}</p>
        </div>
        <span className="wave-art" title={t("home.waveTooltip")}>
          <Waves size={26} />
        </span>
        <span className="wave-glow" />
      </section>

      <section className="together-card" onClick={() => setListenTogether(true)}>
        <span className="together-card-icon">
          <Users size={22} />
        </span>
        <div className="together-card-text">
          <h3>{t("home.listenTogether")}</h3>
          <p>{t("home.listenTogetherHint")}</p>
        </div>
        <button className="btn btn-glass" onClick={(e) => { e.stopPropagation(); setListenTogether(true); }}>
          <Users size={15} />
          {t("home.createOrJoin")}
        </button>
      </section>

      <div className="home-split">
        <button className="home-tile" onClick={() => navigate("/history")}>
          <span className="home-tile-icon">
            <Clock3 size={21} />
          </span>
          <span className="home-tile-text">
            <span className="home-tile-title">{t("home.history")}</span>
            <span className="home-tile-sub">{t("home.historyHint")}</span>
          </span>
          <span className="home-tile-count">{recent.length || ""}</span>
        </button>
        <button className="home-tile" onClick={() => navigate("/library/favorites")}>
          <span className="home-tile-icon">
            <Heart size={21} />
          </span>
          <span className="home-tile-text">
            <span className="home-tile-title">{t("home.favorites")}</span>
            <span className="home-tile-sub">{t("home.favoritesHint")}</span>
          </span>
          <span className="home-tile-count">{favorites.length || ""}</span>
        </button>
      </div>

      <SectionHead>{t("home.sources")}</SectionHead>
      <div className="source-hub-grid">
        <Link to="/source/soundcloud" className="source-hub-card is-soundcloud">
          <span className="source-hub-icon">
            <Cloud size={24} />
          </span>
          <span className="source-hub-text">
            <strong>SoundCloud</strong>
            <small>{t("home.soundcloudHint")}</small>
          </span>
          <ArrowRight size={17} className="source-hub-arrow" />
        </Link>
        <Link to="/source/youtube" className="source-hub-card is-youtube">
          <span className="source-hub-icon">
            <Youtube size={24} />
          </span>
          <span className="source-hub-text">
            <strong>YouTube</strong>
            <small>{t("home.youtubeHint")}</small>
          </span>
          <ArrowRight size={17} className="source-hub-arrow" />
        </Link>
      </div>

      <SectionHead
        action={
          <button className="link-button" onClick={() => navigate("/library")}>
            {t("common.showAll")}
            <ArrowRight size={14} />
          </button>
        }
      >
        {t("home.tops")}
      </SectionHead>

      <div className="tops-grid">
        <div className="top-card">
          <div className="top-card-head">
            <span>
              <TrendingUp size={14} />
              {t("home.topTracks")}
            </span>
          </div>
          <div className="top-card-body">
            {topEntries.length ? (
              topEntries.map(({ track, plays }, i) => (
                <button key={track.id} className="top-row" onClick={() => playTrack(track!, [track!, ...topEntries.slice(1).map((x) => x.track!)])}>
                  <span className="top-rank">{i + 1}</span>
                  <Cover seed={track.cover} src={track.artwork} className="top-cover" />
                  <span className="top-text">
                    <span className="top-title">{track.title}</span>
                    <span className="top-sub">{track.artist}</span>
                  </span>
                  <span className="top-plays">{formatCount(plays)}</span>
                </button>
              ))
            ) : (
              <p className="top-empty">{t("home.nothingYet")}</p>
            )}
          </div>
        </div>

        <div className="top-card">
          <div className="top-card-head">
            <span>
              <Users size={14} />
              {t("home.topArtists")}
            </span>
          </div>
          <div className="top-card-body">
            {topArtists.length ? (
              topArtists.map(({ artist, plays }, i) => (
                <button key={artist!.id} className="top-row" onClick={() => navigate(`/artist/${artist!.id}`)}>
                  <span className="top-rank">{i + 1}</span>
                  <Cover seed={artist!.avatar} className="top-cover is-round" />
                  <span className="top-text">
                    <span className="top-title">{artist!.name}</span>
                    <span className="top-sub">{artist!.genre}</span>
                  </span>
                  <span className="top-plays">{plays}</span>
                </button>
              ))
            ) : (
              <p className="top-empty">{t("home.nothingYet")}</p>
            )}
          </div>
        </div>

        <div className="top-card">
          <div className="top-card-head">
            <span>
              <Sparkles size={14} />
              {t("home.topAlbums")}
            </span>
          </div>
          <div className="top-card-body">
            {topAlbums.length ? (
              topAlbums.map(({ album, plays }, i) => (
                <button key={album!.id} className="top-row" onClick={() => navigate(`/album/${album!.id}`)}>
                  <span className="top-rank">{i + 1}</span>
                  <Cover seed={album!.cover} className="top-cover" />
                  <span className="top-text">
                    <span className="top-title">{album!.title}</span>
                    <span className="top-sub">{album!.artist}</span>
                  </span>
                  <span className="top-plays">{plays}</span>
                </button>
              ))
            ) : (
              <p className="top-empty">{t("home.nothingYet")}</p>
            )}
          </div>
        </div>

        <div className="top-card">
          <div className="top-card-head">
            <span>
              <Clock3 size={14} />
              {t("home.listening")}
            </span>
          </div>
          <div className="top-card-body stats-card">
            <div className="stats-big">
              <strong>{totalPlays}</strong>
              <span>{i18n.language === "ru" ? "прослушиваний" : i18n.language === "uk" ? "прослуховувань" : "plays"}</span>
            </div>
            <div className="stats-bars" aria-hidden>
              {[38, 62, 44, 78, 56, 88, 70].map((h, i) => (
                <span key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="stats-foot">
              <span>{formatLongTime(totalMinutes)}</span>
              <span>
                {topEntries[0]?.track
                  ? `${t("home.recently")}: ${topEntries[0].track.title}`
                  : t("home.nothingYet")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {recent.length > 0 && (
        <>
          <SectionHead
            action={
              <Link className="link-button" to="/library/favorites">
                {t("common.showAll")}
                <ArrowRight size={14} />
              </Link>
            }
          >
            {t("home.recently")}
          </SectionHead>
          <div className="recent-strip">
            {recent.slice(0, 7).map((track) => (
              <button key={track.id} className="recent-card" onClick={() => playTrack(track, recent)}>
                <Cover seed={track.cover} src={track.artwork} className="recent-cover">
                  <span className="card-play">
                    <Play size={18} fill="currentColor" />
                  </span>
                </Cover>
                <span className="recent-title">{track.title}</span>
                <span className="recent-sub">{track.artist}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <SectionHead>{t("common.playlists")}</SectionHead>
      <div className="media-grid">
        {userPlaylists.slice(0, 6).map((p) => (
          <PlaylistCard key={p.id} playlist={p} />
        ))}
      </div>
      <div className="home-footnote">
        {pluralTracks(allTracks.length, i18n.language)} · {seedPlaylists.length}{" "}
        {i18n.language === "ru" ? "плейлистов" : "playlists"}
      </div>
    </div>
  );
}

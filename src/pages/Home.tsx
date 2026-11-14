import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Clock3, Cloud, Headphones, Heart, Play, Plus, Users, Waves, Youtube } from "lucide-react";
import { waveTracks } from "../lib/mock";
import { resolveTracks } from "../lib/catalog";
import { useLibrary } from "../store/library";
import { useLocal } from "../store/local";
import { usePlayer } from "../store/player";
import { useUI } from "../store/ui";
import { formatLongTime } from "../lib/utils";
import { Cover, SectionHead } from "../components/ui";
import { PlaylistCard } from "../components/Cards";

export function Home() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const play = usePlayer((s) => s.play);
  const playTrack = usePlayer((s) => s.playTrack);
  const toast = useUI((s) => s.toast);
  const setListenTogether = useUI((s) => s.setListenTogether);
  const setCreatePlaylist = useUI((s) => s.setCreatePlaylist);

  const recentIds = useLibrary((s) => s.recent);
  const favoritesIds = useLibrary((s) => s.favorites);
  const stats = useLibrary((s) => s.stats);
  const userPlaylists = useLibrary((s) => s.playlists);
  const localTracks = useLocal((s) => s.tracks);
  const wave = waveTracks.length ? waveTracks : localTracks.slice(0, 30);

  const recent = resolveTracks(recentIds.slice(0, 10));
  const favorites = resolveTracks(favoritesIds);
  const waveReady = recentIds.length >= 5;

  const totalPlays = Object.values(stats).reduce((a, b) => a + b, 0);
  const totalMinutes = recent.reduce((a, t) => a + t.duration, 0);

  const startWave = () => {
    if (!wave.length) {
      toast(t("home.waveEmpty"));
      navigate("/search");
      return;
    }
    play(wave, 0, { shuffle: true });
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
        {wave.length > 0 && <span className="wave-count">{wave.length}</span>}
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

      <section className="listening-card">
        <span className="listening-card-icon">
          <Headphones size={22} />
        </span>
        <div className="listening-card-main">
          <span className="listening-card-label">{t("home.listening")}</span>
          <div className="listening-card-value">
            <strong>{totalPlays}</strong>
            <span>
              {i18n.language === "ru"
                ? "прослушиваний"
                : i18n.language === "uk"
                  ? "прослуховувань"
                  : "plays"}
              {" · "}
              {formatLongTime(totalMinutes, i18n.language)}
            </span>
          </div>
          <span className="listening-card-last">
            {recent[0] ? `${t("home.recently")}: ${recent[0].title}` : t("home.nothingYet")}
          </span>
        </div>
        <div className="listening-card-bars stats-bars" aria-hidden>
          {[38, 62, 44, 78, 56, 88, 70].map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      </section>

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
        {userPlaylists.length === 0 && (
          <button className="media-card create-card" onClick={() => setCreatePlaylist(true)}>
            <span className="create-card-icon">
              <Plus size={26} />
            </span>
            <span className="media-card-title">{t("library.newPlaylist")}</span>
            <span className="media-card-sub">{t("library.emptyPlaylistsHint")}</span>
          </button>
        )}
        {userPlaylists.slice(0, 6).map((p) => (
          <PlaylistCard key={p.id} playlist={p} />
        ))}
      </div>
    </div>
  );
}

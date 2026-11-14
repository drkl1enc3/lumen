import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../store/player";
import { useSettings } from "../store/settings";
import { useUI } from "../store/ui";
import { useLocal } from "../store/local";
import { isTauri } from "../lib/tauri";
import { isPlayableTrack, resolveTrack } from "../lib/catalog";
import {
  discordConnect,
  discordDisconnect,
  discordUpdate,
  lastfmNowPlaying,
  lastfmScrobble,
  getDeepLinkCurrent,
  onDeepLink,
  onMediaControl,
  onSecondInstance,
  onTrayAction,
  quitApp,
  setAudioFilters,
  setGapless,
  setMediaEnabled,
  setTrayEnabled,
  updateMedia,
} from "../lib/integrations";
import { checkForUpdates } from "../lib/updater";
import { flushPersistence } from "../lib/persist";

function handleDeepLink(url: string) {
  if (!useSettings.getState().deeplinks) return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.protocol !== "lumen:") return;
  const parts = parsed.pathname.split("/").filter(Boolean);
  const host = parsed.hostname;
  const kind = host || parts.shift() || "";
  const value = parts.join("/");
  if (kind === "track" && value) {
    const track = resolveTrack(decodeURIComponent(value));
    if (track) usePlayer.getState().playTrack(track);
    else useUI.getState().toast("Трек не найден", "error");
  } else if (kind === "playlist" && value) {
    window.location.hash = `#/playlist/${encodeURIComponent(value)}`;
  } else if (kind === "artist" && value) {
    window.location.hash = `#/artist/${encodeURIComponent(value)}`;
  } else if (kind === "search") {
    window.location.hash = "#/search";
  }
}

export function useIntegrations() {
  const track = usePlayer((state) => state.queue[state.index]);
  const playing = usePlayer((state) => state.playing);
  const volume = usePlayer((state) => state.volume);
  const mpris = useSettings((state) => state.mpris);
  const tray = useSettings((state) => state.tray);
  const discord = useSettings((state) => state.discord);
  const discordAppId = useSettings((state) => state.discordAppId);
  const discordShowTrack = useSettings((state) => state.discordShowTrack);
  const lastfm = useSettings((state) => state.lastfm);
  const lastfmApiKey = useSettings((state) => state.lastfmApiKey);
  const lastfmApiSecret = useSettings((state) => state.lastfmApiSecret);
  const lastfmSessionKey = useSettings((state) => state.lastfmSessionKey);
  const normalize = useSettings((state) => state.normalize);
  const equalizerEnabled = useSettings((state) => state.equalizerEnabled);
  const equalizerBands = useSettings((state) => state.equalizerBands);
  const gapless = useSettings((state) => state.gapless);
  const autostart = useSettings((state) => state.autostart);
  const checkUpdates = useSettings((state) => state.checkUpdates);
  const toast = useUI((state) => state.toast);

  const [mediaReady, setMediaReady] = useState(false);
  const [discordReady, setDiscordReady] = useState(false);
  const nowPlayingRef = useRef<string | null>(null);
  const scrobbleRef = useRef<{ trackId: string; startedAt: number; done: boolean }>({
    trackId: "",
    startedAt: 0,
    done: false,
  });
  const lastfmErrorRef = useRef("");
  const discordErrorRef = useRef("");
  const updateCheckedRef = useRef(false);

  useEffect(() => {
    if (!isTauri) return;
    void setMediaEnabled(mpris)
      .then(() => setMediaReady(mpris))
      .catch(() => setMediaReady(false));
  }, [mpris]);

  useEffect(() => {
    if (!isTauri || !mpris || !mediaReady) return;
    void updateMedia({
      playing,
      title: track?.title ?? null,
      artist: track?.artist ?? null,
      album: track?.album ?? null,
      duration: track?.duration ?? null,
      volume,
      cover: track?.artwork?.startsWith("http") ? track.artwork : null,
    }).catch(() => undefined);
  }, [mpris, mediaReady, track?.id, track?.title, track?.artist, track?.album, track?.duration, track?.artwork, playing, volume]);

  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    void onMediaControl((event) => {
      const player = usePlayer.getState();
      switch (event.action) {
        case "play":
          if (!player.playing) player.toggle();
          break;
        case "pause":
          if (player.playing) player.pause();
          break;
        case "toggle":
          player.toggle();
          break;
        case "next":
          player.next();
          break;
        case "prev":
          player.prev();
          break;
        case "stop":
          player.pause();
          break;
        case "seek":
          if (typeof event.position === "number") player.seek(event.position);
          break;
        case "seekBy":
          if (typeof event.delta === "number") player.seekBy(event.delta);
          break;
        default:
          break;
      }
    }).then((stop) => {
      unlisten = stop;
    });
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    void setTrayEnabled(tray).catch(() => undefined);
  }, [tray]);

  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    void onTrayAction((action) => {
      const player = usePlayer.getState();
      if (action === "toggle") player.toggle();
      else if (action === "next") player.next();
      else if (action === "prev") player.prev();
      else if (action === "quit") {
        player.syncResumePosition();
        void flushPersistence().finally(() => {
          void quitApp().catch(() => undefined);
        });
      }
    }).then((stop) => {
      unlisten = stop;
    });
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    if (!discord) {
      setDiscordReady(false);
      void discordDisconnect().catch(() => undefined);
      return;
    }
    if (!discordAppId.trim()) {
      setDiscordReady(false);
      return;
    }
    void discordConnect(discordAppId)
      .then(() => {
        discordErrorRef.current = "";
        setDiscordReady(true);
      })
      .catch((error) => {
        setDiscordReady(false);
        const message = String(error);
        if (discordErrorRef.current !== message) {
          discordErrorRef.current = message;
          toast(message, "error");
        }
      });
  }, [discord, discordAppId, toast]);

  useEffect(() => {
    if (!isTauri || !discord || !discordAppId.trim() || discordReady) return;
    const timer = window.setInterval(() => {
      void discordConnect(discordAppId)
        .then(() => setDiscordReady(true))
        .catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [discord, discordAppId, discordReady]);

  useEffect(() => {
    if (!isTauri || !discord || !discordReady) return;
    void discordUpdate({
      title: track?.title ?? null,
      artist: track?.artist ?? null,
      album: track?.album ?? null,
      playing,
      showTrack: discordShowTrack,
    }).catch(() => undefined);
  }, [discord, discordReady, discordShowTrack, track?.id, track?.title, track?.artist, track?.album, playing]);

  useEffect(() => {
    if (!isTauri || !lastfm || !lastfmSessionKey || !track || !isPlayableTrack(track)) return;
    if (!playing) {
      nowPlayingRef.current = null;
      return;
    }
    if (nowPlayingRef.current === track.id) return;
    nowPlayingRef.current = track.id;
    void lastfmNowPlaying(
      lastfmApiKey,
      lastfmApiSecret,
      lastfmSessionKey,
      track,
    ).catch((error) => {
      const message = String(error);
      if (lastfmErrorRef.current !== message) {
        lastfmErrorRef.current = message;
        toast(message, "error");
      }
    });
  }, [lastfm, lastfmSessionKey, lastfmApiKey, lastfmApiSecret, track?.id, playing, toast]);

  useEffect(() => {
    if (!track) return;
    if (scrobbleRef.current.trackId !== track.id) {
      scrobbleRef.current = {
        trackId: track.id,
        startedAt: Math.floor(Date.now() / 1000),
        done: false,
      };
    }
  }, [track?.id]);

  useEffect(() => {
    if (!isTauri || !lastfm || !lastfmSessionKey) return;
    const timer = window.setInterval(() => {
      const state = usePlayer.getState();
      const current = state.queue[state.index];
      if (!current || !state.playing || !isPlayableTrack(current)) return;
      if (scrobbleRef.current.trackId !== current.id) {
        scrobbleRef.current = {
          trackId: current.id,
          startedAt: Math.floor(Date.now() / 1000),
          done: false,
        };
      }
      if (scrobbleRef.current.done) return;
      const threshold = current.duration > 0 ? Math.min(current.duration * 0.5, 240) : 240;
      if (state.progress < threshold) return;
      scrobbleRef.current.done = true;
      void lastfmScrobble(
        lastfmApiKey,
        lastfmApiSecret,
        lastfmSessionKey,
        current,
        scrobbleRef.current.startedAt,
      ).catch((error) => {
        const message = String(error);
        if (lastfmErrorRef.current !== message) {
          lastfmErrorRef.current = message;
          toast(message, "error");
        }
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lastfm, lastfmSessionKey, lastfmApiKey, lastfmApiSecret, toast]);

  useEffect(() => {
    if (!isTauri) return;
    void setAudioFilters(normalize, equalizerEnabled, equalizerBands).catch(() => undefined);
  }, [normalize, equalizerEnabled, equalizerBands]);

  useEffect(() => {
    if (!isTauri) return;
    void setGapless(gapless).catch(() => undefined);
  }, [gapless]);

  useEffect(() => {
    if (!isTauri) return;
    void import("@tauri-apps/plugin-autostart")
      .then(async ({ enable, disable }) => {
        if (autostart) await enable();
        else await disable();
      })
      .catch(() => undefined);
  }, [autostart]);

  useEffect(() => {
    if (!isTauri) return;
    const local = useLocal.getState();
    if (!local.folders.length) return;
    const stale = !local.lastScan || Date.now() - local.lastScan > 6 * 60 * 60 * 1000;
    if (!local.tracks.length || stale) void local.scan();
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    let first: (() => void) | undefined;
    let second: (() => void) | undefined;
    void onDeepLink((urls) => urls.forEach(handleDeepLink)).then((stop) => {
      first = stop;
    });
    void getDeepLinkCurrent()
      .then((urls) => urls.forEach(handleDeepLink))
      .catch(() => undefined);
    void onSecondInstance((argv) => {
      argv.filter((value) => value.startsWith("lumen://")).forEach(handleDeepLink);
    }).then((stop) => {
      second = stop;
    });
    return () => {
      first?.();
      second?.();
    };
  }, []);

  useEffect(() => {
    if (!isTauri || !checkUpdates || updateCheckedRef.current) return;
    updateCheckedRef.current = true;
    void checkForUpdates(false, toast).catch(() => undefined);
  }, [checkUpdates, toast]);
}

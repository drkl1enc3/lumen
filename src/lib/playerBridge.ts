import type { UnlistenFn } from "@tauri-apps/api/event";
import i18n from "../i18n";
import { isExternalTrack, isPlayableTrack } from "./catalog";
import {
  onDownloadProgress,
  onPlaybackDuration,
  onPlaybackEnded,
  onPlaybackError,
  onPlaybackPosition,
  playFile,
  prepareTrack,
  seekMpv,
  setMpvPaused,
  setMpvSpeed,
  setMpvVolume,
  stopMpv,
} from "./sources";
import { isTauri } from "./tauri";
import type { Track } from "./types";
import { useCatalog } from "../store/catalog";
import { usePlayer } from "../store/player";
import { useSettings } from "../store/settings";
import { useUI } from "../store/ui";

const ignored = () => undefined;

export function attachPlayerBridge(): () => void {
  if (!isTauri) return () => undefined;

  let disposed = false;
  let loadToken = 0;
  let loadedTrackId: string | null = null;
  let loadedPath: string | null = null;
  let lastPosition = 0;
  const unlisteners: UnlistenFn[] = [];

  const showError = (message: string) => {
    loadedTrackId = null;
    loadedPath = null;
    usePlayer.setState({ playing: false, loading: false, loadProgress: 0, loadError: message });
    useUI.getState().toast(i18n.t("toast.sourceError", { error: message }), "error");
    void stopMpv().catch(ignored);
  };

  const loadTrack = async (track: Track, startAt = 0) => {
    const token = ++loadToken;
    loadedTrackId = null;
    loadedPath = null;
    lastPosition = startAt;
    usePlayer.getState().setLoading(true, 0);
    usePlayer.setState({ loadError: null });

    try {
      // Pause the previous file while the next one is prepared. Calling
      // `play_file` with `replace` would otherwise leave old audio playing
      // during a slow download.
      await setMpvPaused(true).catch(ignored);
      let path: string;
      let duration = track.duration;
      if (isExternalTrack(track)) {
        const prepared = await prepareTrack(track, useSettings.getState().audioQuality);
        if (disposed || token !== loadToken) return;

        if (prepared.duration > 0) {
          duration = prepared.duration;
          usePlayer.getState().setDuration(prepared.duration);
        }
        if (prepared.preview) {
          const existing = useCatalog.getState().external[track.id];
          const alreadyKnown = existing?.previewOnly || track.previewOnly;
          useCatalog.getState().markPreview(track.id);
          if (!alreadyKnown) {
            useUI.getState().toast(i18n.t("toast.soundcloudPreview"), "info");
          }
        }
        path = prepared.path;
      } else if (track.source === "local" && track.path) {
        path = track.path;
        if (duration > 0) usePlayer.getState().setDuration(duration);
      } else {
        usePlayer.getState().setLoading(false);
        return;
      }

      if (disposed || token !== loadToken) return;

      const state = usePlayer.getState();
      const position = Math.max(startAt, state.progress);
      loadedPath = path;
      loadedTrackId = track.id;
      await playFile(path, {
        paused: !state.playing,
        position,
        volume: state.volume,
        muted: state.muted,
        speed: state.speed,
      });
      if (disposed || token !== loadToken) return;
      const latestProgress = usePlayer.getState().progress;
      if (Math.abs(latestProgress - position) > 1.2) {
        await seekMpv(latestProgress);
        lastPosition = latestProgress;
      } else {
        lastPosition = position;
      }
      usePlayer.getState().setLoading(false);
    } catch (error) {
      if (disposed || token !== loadToken) return;
      loadedTrackId = null;
      loadedPath = null;
      showError(String(error));
    }
  };

  const handleEnded = () => {
    const state = usePlayer.getState();
    const track = state.queue[state.index];
    if (!isPlayableTrack(track) || state.loading || loadedTrackId !== track?.id) return;

    if (state.repeat === "one" && loadedPath) {
      lastPosition = 0;
      usePlayer.setState({ progress: 0, resumePosition: 0, playing: true });
      void playFile(loadedPath, {
        paused: false,
        position: 0,
        volume: state.volume,
        muted: state.muted,
        speed: state.speed,
      }).catch((error) => showError(String(error)));
      return;
    }
    state.next(true);
    loadedTrackId = null;
    loadedPath = null;
  };

  const listenerPromises: Promise<UnlistenFn>[] = [
    onPlaybackPosition((seconds) => {
      const state = usePlayer.getState();
      const track = state.queue[state.index];
      if (!isPlayableTrack(track) || state.loading || loadedTrackId !== track?.id) return;
      lastPosition = seconds;
      usePlayer.setState({ progress: seconds });
    }),
    onPlaybackDuration((seconds) => {
      const state = usePlayer.getState();
      const track = state.queue[state.index];
      if (!isPlayableTrack(track) || state.loading || loadedTrackId !== track?.id) return;
      state.setDuration(seconds);
    }),
    onPlaybackEnded(handleEnded),
    onPlaybackError((message) => {
      if (disposed) return;
      loadToken += 1;
      loadedTrackId = null;
      loadedPath = null;
      showError(message);
    }),
    onDownloadProgress((progress) => {
      const state = usePlayer.getState();
      const track = state.queue[state.index];
      if (!state.loading || !track || track.id !== progress.trackId) return;
      state.setLoadProgress(progress.percent);
    }),
  ];

  void Promise.all(listenerPromises).then((fns) => {
    if (disposed) {
      fns.forEach((fn) => fn());
      return;
    }
    unlisteners.push(...fns);
  });

  const unsubscribe = usePlayer.subscribe((state, previous) => {
    const track = state.queue[state.index];
    const previousTrack = previous.queue[previous.index];
    const changed = track?.id !== previousTrack?.id;
    const playable = isPlayableTrack(track);

    if (changed) {
      if (!playable || !track) {
        loadToken += 1;
        loadedTrackId = null;
        loadedPath = null;
        usePlayer.setState({ loading: false, loadProgress: 0, loadError: null });
        void stopMpv().catch(ignored);
        return;
      }
      void loadTrack(track, 0);
      return;
    }

    if (!playable || !track) return;

    if (state.playing !== previous.playing) {
      if (state.playing) {
        if (loadedTrackId === track.id) {
          if (state.progress >= Math.max(1, track.duration) - 0.5) {
            usePlayer.setState({ progress: 0, resumePosition: 0 });
            void loadTrack(track, 0);
          } else {
            void setMpvPaused(false).catch((error) => showError(String(error)));
          }
        } else if (!state.loading) {
          const atEnd = state.progress >= Math.max(1, track.duration) - 0.5;
          if (atEnd) usePlayer.setState({ progress: 0, resumePosition: 0 });
          void loadTrack(track, atEnd ? 0 : state.progress);
        }
      } else if (loadedTrackId === track.id) {
        void setMpvPaused(true).catch(ignored);
      }
    }

    if (loadedTrackId === track.id) {
      if (state.volume !== previous.volume || state.muted !== previous.muted) {
        void setMpvVolume(state.volume, state.muted).catch(ignored);
      }
      if (state.speed !== previous.speed) {
        void setMpvSpeed(state.speed).catch(ignored);
      }
    }

    if (
      state.progress !== previous.progress &&
      loadedTrackId === track.id &&
      !state.loading &&
      Math.abs(state.progress - lastPosition) > 1.2
    ) {
      lastPosition = state.progress;
      void seekMpv(state.progress).catch(ignored);
    }
  });

  const initial = usePlayer.getState();
  const initialTrack = initial.queue[initial.index];
  if (initial.playing && isPlayableTrack(initialTrack)) {
    void loadTrack(initialTrack, initial.progress);
  }

  return () => {
    disposed = true;
    unsubscribe();
    unlisteners.forEach((fn) => fn());
  };
}

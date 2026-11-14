import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { RepeatMode, Track } from "../lib/types";
import { clamp } from "../lib/utils";
import { appStorage } from "../lib/persist";
import { useLibrary } from "./library";

interface PlayerState {
  queue: Track[];
  index: number;
  playing: boolean;
  progress: number;
  resumePosition: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  shufflePlayed: string[];
  repeat: RepeatMode;
  speed: number;
  sleepTimer: number | null;
  sleepEndsAt: number | null;
  loading: boolean;
  loadProgress: number;
  loadError: string | null;
  play: (tracks: Track[], start?: number, options?: { shuffle?: boolean }) => void;
  playTrack: (track: Track, context?: Track[]) => void;
  toggle: () => void;
  pause: () => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  seek: (seconds: number) => void;
  seekBy: (delta: number) => void;
  tick: (dt: number) => void;
  tickClock: (now: number) => void;
  syncResumePosition: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setSpeed: (v: number) => void;
  setSleepTimer: (minutes: number | null) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  moveInQueue: (from: number, to: number) => void;
  setLoading: (loading: boolean, progress?: number) => void;
  setLoadProgress: (progress: number) => void;
  setDuration: (seconds: number) => void;
}

export const currentTrack = (s: PlayerState): Track | undefined => s.queue[s.index];

function trackEnded(track: Track | undefined, progress: number): boolean {
  return Boolean(track && progress >= Math.max(1, track.duration) - 0.5);
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      index: 0,
      playing: false,
      progress: 0,
      resumePosition: 0,
      volume: 0.72,
      muted: false,
      shuffle: false,
      shufflePlayed: [],
      repeat: "off",
      speed: 1,
      sleepTimer: null,
      sleepEndsAt: null,
      loading: false,
      loadProgress: 0,
      loadError: null,
      play: (tracks, start = 0, options) =>
        set((state) => {
          if (!tracks.length) return {};
          const nextShuffle = options?.shuffle ?? state.shuffle;
          return {
            queue: tracks,
            index: clamp(start, 0, tracks.length - 1),
            playing: true,
            progress: 0,
            resumePosition: 0,
            shuffle: nextShuffle,
            shufflePlayed: nextShuffle
              ? [tracks[clamp(start, 0, tracks.length - 1)].id]
              : [],
            loading: false,
            loadProgress: 0,
            loadError: null,
          };
        }),
      playTrack: (track, context) => {
        const state = get();
        const tracks = context?.length ? context : state.queue.length ? state.queue : [track];
        const idx = tracks.findIndex((t) => t.id === track.id);
        state.play(tracks, idx >= 0 ? idx : 0);
        useLibrary.getState().registerPlay(track.id);
      },
      toggle: () => {
        const state = get();
        if (!state.queue.length) return;
        const track = state.queue[state.index];
        if (state.playing) {
          set({ playing: false, resumePosition: state.progress });
          return;
        }
        if (track && trackEnded(track, state.progress)) {
          set({ playing: true, progress: 0, resumePosition: 0 });
        } else {
          set({ playing: true });
        }
        if (track) useLibrary.getState().registerPlay(track.id);
      },
      pause: () => {
        const state = get();
        set({ playing: false, resumePosition: state.progress });
      },
      next: (auto = false) => {
        const state = get();
        if (!state.queue.length) return;
        const length = state.queue.length;

        if (auto && state.repeat === "one") {
          set({
            progress: 0,
            resumePosition: 0,
            playing: true,
            loading: false,
            loadProgress: 0,
            loadError: null,
          });
          return;
        }

        let nextIndex = state.index + 1;
        let shufflePlayed = state.shufflePlayed;

        if (state.shuffle && length > 1) {
          const unplayed = state.queue
            .map((_, index) => index)
            .filter((index) => !state.shufflePlayed.includes(state.queue[index].id));
          if (unplayed.length) {
            nextIndex = unplayed[Math.floor(Math.random() * unplayed.length)];
            shufflePlayed = [...state.shufflePlayed, state.queue[nextIndex].id];
          } else if (auto && state.repeat === "off") {
            set({
              playing: false,
              progress: state.queue[state.index]?.duration ?? 0,
              resumePosition: state.queue[state.index]?.duration ?? 0,
            });
            return;
          } else {
            do {
              nextIndex = Math.floor(Math.random() * length);
            } while (nextIndex === state.index);
            shufflePlayed = [state.queue[nextIndex].id];
          }
        }

        if (nextIndex >= length) {
          if (state.repeat === "one" && auto) {
            nextIndex = state.index;
          } else if (state.repeat === "all" || state.repeat === "one" || !auto) {
            nextIndex = 0;
          } else {
            set({
              playing: false,
              progress: state.queue[state.index]?.duration ?? 0,
              resumePosition: state.queue[state.index]?.duration ?? 0,
            });
            return;
          }
        }

        set({
          index: nextIndex,
          progress: 0,
          resumePosition: 0,
          playing: true,
          shufflePlayed,
          loading: false,
          loadProgress: 0,
          loadError: null,
        });
        const track = state.queue[nextIndex];
        if (track) useLibrary.getState().registerPlay(track.id);
      },
      prev: () => {
        const state = get();
        if (!state.queue.length) return;
        if (state.progress > 4) {
          set({ progress: 0, resumePosition: 0 });
          return;
        }
        const prevIndex = state.index === 0 ? state.queue.length - 1 : state.index - 1;
        set({
          index: prevIndex,
          progress: 0,
          resumePosition: 0,
          playing: true,
          loading: false,
          loadProgress: 0,
          loadError: null,
        });
        const track = state.queue[prevIndex];
        if (track) useLibrary.getState().registerPlay(track.id);
      },
      seek: (seconds) => {
        const state = get();
        const track = state.queue[state.index];
        if (!track) return;
        const progress = clamp(seconds, 0, track.duration);
        set({ progress, resumePosition: progress });
      },
      seekBy: (delta) => get().seek(get().progress + delta),
      tick: (dt) => {
        const state = get();
        if (!state.playing) return;
        const track = state.queue[state.index];
        if (!track) return;
        const nextProgress = state.progress + dt * state.speed;
        if (nextProgress >= track.duration) {
          get().next(true);
          return;
        }
        set({ progress: nextProgress });
      },
      tickClock: (now) => {
        const state = get();
        if (!state.sleepEndsAt) return;
        if (now >= state.sleepEndsAt) {
          set({
            playing: false,
            sleepTimer: null,
            sleepEndsAt: null,
            resumePosition: state.progress,
          });
        }
      },
      syncResumePosition: () => {
        const state = get();
        if (!state.queue.length) return;
        if (Math.abs(state.resumePosition - state.progress) < 1.5) return;
        set({ resumePosition: state.progress });
      },
      setVolume: (v) => set({ volume: clamp(v, 0, 1), muted: v === 0 ? get().muted : false }),
      toggleMute: () => set((state) => ({ muted: !state.muted })),
      toggleShuffle: () =>
        set((state) => {
          const shuffle = !state.shuffle;
          return {
            shuffle,
            shufflePlayed: shuffle && state.queue[state.index]
              ? [state.queue[state.index].id]
              : [],
          };
        }),
      cycleRepeat: () =>
        set((state) => ({
          repeat: state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off",
        })),
      setSpeed: (v) => set({ speed: clamp(v, 0.5, 2) }),
      setSleepTimer: (minutes) =>
        set({
          sleepTimer: minutes,
          sleepEndsAt: minutes === null ? null : Date.now() + minutes * 60_000,
        }),
      removeFromQueue: (index) =>
        set((state) => {
          if (index < 0 || index >= state.queue.length) return {};
          const queue = state.queue.filter((_, i) => i !== index);
          if (!queue.length) {
            return {
              queue: [],
              index: 0,
              playing: false,
              progress: 0,
              resumePosition: 0,
              loading: false,
              loadProgress: 0,
              loadError: null,
            };
          }
          const removedCurrent = index === state.index;
          const nextIndex = clamp(
            index < state.index ? state.index - 1 : state.index,
            0,
            queue.length - 1,
          );
          return {
            queue,
            index: nextIndex,
            progress: removedCurrent ? 0 : state.progress,
            resumePosition: removedCurrent ? 0 : state.resumePosition,
            shufflePlayed: state.shufflePlayed.filter((id) => queue.some((track) => track.id === id)),
          };
        }),
      clearQueue: () =>
        set({
          queue: [],
          index: 0,
          playing: false,
          progress: 0,
          resumePosition: 0,
          shufflePlayed: [],
          loading: false,
          loadProgress: 0,
          loadError: null,
        }),
      moveInQueue: (from, to) =>
        set((state) => {
          if (
            from < 0 ||
            to < 0 ||
            from >= state.queue.length ||
            to >= state.queue.length ||
            from === to
          ) {
            return {};
          }
          const queue = [...state.queue];
          const [moved] = queue.splice(from, 1);
          queue.splice(to, 0, moved);
          let index = state.index;
          if (state.index === from) index = to;
          else if (from < state.index && to >= state.index) index -= 1;
          else if (from > state.index && to <= state.index) index += 1;
          return { queue, index };
        }),
      setLoading: (loading, progress) =>
        set((state) => ({
          loading,
          loadProgress: progress ?? (loading ? state.loadProgress : 0),
          loadError: loading ? null : state.loadError,
        })),
      setLoadProgress: (loadProgress) => set({ loadProgress: clamp(loadProgress, 0, 100) }),
      setDuration: (seconds) =>
        set((state) => {
          if (!Number.isFinite(seconds) || seconds <= 0) return {};
          const track = state.queue[state.index];
          if (!track) return {};
          const duration = Math.max(1, Math.round(seconds));
          if (Math.abs(track.duration - duration) < 1) return {};
          const queue = state.queue.map((item, index) =>
            index === state.index ? { ...item, duration } : item,
          );
          return { queue };
        }),
    }),
    {
      name: "lumen.player.v1",
      storage: createJSONStorage(() => appStorage),
      skipHydration: true,
      partialize: (state) => ({
        queue: state.queue,
        index: state.index,
        volume: state.volume,
        muted: state.muted,
        shuffle: state.shuffle,
        repeat: state.repeat,
        speed: state.speed,
        resumePosition: state.resumePosition,
      }),
    },
  ),
);

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RepeatMode, Track } from "../lib/types";
import { clamp } from "../lib/utils";
import { useLibrary } from "./library";

interface PlayerState {
  queue: Track[];
  index: number;
  playing: boolean;
  progress: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  speed: number;
  sleepTimer: number | null;
  play: (tracks: Track[], start?: number, options?: { shuffle?: boolean }) => void;
  playTrack: (track: Track, context?: Track[]) => void;
  toggle: () => void;
  pause: () => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  seek: (seconds: number) => void;
  seekBy: (delta: number) => void;
  tick: (dt: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setSpeed: (v: number) => void;
  setSleepTimer: (minutes: number | null) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  moveInQueue: (from: number, to: number) => void;
}

export const currentTrack = (s: PlayerState): Track | undefined => s.queue[s.index];

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      index: 0,
      playing: false,
      progress: 0,
      volume: 0.72,
      muted: false,
      shuffle: false,
      repeat: "off",
      speed: 1,
      sleepTimer: null,
      play: (tracks, start = 0, options) =>
        set((state) => {
          if (!tracks.length) return {};
          const nextShuffle = options?.shuffle ?? state.shuffle;
          return {
            queue: tracks,
            index: clamp(start, 0, tracks.length - 1),
            playing: true,
            progress: 0,
            shuffle: nextShuffle,
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
        set({ playing: !state.playing });
        const track = state.queue[state.index];
        if (!state.playing && track) useLibrary.getState().registerPlay(track.id);
      },
      pause: () => set({ playing: false }),
      next: (auto = false) => {
        const state = get();
        if (!state.queue.length) return;
        let nextIndex = state.index + 1;
        if (state.shuffle && state.queue.length > 1) {
          do {
            nextIndex = Math.floor(Math.random() * state.queue.length);
          } while (nextIndex === state.index);
        }
        if (nextIndex >= state.queue.length) {
          if (state.repeat === "all") nextIndex = 0;
          else if (state.repeat === "one") nextIndex = state.index;
          else {
            if (auto) set({ playing: false, progress: state.queue[state.index]?.duration ?? 0 });
            else set({ index: 0, progress: 0 });
            return;
          }
        }
        set({ index: nextIndex, progress: 0, playing: true });
        const track = state.queue[nextIndex];
        if (track) useLibrary.getState().registerPlay(track.id);
      },
      prev: () => {
        const state = get();
        if (!state.queue.length) return;
        if (state.progress > 4) return set({ progress: 0 });
        const prevIndex = state.index === 0 ? state.queue.length - 1 : state.index - 1;
        set({ index: prevIndex, progress: 0, playing: true });
        const track = state.queue[prevIndex];
        if (track) useLibrary.getState().registerPlay(track.id);
      },
      seek: (seconds) => {
        const state = get();
        const track = state.queue[state.index];
        if (!track) return;
        set({ progress: clamp(seconds, 0, track.duration) });
      },
      seekBy: (delta) => get().seek(get().progress + delta),
      tick: (dt) => {
        const state = get();
        if (!state.playing) return;
        const track = state.queue[state.index];
        if (!track) return;
        const nextProgress = state.progress + dt * state.speed;
        if (nextProgress >= track.duration) {
          if (state.repeat === "one") set({ progress: 0 });
          else if (state.repeat === "all" || state.index < state.queue.length - 1) {
            const nextIndex = (state.index + 1) % state.queue.length;
            set({ index: nextIndex, progress: 0 });
            const next = state.queue[nextIndex];
            if (next) useLibrary.getState().registerPlay(next.id);
          } else {
            set({ playing: false, progress: track.duration });
          }
          return;
        }
        set({ progress: nextProgress });
      },
      setVolume: (v) => set({ volume: clamp(v, 0, 1), muted: v === 0 ? get().muted : false }),
      toggleMute: () => set((state) => ({ muted: !state.muted })),
      toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
      cycleRepeat: () =>
        set((state) => ({
          repeat: state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off",
        })),
      setSpeed: (v) => set({ speed: clamp(v, 0.5, 2) }),
      setSleepTimer: (minutes) => set({ sleepTimer: minutes }),
      removeFromQueue: (index) =>
        set((state) => {
          const queue = state.queue.filter((_, i) => i !== index);
          const nextIndex = index < state.index ? state.index - 1 : state.index;
          return {
            queue,
            index: clamp(nextIndex, 0, Math.max(0, queue.length - 1)),
            playing: queue.length ? state.playing : false,
          };
        }),
      clearQueue: () => set({ queue: [], index: 0, playing: false, progress: 0 }),
      moveInQueue: (from, to) =>
        set((state) => {
          const queue = [...state.queue];
          const [moved] = queue.splice(from, 1);
          queue.splice(to, 0, moved);
          return { queue };
        }),
    }),
    {
      name: "lumen.player.v1",
      partialize: (state) => ({ volume: state.volume, repeat: state.repeat, shuffle: state.shuffle }),
    },
  ),
);

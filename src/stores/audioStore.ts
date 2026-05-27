import { create } from "zustand";

type AudioState = {
  enabled: boolean;
  muted: boolean;
  toggleEnabled: () => void;
  toggleMuted: () => void;
};

export const useAudioStore = create<AudioState>((set) => ({
  enabled: false,
  muted: false,
  toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),
  toggleMuted: () => set((state) => ({ muted: !state.muted }))
}));

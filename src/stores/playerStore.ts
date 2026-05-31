import { create } from "zustand";

type Vec2 = {
  x: number;
  z: number;
};

type PlayerState = {
  position: Vec2;
  touchMove: Vec2;
  avatarUrl?: string | null;
  setPosition: (position: Vec2) => void;
  setTouchMove: (move: Vec2) => void;
  setAvatarUrl: (avatarUrl?: string | null) => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  position: { x: 0, z: 3.2 },
  touchMove: { x: 0, z: 0 },
  avatarUrl: null,
  setPosition: (position) => set({ position }),
  setTouchMove: (touchMove) => set({ touchMove }),
  setAvatarUrl: (avatarUrl) => set({ avatarUrl })
}));

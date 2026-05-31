import { create } from "zustand";
import type { Normie } from "@/types/normie";

export type GameId = "lobby" | "roulette" | "rps" | "poker" | "updown";

type DealerRole = "Expression Croupier" | "Arena Master" | "DNA Card Sharp" | "Prediction Host" | "Cashier";

export type Dealer = {
  role: DealerRole;
  persona: string;
  normie?: Normie;
};

type NotificationKind = "win" | "loss" | "info";

export type ArcadeNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
};

type ArcadeState = {
  activeGame: GameId;
  dealers: Dealer[];
  loadedNormies: Normie[];
  notifications: ArcadeNotification[];
  setActiveGame: (game: GameId) => void;
  setDealers: (dealers: Dealer[]) => void;
  setLoadedNormies: (normies: Normie[]) => void;
  notify: (notification: Omit<ArcadeNotification, "id">) => void;
  dismiss: (id: string) => void;
};

export const useArcadeStore = create<ArcadeState>((set) => ({
  activeGame: "lobby",
  dealers: [
    { role: "Expression Croupier", persona: "Serious dealer" },
    { role: "Arena Master", persona: "Chaotic dealer" },
    { role: "DNA Card Sharp", persona: "Precise dealer" },
    { role: "Prediction Host", persona: "Robotic dealer" },
    { role: "Cashier", persona: "Lucky dealer" }
  ],
  loadedNormies: [],
  notifications: [],
  setActiveGame: (activeGame) => set({ activeGame }),
  setDealers: (dealers) => set({ dealers }),
  setLoadedNormies: (loadedNormies) => set({ loadedNormies }),
  notify: (notification) =>
    set((state) => ({
      notifications: [
        { ...notification, id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}` },
        ...state.notifications
      ].slice(0, 5)
    })),
  dismiss: (id) => set((state) => ({ notifications: state.notifications.filter((item) => item.id !== id) }))
}));

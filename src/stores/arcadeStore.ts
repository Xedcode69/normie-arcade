import { create } from "zustand";
import type { Normie } from "@/types/normie";

export type GameId = "lobby" | "roulette" | "rps" | "poker" | "updown" | "sort" | "pixel";

type DealerRole = "Expression Croupier" | "Arena Master" | "DNA Card Sharp" | "Prediction Host" | "Sort Marshal" | "Pixel Sleuth" | "Cashier";

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
  gameMenuOpen: boolean;
  leaderboardOpen: boolean;
  communityGamesOpen: boolean;
  dealers: Dealer[];
  loadedNormies: Normie[];
  notifications: ArcadeNotification[];
  setActiveGame: (game: GameId) => void;
  setGameMenuOpen: (open: boolean) => void;
  setLeaderboardOpen: (open: boolean) => void;
  setCommunityGamesOpen: (open: boolean) => void;
  toggleGameMenu: () => void;
  setDealers: (dealers: Dealer[]) => void;
  setLoadedNormies: (normies: Normie[]) => void;
  notify: (notification: Omit<ArcadeNotification, "id">) => void;
  dismiss: (id: string) => void;
};

export const useArcadeStore = create<ArcadeState>((set) => ({
  activeGame: "lobby",
  gameMenuOpen: false,
  leaderboardOpen: false,
  communityGamesOpen: false,
  dealers: [
    { role: "Expression Croupier", persona: "Serious dealer" },
    { role: "Arena Master", persona: "Chaotic dealer" },
    { role: "DNA Card Sharp", persona: "Precise dealer" },
    { role: "Prediction Host", persona: "Robotic dealer" },
    { role: "Sort Marshal", persona: "Speed clerk" },
    { role: "Pixel Sleuth", persona: "Evidence tech" },
    { role: "Cashier", persona: "Lucky dealer" }
  ],
  loadedNormies: [],
  notifications: [],
  setActiveGame: (activeGame) => set({ activeGame, gameMenuOpen: false }),
  setGameMenuOpen: (gameMenuOpen) => set({ gameMenuOpen }),
  setLeaderboardOpen: (leaderboardOpen) => set({ leaderboardOpen }),
  setCommunityGamesOpen: (communityGamesOpen) => set({ communityGamesOpen }),
  toggleGameMenu: () => set((state) => ({ gameMenuOpen: !state.gameMenuOpen })),
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

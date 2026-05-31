import type { RPSType } from "@/types/normie";

export type RPSPvPPlayer = {
  id: string;
  name: string;
  seat: 0 | 1;
  score: number;
  connected: boolean;
  bet: number;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
  serverBalance?: number;
  accountError?: string;
  pick?: "Locked";
};

export type RPSPvPState = {
  phase: "waiting" | "playing" | "revealed" | "finished";
  players: RPSPvPPlayer[];
  round: number;
  history: Array<{
    round: number;
    playerA: RPSType;
    playerB: RPSType;
    winner: "playerA" | "playerB" | "draw";
    scoreA: number;
    scoreB: number;
  }>;
  reveal?: {
    playerA: RPSType;
    playerB: RPSType;
    winner: "playerA" | "playerB" | "draw";
  };
  winnerId?: string;
  message: string;
};

export const initialRpsPvpState: RPSPvPState = {
  phase: "waiting",
  players: [],
  round: 1,
  history: [],
  message: "Connect to quick match."
};

export function getPartyKitHost() {
  return process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";
}

export function buildPartySocketUrl(room: string) {
  const host = getPartyKitHost();
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "ws" : "wss";
  return `${protocol}://${host}/parties/main/${encodeURIComponent(room)}`;
}

export function normalizeRoomCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 18);
}

export function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  globalThis.crypto?.getRandomValues?.(bytes);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

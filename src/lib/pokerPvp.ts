import type { NormieTraits } from "@/types/normie";

export type PokerPvPPlayer = {
  id: string;
  name: string;
  seat: number;
  connected: boolean;
  ready: boolean;
  handCount: number;
  ante?: number;
  buyIn?: number;
  stack?: number;
  reserved?: boolean;
  serverBalance?: number;
  accountError?: string;
  committed?: number;
  streetCommitted?: number;
  folded?: boolean;
  acted?: boolean;
  lastAction?: string;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
};

export type PokerPvPState = {
  phase: "waiting" | "ready" | "dealt" | "betting" | "showdown" | "finished";
  players: PokerPvPPlayer[];
  maxPlayers: number;
  round: number;
  buyIn: number;
  ante: number;
  pot: number;
  currentBet: number;
  minRaise: number;
  turnPlayerId?: string;
  street?: "preflop" | "flop" | "turn" | "river";
  communityCards: number[];
  handId?: string;
  nextHandStartsAt?: number;
  privateHand?: number[];
  history: Array<{
    round: number;
    handId: string;
    winners: string[];
    winnerNames: string[];
    pot: number;
    payoutEach: number;
    summary: string;
  }>;
  actionLog: Array<{
    id: string;
    round: number;
    street?: string;
    playerName?: string;
    action: string;
    amount?: number;
    message: string;
  }>;
  showdown?: {
    winners: string[];
    pot: number;
    payoutEach: number;
    hands: Array<{
      playerId: string;
      playerName: string;
      cards: number[];
      bestCards: number[];
      cardTraits: Array<{
        id: number;
        traits: NormieTraits;
      }>;
      handName: string;
      score: number;
      tokenSum: number;
      summary: string;
    }>;
  };
  message: string;
};

export const initialPokerPvpState: PokerPvPState = {
  phase: "waiting",
  players: [],
  maxPlayers: 5,
  round: 1,
  buyIn: 1000,
  ante: 100,
  pot: 0,
  currentBet: 0,
  minRaise: 50,
  communityCards: [],
  history: [],
  actionLog: [],
  message: "Create or join a DNA Poker table."
};

export function getPartyKitHost() {
  return process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";
}

export function buildPokerSocketUrl(room: string) {
  const host = getPartyKitHost();
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "ws" : "wss";
  return `${protocol}://${host}/parties/main/${encodeURIComponent(room)}`;
}

export function normalizePokerRoomCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 18);
}

export function createPokerRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  globalThis.crypto?.getRandomValues?.(bytes);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

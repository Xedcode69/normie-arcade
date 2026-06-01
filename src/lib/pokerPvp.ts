export type PokerPvPPlayer = {
  id: string;
  name: string;
  seat: number;
  connected: boolean;
  ready: boolean;
  handCount: number;
  ante?: number;
  reserved?: boolean;
  serverBalance?: number;
  accountError?: string;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
};

export type PokerPvPState = {
  phase: "waiting" | "ready" | "dealt" | "showdown";
  players: PokerPvPPlayer[];
  maxPlayers: number;
  round: number;
  pot: number;
  handId?: string;
  privateHand?: number[];
  showdown?: {
    winners: string[];
    pot: number;
    payoutEach: number;
    hands: Array<{
      playerId: string;
      playerName: string;
      cards: number[];
      handName: string;
      score: number;
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
  pot: 0,
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

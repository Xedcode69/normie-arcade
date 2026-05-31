export type PokerPvPPlayer = {
  id: string;
  name: string;
  seat: number;
  connected: boolean;
  ready: boolean;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
};

export type PokerPvPState = {
  phase: "waiting" | "ready";
  players: PokerPvPPlayer[];
  maxPlayers: number;
  message: string;
};

export const initialPokerPvpState: PokerPvPState = {
  phase: "waiting",
  players: [],
  maxPlayers: 5,
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

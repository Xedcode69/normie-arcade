export type TcgPvpPlayer = {
  id: string;
  name: string;
  seat: 0 | 1;
  connected: boolean;
  handCount: number;
  deckCount: number;
  score: number;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
  pendingPlay?: {
    cardId: number;
    lane: number;
  };
};

export type TcgLane = {
  playerA: number[];
  playerB: number[];
};

export type TcgReveal = {
  turn: number;
  playerA?: { cardId: number; lane: number; power: number };
  playerB?: { cardId: number; lane: number; power: number };
  laneWinner?: "playerA" | "playerB" | "draw";
  message: string;
};

export type TcgPvpState = {
  phase: "waiting" | "playing" | "revealed" | "finished";
  players: TcgPvpPlayer[];
  turn: number;
  maxTurns: number;
  lanes: TcgLane[];
  privateHand?: number[];
  reveal?: TcgReveal;
  winnerId?: string;
  history: TcgReveal[];
  message: string;
};

export const initialTcgPvpState: TcgPvpState = {
  phase: "waiting",
  players: [],
  turn: 1,
  maxTurns: 5,
  lanes: [
    { playerA: [], playerB: [] },
    { playerA: [], playerB: [] },
    { playerA: [], playerB: [] }
  ],
  history: [],
  message: "Create or join a Circuit Clash room."
};

export function getPartyKitHost() {
  return process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";
}

export function buildTcgSocketUrl(room: string) {
  const host = getPartyKitHost();
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "ws" : "wss";
  return `${protocol}://${host}/parties/main/${encodeURIComponent(room)}`;
}

export function normalizeTcgRoomCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 18);
}

export function createTcgRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  globalThis.crypto?.getRandomValues?.(bytes);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function tcgCardPower(id: number) {
  return 5 + (id % 9) + (String(id).split("").reduce((sum, digit) => sum + Number(digit), 0) % 5);
}

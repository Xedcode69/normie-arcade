import type { RPSType } from "@/types/normie";

export type RPSPvPPlayer = {
  id: string;
  name: string;
  seat: 0 | 1;
  score: number;
  connected: boolean;
  pick?: "Locked";
};

export type RPSPvPState = {
  phase: "waiting" | "playing" | "revealed" | "finished";
  players: RPSPvPPlayer[];
  round: number;
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
  message: "Connect to quick match."
};

export function getPartyKitHost() {
  return process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";
}

export function buildPartySocketUrl(room: string) {
  const host = getPartyKitHost();
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "ws" : "wss";
  return `${protocol}://${host}/parties/main/${room}`;
}

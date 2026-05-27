import type { RPSType } from "@/types/normie";

export function rpsWinner(player: RPSType, npc: RPSType): "player" | "npc" | "draw" {
  if (player === npc) return "draw";
  if (
    (player === "Cat" && npc === "Alien") ||
    (player === "Human" && npc === "Cat") ||
    (player === "Alien" && npc === "Human")
  ) {
    return "player";
  }
  return "npc";
}

export function clampBet(bet: number, balance: number) {
  return Math.max(10, Math.min(balance, Math.round(bet)));
}

export function formatChips(value: number) {
  return value.toLocaleString("en-US");
}

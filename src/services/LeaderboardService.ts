import type { RecordLeaderboardInput } from "@/lib/leaderboardSchema";

export type LeaderboardGame = RecordLeaderboardInput["game"];
export type LeaderboardMode = RecordLeaderboardInput["mode"];
export type LeaderboardOutcome = RecordLeaderboardInput["outcome"];

export type LeaderboardEntry = {
  rank: number;
  player: string;
  avatarUrl: string | null;
  game: LeaderboardGame;
  mode: LeaderboardMode;
  netChips: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalPlays: number;
  bestScore: number;
  bestCombo: number;
  updatedAt: string;
};

export async function recordLeaderboard(input: RecordLeaderboardInput) {
  const response = await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Leaderboard update failed");
  }
}

export async function fetchLeaderboard(game: LeaderboardGame, mode: LeaderboardMode, limit = 10) {
  const params = new URLSearchParams({ game, mode, limit: String(limit) });
  const response = await fetch(`/api/leaderboard?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Leaderboard fetch failed");
  }

  return (await response.json()) as { entries: LeaderboardEntry[] };
}

import { z } from "zod";

export const leaderboardGameSchema = z.enum(["ROULETTE", "RPS", "POKER", "UP_DOWN", "SORT_SPRINT", "PIXEL_DETECTIVE", "WHACK_RUSH"]);
export const leaderboardModeSchema = z.enum(["SOLO", "PVP", "SKILL"]);
export const leaderboardOutcomeSchema = z.enum(["WIN", "LOSS", "DRAW"]);

export const recordLeaderboardSchema = z.object({
  privyToken: z.string().min(20),
  game: leaderboardGameSchema,
  mode: leaderboardModeSchema,
  outcome: leaderboardOutcomeSchema,
  score: z.number().int().min(0).max(1_000_000).default(0),
  chipsWon: z.number().int().min(0).max(10_000_000).default(0),
  netChips: z.number().int().min(-10_000_000).max(10_000_000).default(0),
  bestCombo: z.number().int().min(0).max(1_000_000).default(0),
  metadata: z.record(z.unknown()).optional()
});

export const getLeaderboardSchema = z.object({
  game: leaderboardGameSchema,
  mode: leaderboardModeSchema,
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

export type RecordLeaderboardInput = z.infer<typeof recordLeaderboardSchema>;

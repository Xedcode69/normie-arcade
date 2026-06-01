import { z } from "zod";

const baseSchema = z.object({
  matchId: z.string().min(1).max(120),
  roomId: z.string().min(1).max(120),
  playerId: z.string().min(1).max(120),
  privyToken: z.string().min(20),
  ante: z.number().int().min(1).max(100000)
});

export const reservePokerAnteSchema = baseSchema;
export const refundPokerAnteSchema = baseSchema;

export const settlePokerAnteSchema = baseSchema.extend({
  outcome: z.enum(["WIN", "LOSS", "DRAW"]),
  payout: z.number().int().min(0).max(1000000),
  handName: z.string().min(1).max(80),
  score: z.string().min(1).max(40)
});

export type ReservePokerAnteInput = z.infer<typeof reservePokerAnteSchema>;
export type RefundPokerAnteInput = z.infer<typeof refundPokerAnteSchema>;
export type SettlePokerAnteInput = z.infer<typeof settlePokerAnteSchema>;

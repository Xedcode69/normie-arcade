import { z } from "zod";

const baseSchema = z.object({
  matchId: z.string().min(1).max(120),
  roomId: z.string().min(1).max(120),
  playerId: z.string().min(1).max(120),
  privyToken: z.string().min(20),
  bet: z.number().int().min(1).max(100000)
});

export const reserveRpsWagerSchema = baseSchema;
export const refundRpsWagerSchema = baseSchema;

export const settleRpsWagerSchema = baseSchema.extend({
  outcome: z.enum(["WIN", "LOSS"]),
  score: z.string().min(3).max(12)
});

export type ReserveRpsWagerInput = z.infer<typeof reserveRpsWagerSchema>;
export type RefundRpsWagerInput = z.infer<typeof refundRpsWagerSchema>;
export type SettleRpsWagerInput = z.infer<typeof settleRpsWagerSchema>;

import { z } from "zod";

export const accountSyncSchema = z.object({
  privyId: z.string().min(1),
  email: z.string().email().optional().nullable(),
  displayName: z.string().trim().min(1).max(80).optional().nullable(),
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional()
    .nullable()
});

export type AccountSyncInput = z.infer<typeof accountSyncSchema>;

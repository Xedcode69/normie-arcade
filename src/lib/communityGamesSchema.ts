import { z } from "zod";

export const communityGameSubmitSchema = z.object({
  name: z.string().trim().min(2).max(80),
  creator: z.string().trim().min(2).max(80),
  description: z.string().trim().min(20).max(240),
  tags: z.array(z.string().trim().min(1).max(24)).min(1).max(5),
  url: z.string().trim().url().max(500),
  previewUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  contact: z.string().trim().max(120).optional()
});

export const communityGameReviewSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"])
});

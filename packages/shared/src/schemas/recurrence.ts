import { z } from "zod";

export const recurrenceConfigSchema = z.discriminatedUnion("frequency", [
  z.object({ frequency: z.literal("daily") }),
  z.object({
    frequency: z.literal("weekly"),
    days: z.array(z.number().int().min(0).max(6)).min(1),
  }),
  z.object({
    frequency: z.literal("monthly"),
    dates: z.array(z.number().int().min(1).max(31)).min(1),
  }),
  z.object({
    frequency: z.literal("yearly"),
    month: z.number().int().min(1).max(12),
    date: z.number().int().min(1).max(31),
  }),
]);

export type RecurrenceConfig = z.infer<typeof recurrenceConfigSchema>;

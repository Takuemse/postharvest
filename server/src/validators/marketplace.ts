import { z } from "zod";

export const PROVINCES = [
  "BULAWAYO", "HARARE", "MANICALAND", "MASHONALAND_CENTRAL", "MASHONALAND_EAST",
  "MASHONALAND_WEST", "MASVINGO", "MATABELELAND_NORTH", "MATABELELAND_SOUTH", "MIDLANDS",
] as const;

export const browseQuerySchema = z.object({
  cropId: z.coerce.number().int().positive().optional(),
  province: z.enum(PROVINCES).optional(),
  locationId: z.coerce.number().int().positive().optional(),
  minKg: z.coerce.number().positive().optional(),
  availableBy: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
    .refine((s) => !Number.isNaN(Date.parse(s)), "Choose a valid date.")
    .optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  currency: z.enum(["USD", "ZWG"]).default("USD"),
  page: z.coerce.number().int().min(1).default(1),
});

export type BrowseQuery = z.infer<typeof browseQuerySchema>;
import { z } from "zod";
import { quantityKg } from "./harvest";

export const createDemandSchema = z.object({
  businessId: z.string().uuid().optional(),
  cropId: z.coerce.number({ message: "Choose a crop." }).int().positive("Choose a crop."),
  quantityKg,
  neededBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date you need it by."),
  locationId: z.coerce.number().int().positive().optional(),
  maxPricePerKg: z.coerce.number().nonnegative("Price cannot be negative.").max(100000).optional(),
  currency: z.enum(["USD", "ZWG"]).default("USD"),
  notes: z.string().trim().max(500, "Notes can be up to 500 characters.").optional(),
});

export type CreateDemandInput = z.infer<typeof createDemandSchema>;
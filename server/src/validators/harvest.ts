import { z } from "zod";

export const createHarvestSchema = z.object({
  farmId: z.string().uuid().optional(),
  cropId: z.coerce.number({ message: "Choose a crop." }).int().positive("Choose a crop."),
  harvestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the harvest date."),
  storage: z.enum(["AMBIENT", "COOL", "REFRIGERATED"], { message: "Choose how it is stored." }),
  quantityKg: z.coerce
    .number({ message: "Enter the quantity in kg." })
    .positive("Quantity must be more than 0 kg.")
    .max(100000, "That quantity looks too large. Please check it.")
    .transform((n) => Math.round(n * 100) / 100),
  askingPricePerKg: z.coerce.number().nonnegative("Price cannot be negative.").max(100000).optional(),
  currency: z.enum(["USD", "ZWG"]).default("USD"),
  notes: z.string().trim().max(500, "Notes can be up to 500 characters.").optional(),
});

export type CreateHarvestInput = z.infer<typeof createHarvestSchema>;
import { z } from "zod";

export const quantityKg = z.coerce
  .number({ message: "Enter the quantity in kg." })
  .positive("Quantity must be more than 0 kg.")
  .max(100000, "That quantity looks too large. Please check it.")
  .transform((n) => Math.round(n * 100) / 100);

const harvestDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the harvest date.");
const storage = z.enum(["AMBIENT", "COOL", "REFRIGERATED"], { message: "Choose how it is stored." });
const currency = z.enum(["USD", "ZWG"]);
const price = z.coerce.number().nonnegative("Price cannot be negative.").max(100000);
const notes = z.string().trim().max(500, "Notes can be up to 500 characters.");

export const createHarvestSchema = z.object({
  farmId: z.string().uuid().optional(),
  cropId: z.coerce.number({ message: "Choose a crop." }).int().positive("Choose a crop."),
  harvestDate,
  storage,
  quantityKg,
  askingPricePerKg: price.optional(),
  currency: currency.default("USD"),
  notes: notes.optional(),
});

// Crop cannot be changed after recording; that would be a different harvest.
export const updateHarvestSchema = z
  .object({
    quantityKg: quantityKg.optional(),
    harvestDate: harvestDate.optional(),
    storage: storage.optional(),
    askingPricePerKg: z.union([z.null(), price]).optional(),
    currency: currency.optional(),
    notes: z.union([z.null(), notes]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update." });

export type CreateHarvestInput = z.infer<typeof createHarvestSchema>;
export type UpdateHarvestInput = z.infer<typeof updateHarvestSchema>;
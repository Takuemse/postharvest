import { z } from "zod";
import { quantityKg } from "./harvest";

export const createOrderSchema = z.object({
  harvestId: z.string().uuid(),
  demandId: z.string().uuid(),
  quantityKg: quantityKg.optional(),
});

export const reasonSchema = z.object({
  reason: z.string().trim().max(200, "Keep the reason under 200 characters.").optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
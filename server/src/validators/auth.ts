import { z } from "zod";

const locationId = z.coerce.number().int().positive();
const fullName = z.string().trim().min(2).max(100);

export const registerBuyerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  fullName,
  phone: z.string().trim().regex(/^\+?[0-9 ]{9,15}$/, "Enter a valid phone number").optional(),
  business: z.object({
    name: z.string().trim().min(2).max(120),
    type: z.enum(["RESTAURANT", "RETAILER", "WHOLESALER", "MARKET_VENDOR", "PROCESSOR", "OTHER"]),
    locationId,
  }),
});

export const completeFarmerSchema = z.object({
  fullName,
  farm: z.object({
    name: z.string().trim().min(2).max(120),
    locationId,
  }),
});
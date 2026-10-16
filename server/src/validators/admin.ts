import { z } from "zod";

export const usersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(["FARMER", "BUYER", "ADMIN"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});
export type UsersQuery = z.infer<typeof usersQuerySchema>;

export const reasonSchema = z.object({
  reason: z.string().trim().min(3, "Please give a reason (at least 3 characters).").max(500),
});
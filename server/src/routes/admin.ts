import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { listUsers, overview, setAccountActive } from "../services/adminService";
import { reasonSchema, usersQuerySchema } from "../validators/admin";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN"));

function idParam(value: unknown): string {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) throw new AppError(404, "Not found.");
  return parsed.data;
}

adminRouter.get("/overview", async (_req, res) => {
  res.json({ success: true, data: await overview() });
});

adminRouter.get("/users", async (req, res) => {
  res.json({ success: true, data: await listUsers(usersQuerySchema.parse(req.query)) });
});

adminRouter.post("/users/:id/suspend", async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  res.json({ success: true, data: await setAccountActive(req.user!.id, idParam(req.params.id), false, reason) });
});

adminRouter.post("/users/:id/reactivate", async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  res.json({ success: true, data: await setAccountActive(req.user!.id, idParam(req.params.id), true, reason) });
});
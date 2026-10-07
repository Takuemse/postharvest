import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { createDemandSchema } from "../validators/demand";
import { closeDemand, createDemand, getDemand, listDemands } from "../services/demandService";

export const demandRouter = Router();

demandRouter.use(requireAuth, requireRole("BUYER"));

function idParam(value: unknown): string {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) throw new AppError(404, "Request not found.");
  return parsed.data;
}

demandRouter.post("/", async (req, res) => {
  const input = createDemandSchema.parse(req.body);
  res.status(201).json({ success: true, data: await createDemand(req.user!.id, input) });
});

demandRouter.get("/", async (req, res) => {
  res.json({ success: true, data: await listDemands(req.user!.id) });
});

demandRouter.get("/:id", async (req, res) => {
  res.json({ success: true, data: await getDemand(req.user!.id, idParam(req.params.id)) });
});

demandRouter.post("/:id/close", async (req, res) => {
  res.json({ success: true, data: await closeDemand(req.user!.id, idParam(req.params.id)) });
});
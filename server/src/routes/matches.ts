import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { matchesForDemand, matchesForHarvest } from "../services/matchingService";

export const matchRouter = Router();

function idParam(value: unknown): string {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) throw new AppError(404, "Not found.");
  return parsed.data;
}

matchRouter.get("/harvests/:id", requireAuth, requireRole("FARMER"), async (req, res) => {
  res.json({ success: true, data: await matchesForHarvest(req.user!.id, idParam(req.params.id)) });
});

matchRouter.get("/demands/:id", requireAuth, requireRole("BUYER"), async (req, res) => {
  res.json({ success: true, data: await matchesForDemand(req.user!.id, idParam(req.params.id)) });
});
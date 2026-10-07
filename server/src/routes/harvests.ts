import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { createHarvestSchema, updateHarvestSchema } from "../validators/harvest";
import {
  createHarvest,
  getHarvest,
  listHarvests,
  updateHarvest,
  withdrawHarvest,
} from "../services/harvestService";

export const harvestRouter = Router();

harvestRouter.use(requireAuth, requireRole("FARMER"));

function idParam(value: unknown): string {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) throw new AppError(404, "Harvest not found.");
  return parsed.data;
}

harvestRouter.post("/", async (req, res) => {
  const input = createHarvestSchema.parse(req.body);
  res.status(201).json({ success: true, data: await createHarvest(req.user!.id, input) });
});

harvestRouter.get("/", async (req, res) => {
  res.json({ success: true, data: await listHarvests(req.user!.id) });
});

harvestRouter.get("/:id", async (req, res) => {
  res.json({ success: true, data: await getHarvest(req.user!.id, idParam(req.params.id)) });
});

harvestRouter.patch("/:id", async (req, res) => {
  const input = updateHarvestSchema.parse(req.body);
  res.json({ success: true, data: await updateHarvest(req.user!.id, idParam(req.params.id), input) });
});

harvestRouter.post("/:id/withdraw", async (req, res) => {
  res.json({ success: true, data: await withdrawHarvest(req.user!.id, idParam(req.params.id)) });
});
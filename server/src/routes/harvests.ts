import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { createHarvestSchema } from "../validators/harvest";
import { createHarvest, getHarvest, listHarvests } from "../services/harvestService";

export const harvestRouter = Router();

harvestRouter.use(requireAuth, requireRole("FARMER"));

harvestRouter.post("/", async (req, res) => {
  const input = createHarvestSchema.parse(req.body);
  const data = await createHarvest(req.user!.id, input);
  res.status(201).json({ success: true, data });
});

harvestRouter.get("/", async (req, res) => {
  res.json({ success: true, data: await listHarvests(req.user!.id) });
});

harvestRouter.get("/:id", async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) throw new AppError(404, "Harvest not found.");
  res.json({ success: true, data: await getHarvest(req.user!.id, id.data) });
});
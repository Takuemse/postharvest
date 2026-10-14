import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { browseSupply } from "../services/marketplaceService";
import { browseQuerySchema } from "../validators/marketplace";

export const marketplaceRouter = Router();

marketplaceRouter.get("/", requireAuth, requireRole("BUYER"), async (req, res) => {
  const query = browseQuerySchema.parse(req.query);
  res.json({ success: true, data: await browseSupply(req.user!.id, query) });
});
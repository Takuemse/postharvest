import { Router } from "express";
import { prisma } from "../lib/prisma";

export const referenceRouter = Router();

referenceRouter.get("/locations", async (_req, res) => {
  const data = await prisma.location.findMany({
    orderBy: [{ province: "asc" }, { name: "asc" }],
  });
  res.json({ success: true, data });
});

referenceRouter.get("/crops", async (_req, res) => {
  const data = await prisma.crop.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { shelfLives: true },
  });
  res.json({ success: true, data });
});
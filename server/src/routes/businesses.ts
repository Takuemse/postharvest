import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const businessRouter = Router();

businessRouter.get("/", requireAuth, requireRole("BUYER"), async (req, res) => {
  const rows = await prisma.business.findMany({
    where: { ownerId: req.user!.id },
    include: { location: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({
    success: true,
    data: rows.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      location: { id: b.location.id, name: b.location.name, province: b.location.province },
    })),
  });
});
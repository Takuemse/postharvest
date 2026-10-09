import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { listNotifications, markAllRead, markRead } from "../services/notificationService";

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get("/", async (req, res) => {
  res.json({ success: true, data: await listNotifications(req.user!.id) });
});

notificationRouter.post("/read-all", async (req, res) => {
  res.json({ success: true, data: await markAllRead(req.user!.id) });
});

notificationRouter.post("/:id/read", async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) throw new AppError(404, "Not found.");
  res.json({ success: true, data: await markRead(req.user!.id, id.data) });
});
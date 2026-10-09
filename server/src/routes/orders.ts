import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { createOrderSchema, reasonSchema } from "../validators/order";
import {
  cancelOrder, completeOrder, confirmOrder, createOrder, getOrder, listOrders, readyOrder,
} from "../services/orderService";

export const orderRouter = Router();

orderRouter.use(requireAuth, requireRole("FARMER", "BUYER"));

function idParam(value: unknown): string {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) throw new AppError(404, "Order not found.");
  return parsed.data;
}
const uid = (req: { user?: { id: string } }) => req.user!.id;

orderRouter.post("/", async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  const side = req.user!.role as "FARMER" | "BUYER";
  res.status(201).json({ success: true, data: await createOrder(uid(req), side, input) });
});

orderRouter.get("/", async (req, res) => {
  res.json({ success: true, data: await listOrders(uid(req)) });
});

orderRouter.get("/:id", async (req, res) => {
  res.json({ success: true, data: await getOrder(uid(req), idParam(req.params.id)) });
});

orderRouter.post("/:id/confirm", async (req, res) => {
  res.json({ success: true, data: await confirmOrder(uid(req), idParam(req.params.id)) });
});

orderRouter.post("/:id/ready", async (req, res) => {
  res.json({ success: true, data: await readyOrder(uid(req), idParam(req.params.id)) });
});

orderRouter.post("/:id/complete", async (req, res) => {
  res.json({ success: true, data: await completeOrder(uid(req), idParam(req.params.id)) });
});

orderRouter.post("/:id/decline", async (req, res) => {
  const { reason } = reasonSchema.parse(req.body ?? {});
  res.json({ success: true, data: await cancelOrder(uid(req), idParam(req.params.id), "decline", reason) });
});

orderRouter.post("/:id/cancel", async (req, res) => {
  const { reason } = reasonSchema.parse(req.body ?? {});
  res.json({ success: true, data: await cancelOrder(uid(req), idParam(req.params.id), "cancel", reason) });
});
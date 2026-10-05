import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { requireAuth } from "./middleware/auth";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ success: true, data: req.user });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Not found." });
});
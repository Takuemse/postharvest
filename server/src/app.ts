import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { requireAuth } from "./middleware/auth";
import { referenceRouter } from "./routes/reference";
import { authRouter } from "./routes/auth";
import { errorHandler } from "./middleware/error";


export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json());
// ...after the /api/auth/me route:
app.use("/api/reference", referenceRouter);

app.use("/api/auth", authRouter);

// ...after the 404 handler, at the very end:
app.use(errorHandler);

app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ success: true, data: req.user });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Not found." });
});
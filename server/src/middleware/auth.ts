import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { supabaseAdmin } from "../lib/supabase";

export type Role = "FARMER" | "BUYER" | "ADMIN";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role | null; email?: string; phone?: string };
    }
  }
}

// Suspension check. Cached briefly so it adds no database read to most requests.
// A suspend or reactivate clears the entry at once (on this server instance); with several
// instances, the worst case is a 15-second delay.
const ACTIVE_TTL_MS = 15_000;
const activeCache = new Map<string, { ok: boolean; at: number }>();

export function forgetAccountCache(id: string) {
  activeCache.delete(id);
}

async function accountIsActive(id: string): Promise<boolean> {
  const hit = activeCache.get(id);
  if (hit && Date.now() - hit.at < ACTIVE_TTL_MS) return hit.ok;

  const profile = await prisma.profile.findUnique({ where: { id }, select: { isActive: true } });
  const ok = profile ? profile.isActive : true; // no profile yet: a farmer mid-onboarding
  if (activeCache.size > 5000) activeCache.clear();
  activeCache.set(id, { ok, at: Date.now() });
  return ok;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: "Missing access token." });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error?.code === "user_banned") {
    return res.status(403).json({ success: false, message: "Your account is paused. Please contact PostHarvest support." });
  }
  if (error || !data.user) {
    return res.status(401).json({ success: false, message: "Invalid or expired session." });
  }

  if (!(await accountIsActive(data.user.id))) {
    return res.status(403).json({ success: false, message: "Your account is paused. Please contact PostHarvest support." });
  }

  req.user = {
    id: data.user.id,
    role: (data.user.app_metadata?.role ?? null) as Role | null,
    email: data.user.email,
    phone: data.user.phone,
  };
  next();
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You do not have access to this." });
    }
    next();
  };
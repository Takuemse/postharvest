import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase";

export type Role = "FARMER" | "BUYER" | "ADMIN";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role | null; email?: string; phone?: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: "Missing access token." });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ success: false, message: "Invalid or expired session." });
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
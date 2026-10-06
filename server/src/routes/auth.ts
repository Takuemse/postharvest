import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { supabaseAdmin } from "../lib/supabase";
import { assertLocation } from "../lib/locations";
import { AppError } from "../middleware/error";
import { requireAuth } from "../middleware/auth";
import { completeFarmerSchema, registerBuyerSchema } from "../validators/auth";
import { toE164 } from "../utils/phone";

export const authRouter = Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
});

authRouter.post("/register-buyer", registerLimiter, async (req, res) => {
  const body = registerBuyerSchema.parse(req.body);
  await assertLocation(body.business.locationId);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true, // dev convenience; production will verify email addresses
    app_metadata: { role: "BUYER" },
    user_metadata: { full_name: body.fullName },
  });

  if (error || !data.user) {
    if (error?.code === "email_exists") {
      throw new AppError(409, "An account with this email already exists.");
    }
    if (error?.code === "weak_password") {
      throw new AppError(422, "Please choose a stronger password.");
    }
    console.error("createUser failed:", error);
    throw new AppError(400, "We could not create the account.");
  }

  const userId = data.user.id;
  try {
    await prisma.profile.create({
      data: {
        id: userId,
        role: "BUYER",
        fullName: body.fullName,
        email: body.email,
        phone: body.phone ? toE164(body.phone) : null,
        businesses: {
          create: {
            name: body.business.name,
            type: body.business.type,
            locationId: body.business.locationId,
          },
        },
      },
    });
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(userId); // no orphaned logins
    throw err;
  }

  res.status(201).json({ success: true, data: { id: userId } });
});

authRouter.post("/complete-farmer", requireAuth, async (req, res) => {
  const user = req.user!;

  if (!user.phone) {
    throw new AppError(403, "Farmer accounts sign in with a phone number.");
  }
  if (user.role && user.role !== "FARMER") {
    throw new AppError(409, "This account is already set up with a different role.");
  }

  const body = completeFarmerSchema.parse(req.body);
  await assertLocation(body.farm.locationId);

  const existing = await prisma.profile.findUnique({ where: { id: user.id } });
  if (existing && existing.role !== "FARMER") {
    throw new AppError(409, "This account is already set up with a different role.");
  }

  if (!existing) {
    await prisma.profile.create({
      data: {
        id: user.id,
        role: "FARMER",
        fullName: body.fullName,
        phone: toE164(user.phone),
        farms: { create: { name: body.farm.name, locationId: body.farm.locationId } },
      },
    });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    app_metadata: { role: "FARMER" },
  });
  if (error) {
    console.error("setting farmer role failed:", error);
    throw new AppError(502, "Your details were saved, but we could not finish setup. Please try again.");
  }

  res.status(existing ? 200 : 201).json({ success: true, data: { id: user.id, role: "FARMER" } });
});
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { supabaseAdmin } from "../lib/supabase";
import { AppError } from "../middleware/error";
import { forgetAccountCache } from "../middleware/auth";
import { todayInHarare } from "../utils/harvestStatus";
import { suspensionBlocker } from "../utils/adminRules";
import type { UsersQuery } from "../validators/admin";

const PAGE_SIZE = 25;
const TX = { maxWait: 10_000, timeout: 30_000 };
const STATUSES = ["REQUESTED", "CONFIRMED", "READY", "COMPLETED", "CANCELLED"] as const;

// Counts only. Every figure is a plain count or sum of stored facts.
export async function overview() {
  const today = todayInHarare().toISOString().slice(0, 10);

  const [people, supply, demand, orderRows] = await Promise.all([
    prisma.profile.groupBy({ by: ["role", "isActive"], _count: { _all: true } }),
    prisma.$queryRaw<{ lots: number; kg: string }[]>`
      SELECT COUNT(*) FILTER (WHERE "quantityKg" - "reservedKg" - "soldKg" > 0)::int AS lots,
             COALESCE(SUM(GREATEST("quantityKg" - "reservedKg" - "soldKg", 0)), 0)::text AS kg
      FROM "harvests" WHERE "status" = 'ACTIVE'`,
    prisma.$queryRaw<{ requests: number; kg: string }[]>`
      SELECT COUNT(*) FILTER (WHERE "quantityKg" - "fulfilledKg" > 0)::int AS requests,
             COALESCE(SUM(GREATEST("quantityKg" - "fulfilledKg", 0)), 0)::text AS kg
      FROM "demands" WHERE "status" = 'OPEN' AND "neededBy" >= ${today}::date`,
    prisma.$queryRaw<{ status: string; orders: number; kg: string }[]>`
      SELECT o."status"::text AS status,
             COUNT(DISTINCT o."id")::int AS orders,
             COALESCE(SUM(oi."quantityKg"), 0)::text AS kg
      FROM "orders" o LEFT JOIN "order_items" oi ON oi."orderId" = o."id"
      GROUP BY o."status"`,
  ]);

  const countPeople = (role: string) =>
    people.filter((p) => p.role === role).reduce((s, p) => s + p._count._all, 0);

  return {
    people: {
      farmers: countPeople("FARMER"),
      buyers: countPeople("BUYER"),
      admins: countPeople("ADMIN"),
      suspended: people.filter((p) => !p.isActive).reduce((s, p) => s + p._count._all, 0),
    },
    supply: { harvestsWithStock: supply[0]?.lots ?? 0, availableKg: Number(supply[0]?.kg ?? 0) },
    demand: { openRequests: demand[0]?.requests ?? 0, neededKg: Number(demand[0]?.kg ?? 0) },
    orders: STATUSES.map((status) => {
      const row = orderRows.find((r) => r.status === status);
      return { status, orders: row?.orders ?? 0, kg: Number(row?.kg ?? 0) };
    }),
  };
}

export async function listUsers(q: UsersQuery) {
  const where: Prisma.ProfileWhereInput = {
    ...(q.role ? { role: q.role } : {}),
    ...(q.status ? { isActive: q.status === "active" } : {}),
    ...(q.q
      ? {
          OR: [
            { fullName: { contains: q.q, mode: "insensitive" } },
            { email: { contains: q.q, mode: "insensitive" } },
            { phone: { contains: q.q } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        role: true,
        fullName: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        farms: { select: { name: true, location: { select: { name: true } } }, take: 1 },
        businesses: { select: { name: true, location: { select: { name: true } } }, take: 1 },
      },
    }),
  ]);

  // The most recent suspension for each suspended person, so admins can see why.
  const suspendedIds = rows.filter((r) => !r.isActive).map((r) => r.id);
  const actions = suspendedIds.length
    ? await prisma.adminAction.findMany({
        where: { targetId: { in: suspendedIds }, action: "SUSPEND_USER" },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const latest = new Map<string, { reason: string; at: Date }>();
  for (const a of actions) if (a.targetId && !latest.has(a.targetId)) latest.set(a.targetId, { reason: a.reason, at: a.createdAt });

  const items = rows.map((r) => {
    const place = r.farms[0] ?? r.businesses[0] ?? null;
    return {
      id: r.id,
      role: r.role,
      fullName: r.fullName,
      phone: r.phone,
      email: r.email,
      isActive: r.isActive,
      createdAt: r.createdAt,
      place: place ? { name: place.name, town: place.location.name } : null,
      suspension: r.isActive ? null : (latest.get(r.id) ?? null),
    };
  });

  return { items, total, page: q.page, pageSize: PAGE_SIZE, hasMore: q.page * PAGE_SIZE < total };
}

// Suspending changes who can use the platform, so it always leaves a record: who, whom, why, when.
// The person's orders and requests are left exactly as they are.
export async function setAccountActive(adminId: string, targetId: string, active: boolean, reason: string) {
  const target = await prisma.profile.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, fullName: true, isActive: true },
  });
  if (!target) throw new AppError(404, "Account not found.");

  if (!active) {
    const blocked = suspensionBlocker(adminId, target);
    if (blocked) throw new AppError(409, blocked);
  }
  if (target.isActive === active) {
    throw new AppError(409, active ? "This account is already active." : "This account is already suspended.");
  }

  await prisma.$transaction(async (tx) => {
    const changed = await tx.profile.updateMany({
      where: { id: targetId, isActive: !active },
      data: { isActive: active },
    });
    if (changed.count === 0) throw new AppError(409, "This account was just changed by someone else. Refresh and try again.");

    await tx.adminAction.create({
      data: {
        adminId,
        action: active ? "REACTIVATE_USER" : "SUSPEND_USER",
        targetId,
        reason,
        details: { fullName: target.fullName, role: target.role },
      },
    });
  }, TX);
  forgetAccountCache(targetId);

  // Second layer: block (or unblock) signing in at Supabase. The API check above is the real boundary.
  let signInSynced = true;
  const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
    ban_duration: active ? "none" : "876000h",
  });
  if (error) {
    signInSynced = false;
    console.error("Supabase ban update failed for", targetId, error);
  }

  return { id: targetId, isActive: active, signInSynced };
}
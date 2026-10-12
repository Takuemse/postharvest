import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

type Db = Pick<Prisma.TransactionClient, "notification">;

export function notify(
  db: Db,
  n: {
    profileId: string;
    type:
      | "ORDER_REQUESTED"
      | "ORDER_CONFIRMED"
      | "ORDER_READY"
      | "ORDER_COMPLETED"
      | "ORDER_CANCELLED"
      | "DEMAND_MATCH"
      | "HARVEST_AT_RISK";
    title: string;
    body?: string | null;
    orderId?: string;
    harvestId?: string;
  },
) {
  const data: Record<string, string> = {};
  if (n.orderId) data.orderId = n.orderId;
  if (n.harvestId) data.harvestId = n.harvestId;
  return db.notification.create({
    data: { profileId: n.profileId, type: n.type, title: n.title, body: n.body ?? null, data },
  });
}

function hrefOf(data: unknown): string | null {
  const d = data as { orderId?: string; harvestId?: string } | null;
  if (d?.orderId) return `/orders/${d.orderId}`;
  if (d?.harvestId) return `/harvests/${d.harvestId}`;
  return null;
}

export async function listNotifications(userId: string) {
  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({ where: { profileId: userId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.notification.count({ where: { profileId: userId, readAt: null } }),
  ]);
  return {
    unread,
    items: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      href: hrefOf(n.data),
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
  };
}

export async function markRead(userId: string, id: string) {
  const r = await prisma.notification.updateMany({
    where: { id, profileId: userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: r.count };
}

export async function markAllRead(userId: string) {
  const r = await prisma.notification.updateMany({
    where: { profileId: userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: r.count };
}
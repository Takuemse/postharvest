import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";
import { todayInHarare } from "../utils/harvestStatus";
import { evaluateMatch } from "../utils/matching";
import { allowedActions, contactVisible, holdsStock, type Side } from "../utils/orderRules";
import { demandFacts, harvestFacts, harvestInclude } from "./matchingService";
import type { CreateOrderInput } from "../validators/order";

const TX = { maxWait: 10_000, timeout: 30_000 };

const include = {
  business: { include: { owner: true, location: true } },
  farm: { include: { owner: true, location: true } },
  items: { include: { harvest: { include: { crop: true } } } },
  demand: { include: { location: true } },
} satisfies Prisma.OrderInclude;
type OrderRow = Prisma.OrderGetPayload<{ include: typeof include }>;
type Tx = Prisma.TransactionClient;

const changed = () => new AppError(409, "This order has just changed. Please reload.");
const starter = (o: OrderRow) => o.initiatedBy as Side;

function sideOf(o: OrderRow, userId: string): Side | null {
  if (o.farm.ownerId === userId) return "FARMER";
  if (o.business.ownerId === userId) return "BUYER";
  return null;
}

async function load(id: string, userId: string, client: Pick<Tx, "order"> = prisma) {
  const o = await client.order.findFirst({ where: { id }, include });
  const side = o ? sideOf(o, userId) : null;
  if (!o || !side) throw new AppError(404, "Order not found."); // 404, never 403: do not reveal other people's orders
  return { o, side };
}

export function present(o: OrderRow, side: Side) {
  const other =
    side === "BUYER"
      ? { name: o.farm.name, town: o.farm.location.name, owner: o.farm.owner }
      : { name: o.business.name, town: o.business.location.name, owner: o.business.owner };

  const totalKg = o.items.reduce((s, i) => s.plus(i.quantityKg), new Prisma.Decimal(0));
  const priced = o.items.length > 0 && o.items.every((i) => i.pricePerKg !== null);
  const oneCurrency = new Set(o.items.map((i) => i.currency)).size === 1;
  const value =
    priced && oneCurrency
      ? {
          amount: o.items.reduce((s, i) => s.plus(i.quantityKg.mul(i.pricePerKg!)), new Prisma.Decimal(0)).toNumber(),
          currency: o.items[0].currency,
        }
      : null;

  return {
    id: o.id,
    status: o.status,
    mySide: side,
    iStarted: starter(o) === side,
    counterpart: {
      name: other.name,
      town: other.town,
      contact: contactVisible(o.status) ? { name: other.owner.fullName, phone: other.owner.phone } : null,
    },
    deliverTo: o.demand?.location.name ?? null,
    items: o.items.map((i) => ({
      harvestId: i.harvestId,
      crop: i.harvest.crop.name,
      quantityKg: i.quantityKg.toNumber(),
      pricePerKg: i.pricePerKg?.toNumber() ?? null,
      currency: i.currency,
    })),
    totalKg: totalKg.toNumber(),
    value,
    actions: allowedActions(o.status, side, starter(o)),
    note: o.note,
    cancelReason: o.cancelReason,
    createdAt: o.createdAt,
    confirmedAt: o.confirmedAt,
    readyAt: o.readyAt,
    completedAt: o.completedAt,
    cancelledAt: o.cancelledAt,
  };
}

export async function getOrder(userId: string, id: string) {
  const { o, side } = await load(id, userId);
  return present(o, side);
}

export async function listOrders(userId: string) {
  const rows = await prisma.order.findMany({
    where: { OR: [{ farm: { ownerId: userId } }, { business: { ownerId: userId } }] },
    include,
    orderBy: { createdAt: "desc" },
  });
  const mine = rows.flatMap((o) => {
    const side = sideOf(o, userId);
    return side ? [present(o, side)] : [];
  });
  const needsMe = (o: (typeof mine)[number]) =>
    o.actions.some((a) => a === "confirm" || a === "ready" || a === "complete");
  return mine.sort((a, b) => Number(needsMe(b)) - Number(needsMe(a)));
}

// Created from a match. Nothing is reserved yet: only confirmation reserves stock.
export async function createOrder(userId: string, side: Side, input: CreateOrderInput) {
  const [harvest, demand] = await Promise.all([
    prisma.harvest.findFirst({ where: { id: input.harvestId, status: "ACTIVE" }, include: harvestInclude }),
    prisma.demand.findFirst({ where: { id: input.demandId, status: "OPEN" }, include: { business: true, location: true } }),
  ]);
  const gone = new AppError(404, "That match is no longer available.");
  if (!harvest || !demand) throw gone;

  const mine = side === "FARMER" ? harvest.farm.ownerId === userId : demand.business.ownerId === userId;
  if (!mine) throw gone;

  const today = todayInHarare();
  const hf = harvestFacts(harvest);
  if (!hf || demand.neededBy < today) throw new AppError(409, "This is no longer a match.");

  // Re-run the engine on the server: nobody can order something that is not a match.
  const m = evaluateMatch(hf, demandFacts(demand), today);
  if (!m.eligible) throw new AppError(409, "This is no longer a match.");

  const qty = input.quantityKg ?? m.matchedKg;
  if (qty > m.matchedKg) throw new AppError(422, `You can order at most ${m.matchedKg} kg.`);

  const duplicate = await prisma.order.findFirst({
    where: {
      demandId: demand.id,
      status: { in: ["REQUESTED", "CONFIRMED", "READY"] },
      items: { some: { harvestId: harvest.id } },
    },
  });
  if (duplicate) throw new AppError(409, "There is already an open order for this match.");

  const created = await prisma.order.create({
    data: {
      businessId: demand.businessId,
      farmId: harvest.farmId,
      demandId: demand.id,
      initiatedBy: side,
      items: {
        create: {
          harvestId: harvest.id,
          quantityKg: qty,
          pricePerKg: harvest.askingPricePerKg, // copied: a later price edit cannot change this order
          currency: harvest.currency,
        },
      },
    },
    include,
  });
  return present(created, side);
}

export async function confirmOrder(userId: string, id: string) {
  // Reads and checks happen first, outside the transaction. The conditional updates
  // inside it remain the real guard against overselling.
  const { o, side } = await load(id, userId);
  if (!allowedActions(o.status, side, starter(o)).includes("confirm")) {
    throw new AppError(409, "This order cannot be confirmed.");
  }
  if (!o.demandId) throw new AppError(409, "The request for this order is no longer available.");
  const demandId = o.demandId;

  const demand = await prisma.demand.findUnique({ where: { id: demandId } });
  if (!demand || demand.status !== "OPEN" || demand.neededBy < todayInHarare()) {
    throw new AppError(409, "The request this order was for is no longer open.");
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id, status: "REQUESTED" },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    if (claimed.count === 0) throw changed();

    let total = new Prisma.Decimal(0);
    for (const item of o.items) {
      const qty = item.quantityKg.toString();
      const reserved = await tx.$executeRaw`
        UPDATE "harvests"
        SET "reservedKg" = "reservedKg" + ${qty}::numeric, "updatedAt" = now()
        WHERE "id" = ${item.harvestId}::uuid
          AND "status" = 'ACTIVE'
          AND "reservedKg" + "soldKg" + ${qty}::numeric <= "quantityKg"`;
      if (reserved === 0) {
        const hv = await tx.harvest.findUnique({ where: { id: item.harvestId } });
        if (!hv || hv.status !== "ACTIVE") throw new AppError(409, "This harvest is no longer available.");
        const left = hv.quantityKg.minus(hv.reservedKg).minus(hv.soldKg).toNumber();
        throw new AppError(409, `Only ${left} kg is still available.`);
      }
      total = total.plus(item.quantityKg);
    }

    const t = total.toString();
    const filled = await tx.$executeRaw`
      UPDATE "demands"
      SET "fulfilledKg" = "fulfilledKg" + ${t}::numeric, "updatedAt" = now()
      WHERE "id" = ${demandId}::uuid
        AND "status" = 'OPEN'
        AND "fulfilledKg" + ${t}::numeric <= "quantityKg"`;
    if (filled === 0) {
      const left = demand.quantityKg.minus(demand.fulfilledKg).toNumber();
      throw new AppError(409, `That request now only needs ${left} kg.`);
    }
  }, TX);
  return getOrder(userId, id);
}

export async function completeOrder(userId: string, id: string) {
  const { o, side } = await load(id, userId);
  if (!allowedActions(o.status, side, starter(o)).includes("complete")) {
    throw new AppError(409, "This order cannot be marked received yet.");
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id, status: "READY" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (claimed.count === 0) throw changed();

    for (const item of o.items) {
      const qty = item.quantityKg.toString();
      const moved = await tx.$executeRaw`
        UPDATE "harvests"
        SET "reservedKg" = "reservedKg" - ${qty}::numeric,
            "soldKg" = "soldKg" + ${qty}::numeric,
            "updatedAt" = now()
        WHERE "id" = ${item.harvestId}::uuid AND "reservedKg" >= ${qty}::numeric`;
      if (moved === 0) {
        console.error("Stock mismatch completing order", id);
        throw new AppError(409, "Stock records do not match. Please contact support.");
      }
    }
  }, TX);
  return getOrder(userId, id);
}

export async function cancelOrder(userId: string, id: string, kind: "cancel" | "decline", reason?: string) {
  const { o, side } = await load(id, userId);
  if (!allowedActions(o.status, side, starter(o)).includes(kind)) {
    throw new AppError(409, "This order can no longer be cancelled.");
  }
  const previous = o.status;
  const text = kind === "decline" ? `Declined${reason ? `: ${reason}` : ""}` : (reason ?? null);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id, status: previous },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: text },
    });
    if (claimed.count === 0) throw changed();

    if (!holdsStock(previous)) return; // a pending request reserved nothing

    let total = new Prisma.Decimal(0);
    for (const item of o.items) {
      const qty = item.quantityKg.toString();
      const released = await tx.$executeRaw`
        UPDATE "harvests"
        SET "reservedKg" = "reservedKg" - ${qty}::numeric, "updatedAt" = now()
        WHERE "id" = ${item.harvestId}::uuid AND "reservedKg" >= ${qty}::numeric`;
      if (released === 0) {
        console.error("Stock mismatch cancelling order", id);
        throw new AppError(409, "Stock records do not match. Please contact support.");
      }
      total = total.plus(item.quantityKg);
    }
    if (o.demandId) {
      const t = total.toString();
      await tx.$executeRaw`
        UPDATE "demands"
        SET "fulfilledKg" = "fulfilledKg" - ${t}::numeric, "updatedAt" = now()
        WHERE "id" = ${o.demandId}::uuid AND "fulfilledKg" >= ${t}::numeric`;
    }
  }, TX);
  return getOrder(userId, id);
}
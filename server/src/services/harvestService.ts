import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";
import { computeUrgency, stockState, todayInHarare } from "../utils/harvestStatus";
import type { CreateHarvestInput, UpdateHarvestInput } from "../validators/harvest";

const include = {
  crop: { include: { shelfLives: true } },
  farm: { include: { location: true } },
} satisfies Prisma.HarvestInclude;

type HarvestRow = Prisma.HarvestGetPayload<{ include: typeof include }>;

const day = (d: Date) => d.toISOString().slice(0, 10);
const RANK = { URGENT: 0, ATTENTION: 1, SAFE: 2 } as const;

// Everything derived (availability, stock state, urgency) is computed here, never stored.
export function present(h: HarvestRow, today = todayInHarare()) {
  const availableKg = h.quantityKg.minus(h.reservedKg).minus(h.soldKg);
  const quantityKg = h.quantityKg.toNumber();
  const reservedKg = h.reservedKg.toNumber();
  const soldKg = h.soldKg.toNumber();
  const shelf = h.crop.shelfLives.find((s) => s.storage === h.storage);
  const life = shelf
    ? computeUrgency({ harvestDate: h.harvestDate, shelfLifeDays: shelf.days, today })
    : null;

  return {
    id: h.id,
    status: h.status,
    farm: {
      id: h.farm.id,
      name: h.farm.name,
      location: { id: h.farm.location.id, name: h.farm.location.name, province: h.farm.location.province },
    },
    crop: { id: h.crop.id, name: h.crop.name, category: h.crop.category },
    harvestDate: day(h.harvestDate),
    availableFrom: day(h.availableFrom),
    storage: h.storage,
    quantityKg,
    reservedKg,
    soldKg,
    availableKg: availableKg.toNumber(),
    stockState: stockState(quantityKg, reservedKg, soldKg),
    shelfLifeDays: shelf?.days ?? null,
    urgency: life?.urgency ?? null,
    ageDays: life?.ageDays ?? null,
    daysRemaining: life?.daysRemaining ?? null,
    pastShelfLife: life?.pastShelfLife ?? false,
    askingPricePerKg: h.askingPricePerKg?.toNumber() ?? null,
    currency: h.currency,
    notes: h.notes,
    createdAt: h.createdAt,
  };
}

function parseDay(value: string): Date {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new AppError(422, "Choose a valid harvest date.");
  return d;
}

function assertHarvestDate(harvestDate: Date, shelfDays: number) {
  const today = todayInHarare();
  if (harvestDate > today) throw new AppError(422, "The harvest date cannot be in the future.");
  const ageDays = Math.floor((today.getTime() - harvestDate.getTime()) / 86_400_000);
  if (ageDays > shelfDays + 30) {
    throw new AppError(422, "That harvest date looks too far back. Please check the date.");
  }
}

export async function createHarvest(ownerId: string, input: CreateHarvestInput) {
  const farms = await prisma.farm.findMany({ where: { ownerId } });
  const farm = input.farmId
    ? farms.find((f) => f.id === input.farmId)
    : farms.length === 1
      ? farms[0]
      : undefined;
  if (!farm) {
    throw new AppError(422, input.farmId ? "That farm was not found." : "Please choose which farm this harvest is from.");
  }

  const crop = await prisma.crop.findFirst({
    where: { id: input.cropId, isActive: true },
    include: { shelfLives: true },
  });
  if (!crop) throw new AppError(422, "That crop is not available.");
  const shelf = crop.shelfLives.find((s) => s.storage === input.storage);
  if (!shelf) {
    throw new AppError(422, "We do not have shelf-life data for that crop and storage yet.");
  }

  const harvestDate = parseDay(input.harvestDate);
  assertHarvestDate(harvestDate, shelf.days);

  const created = await prisma.harvest.create({
    data: {
      farmId: farm.id,
      cropId: crop.id,
      harvestDate,
      availableFrom: harvestDate,
      storage: input.storage,
      quantityKg: input.quantityKg,
      askingPricePerKg: input.askingPricePerKg,
      currency: input.currency,
      notes: input.notes,
    },
    include,
  });
  return present(created);
}

export async function listHarvests(ownerId: string) {
  const rows = await prisma.harvest.findMany({
    where: { farm: { ownerId }, status: "ACTIVE" },
    include,
  });
  const today = todayInHarare();
  return rows
    .map((r) => present(r, today))
    .sort((a, b) => {
      const aGone = a.stockState === "SOLD_OUT" ? 1 : 0;
      const bGone = b.stockState === "SOLD_OUT" ? 1 : 0;
      if (aGone !== bGone) return aGone - bGone; // sold-out last
      const ra = a.urgency ? RANK[a.urgency] : 3;
      const rb = b.urgency ? RANK[b.urgency] : 3;
      if (ra !== rb) return ra - rb; // most urgent first
      return (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999);
    });
}

export async function getHarvest(ownerId: string, id: string) {
  const row = await prisma.harvest.findFirst({ where: { id, farm: { ownerId } }, include });
  if (!row) throw new AppError(404, "Harvest not found."); // 404, not 403: do not reveal other farmers' records
  return present(row);
}

export async function updateHarvest(ownerId: string, id: string, input: UpdateHarvestInput) {
  const row = await prisma.harvest.findFirst({
    where: { id, status: "ACTIVE", farm: { ownerId } },
    include,
  });
  if (!row) throw new AppError(404, "Harvest not found.");

  // Never let an edit silently break a commitment to a buyer.
  const promised = row.reservedKg.plus(row.soldKg);
  if (input.quantityKg !== undefined && promised.greaterThan(input.quantityKg)) {
    throw new AppError(
      409,
      `${promised.toNumber()} kg is already promised to buyers, so the quantity cannot be lower than that.`,
    );
  }

  const nextStorage = input.storage ?? row.storage;
  const shelf = row.crop.shelfLives.find((s) => s.storage === nextStorage);
  if (!shelf) throw new AppError(422, "We do not have shelf-life data for that crop and storage yet.");

  const nextDate = input.harvestDate ? parseDay(input.harvestDate) : row.harvestDate;
  assertHarvestDate(nextDate, shelf.days);

  const updated = await prisma.harvest.update({
    where: { id },
    data: {
      ...(input.quantityKg !== undefined && { quantityKg: input.quantityKg }),
      ...(input.harvestDate && { harvestDate: nextDate, availableFrom: nextDate }),
      ...(input.storage && { storage: input.storage }),
      ...(input.askingPricePerKg !== undefined && { askingPricePerKg: input.askingPricePerKg }),
      ...(input.currency && { currency: input.currency }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    include,
  });
  return present(updated);
}

// One conditional update: only succeeds when nothing is reserved or sold.
export async function withdrawHarvest(ownerId: string, id: string) {
  const { count } = await prisma.harvest.updateMany({
    where: { id, status: "ACTIVE", farm: { ownerId }, reservedKg: 0, soldKg: 0 },
    data: { status: "WITHDRAWN" },
  });
  if (count === 1) return { id, status: "WITHDRAWN" as const };

  const exists = await prisma.harvest.findFirst({ where: { id, status: "ACTIVE", farm: { ownerId } } });
  if (!exists) throw new AppError(404, "Harvest not found.");
  throw new AppError(409, "This harvest has produce promised to buyers, so it cannot be withdrawn.");
}
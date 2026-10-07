import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";
import { daysUntil, demandState } from "../utils/demandStatus";
import { todayInHarare } from "../utils/harvestStatus";
import type { CreateDemandInput } from "../validators/demand";

const MAX_LEAD_DAYS = 90; // keep in sync with the date limit in the client form

const include = { crop: true, location: true, business: true } satisfies Prisma.DemandInclude;
type Row = Prisma.DemandGetPayload<{ include: typeof include }>;

const day = (d: Date) => d.toISOString().slice(0, 10);
const GROUP = { OPEN: 0, PARTLY_FULFILLED: 0, OVERDUE: 0, FULFILLED: 1, CLOSED: 2, CANCELLED: 2 } as const;

export function present(d: Row, today = todayInHarare()) {
  const quantityKg = d.quantityKg.toNumber();
  const fulfilledKg = d.fulfilledKg.toNumber();
  const days = daysUntil(d.neededBy, today);
  return {
    id: d.id,
    business: { id: d.business.id, name: d.business.name },
    crop: { id: d.crop.id, name: d.crop.name },
    location: { id: d.location.id, name: d.location.name, province: d.location.province },
    quantityKg,
    fulfilledKg,
    remainingKg: d.quantityKg.minus(d.fulfilledKg).toNumber(),
    neededBy: day(d.neededBy),
    daysUntilNeeded: days,
    state: demandState({ status: d.status, quantityKg, fulfilledKg, daysUntilNeeded: days }),
    maxPricePerKg: d.maxPricePerKg?.toNumber() ?? null,
    currency: d.currency,
    notes: d.notes,
    createdAt: d.createdAt,
  };
}

export async function createDemand(ownerId: string, input: CreateDemandInput) {
  const businesses = await prisma.business.findMany({ where: { ownerId } });
  const business = input.businessId
    ? businesses.find((b) => b.id === input.businessId)
    : businesses.length === 1
      ? businesses[0]
      : undefined;
  if (!business) {
    throw new AppError(422, input.businessId ? "That business was not found." : "Please choose which business this request is for.");
  }

  const crop = await prisma.crop.findFirst({ where: { id: input.cropId, isActive: true } });
  if (!crop) throw new AppError(422, "That crop is not available.");

  const locationId = input.locationId ?? business.locationId;
  if (!(await prisma.location.findUnique({ where: { id: locationId } }))) {
    throw new AppError(422, "Please choose a valid location.");
  }

  const neededBy = new Date(`${input.neededBy}T00:00:00.000Z`);
  if (Number.isNaN(neededBy.getTime())) throw new AppError(422, "Choose a valid date.");
  const today = todayInHarare();
  if (neededBy < today) throw new AppError(422, "The date you need it by cannot be in the past.");
  if (daysUntil(neededBy, today) > MAX_LEAD_DAYS) {
    throw new AppError(422, "Please choose a date within the next 90 days.");
  }

  const created = await prisma.demand.create({
    data: {
      businessId: business.id,
      cropId: crop.id,
      quantityKg: input.quantityKg,
      neededBy,
      locationId,
      maxPricePerKg: input.maxPricePerKg,
      currency: input.currency,
      notes: input.notes,
    },
    include,
  });
  return present(created);
}

export async function listDemands(ownerId: string) {
  const rows = await prisma.demand.findMany({ where: { business: { ownerId } }, include });
  const today = todayInHarare();
  return rows
    .map((r) => present(r, today))
    .sort((a, b) => GROUP[a.state] - GROUP[b.state] || a.daysUntilNeeded - b.daysUntilNeeded);
}

export async function getDemand(ownerId: string, id: string) {
  const row = await prisma.demand.findFirst({ where: { id, business: { ownerId } }, include });
  if (!row) throw new AppError(404, "Request not found."); // 404, never 403: do not reveal other buyers' records
  return present(row);
}

// Nothing fulfilled → CANCELLED. Something fulfilled → CLOSED. Allocated produce is never touched.
export async function closeDemand(ownerId: string, id: string) {
  const scope = { id, status: "OPEN" as const, business: { ownerId } };

  const cancelled = await prisma.demand.updateMany({
    where: { ...scope, fulfilledKg: 0 },
    data: { status: "CANCELLED" },
  });
  if (cancelled.count === 1) return getDemand(ownerId, id);

  const closed = await prisma.demand.updateMany({
    where: { ...scope, fulfilledKg: { gt: 0 } },
    data: { status: "CLOSED" },
  });
  if (closed.count === 1) return getDemand(ownerId, id);

  const exists = await prisma.demand.findFirst({ where: { id, business: { ownerId } } });
  if (!exists) throw new AppError(404, "Request not found.");
  throw new AppError(409, "This request is already closed.");
}
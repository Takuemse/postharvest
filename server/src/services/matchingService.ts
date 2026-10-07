import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";
import { todayInHarare } from "../utils/harvestStatus";
import {
  evaluateMatch,
  type DemandFacts,
  type Distance,
  type Eligible,
  type HarvestFacts,
} from "../utils/matching";

const MAX_RESULTS = 20;

const harvestInclude = {
  crop: { include: { shelfLives: true } },
  farm: { include: { location: true } },
} satisfies Prisma.HarvestInclude;
type HarvestRow = Prisma.HarvestGetPayload<{ include: typeof harvestInclude }>;

const day = (d: Date) => d.toISOString().slice(0, 10);
const fmtKg = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`;
const fmtDay = (d: Date) =>
  d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

const DISTANCE_TEXT: Record<Distance, string> = {
  SAME_TOWN: "Same town",
  SAME_PROVINCE: "Same province, about 1 day of travel",
  OTHER_PROVINCE: "Different province, about 2 days of travel",
};

function harvestFacts(h: HarvestRow): HarvestFacts | null {
  const shelf = h.crop.shelfLives.find((s) => s.storage === h.storage);
  const availableKg = h.quantityKg.minus(h.reservedKg).minus(h.soldKg).toNumber();
  if (!shelf || availableKg <= 0) return null;
  return {
    harvestDate: h.harvestDate,
    availableFrom: h.availableFrom,
    shelfLifeDays: shelf.days,
    availableKg,
    askingPricePerKg: h.askingPricePerKg?.toNumber() ?? null,
    currency: h.currency,
    locationId: h.farm.locationId,
    province: h.farm.location.province,
  };
}

function demandFacts(d: {
  neededBy: Date;
  quantityKg: Prisma.Decimal;
  fulfilledKg: Prisma.Decimal;
  maxPricePerKg: Prisma.Decimal | null;
  currency: string;
  locationId: number;
  location: { province: string };
}): DemandFacts {
  return {
    neededBy: d.neededBy,
    remainingKg: d.quantityKg.minus(d.fulfilledKg).toNumber(),
    maxPricePerKg: d.maxPricePerKg?.toNumber() ?? null,
    currency: d.currency,
    locationId: d.locationId,
    province: d.location.province,
  };
}

function farmerReasons(m: Eligible, h: HarvestFacts, d: DemandFacts): string[] {
  return [
    m.coversAll
      ? `They need ${fmtKg(d.remainingKg)} and you have enough`
      : `They need ${fmtKg(d.remainingKg)}; your ${fmtKg(h.availableKg)} covers part of it`,
    `Arrives with about ${days(m.daysLeftAtDelivery)} of shelf life left`,
    DISTANCE_TEXT[m.distance],
    `Could arrive by ${fmtDay(m.deliveryDate)}; they need it by ${fmtDay(d.neededBy)}`,
  ];
}

function buyerReasons(m: Eligible, d: DemandFacts): string[] {
  return [
    m.coversAll
      ? `Covers all ${fmtKg(d.remainingKg)} you need`
      : `Covers ${fmtKg(m.matchedKg)} of the ${fmtKg(d.remainingKg)} you need`,
    `About ${days(m.daysLeftAtDelivery)} of freshness left on delivery`,
    DISTANCE_TEXT[m.distance],
    `Could reach you by ${fmtDay(m.deliveryDate)}; you need it by ${fmtDay(d.neededBy)}`,
  ];
}

// Farmer view: open requests that could take this harvest. Never exposes the buyer's price limit or contact details.
export async function matchesForHarvest(ownerId: string, harvestId: string) {
  const h = await prisma.harvest.findFirst({
    where: { id: harvestId, status: "ACTIVE", farm: { ownerId } },
    include: harvestInclude,
  });
  if (!h) throw new AppError(404, "Harvest not found.");

  const hf = harvestFacts(h);
  if (!hf) return [];

  const today = todayInHarare();
  const demands = await prisma.demand.findMany({
    where: { cropId: h.cropId, status: "OPEN", neededBy: { gte: today } },
    include: { business: true, location: true },
  });

  const results = [];
  for (const d of demands) {
    const df = demandFacts(d);
    const m = evaluateMatch(hf, df, today);
    if (!m.eligible) continue;
    results.push({
      demandId: d.id,
      buyer: { name: d.business.name, type: d.business.type, town: d.location.name },
      requestedKg: df.remainingKg,
      neededBy: day(d.neededBy),
      matchedKg: m.matchedKg,
      score: m.score,
      fit: m.fit,
      coversAll: m.coversAll,
      delivery: { date: day(m.deliveryDate), transitDays: m.transitDays },
      daysLeftAtDelivery: m.daysLeftAtDelivery,
      reasons: farmerReasons(m, hf, df),
    });
  }
  return results.sort((a, b) => b.score - a.score || a.neededBy.localeCompare(b.neededBy)).slice(0, MAX_RESULTS);
}

// Buyer view: harvests that could fill this request. Never exposes the farmer's urgency or contact details.
export async function matchesForDemand(ownerId: string, demandId: string) {
  const d = await prisma.demand.findFirst({
    where: { id: demandId, business: { ownerId } },
    include: { location: true },
  });
  if (!d) throw new AppError(404, "Request not found.");

  const today = todayInHarare();
  const df = demandFacts(d);
  if (d.status !== "OPEN" || df.remainingKg <= 0 || d.neededBy < today) return [];

  const harvests = await prisma.harvest.findMany({
    where: { cropId: d.cropId, status: "ACTIVE" },
    include: harvestInclude,
  });

  const results = [];
  for (const h of harvests) {
    const hf = harvestFacts(h);
    if (!hf) continue;
    const m = evaluateMatch(hf, df, today);
    if (!m.eligible) continue;
    results.push({
      harvestId: h.id,
      farm: { name: h.farm.name, town: h.farm.location.name },
      availableKg: hf.availableKg,
      harvestDate: day(h.harvestDate),
      storage: h.storage,
      asking: hf.askingPricePerKg !== null ? { pricePerKg: hf.askingPricePerKg, currency: h.currency } : null,
      matchedKg: m.matchedKg,
      score: m.score,
      fit: m.fit,
      coversAll: m.coversAll,
      delivery: { date: day(m.deliveryDate), transitDays: m.transitDays },
      daysLeftAtDelivery: m.daysLeftAtDelivery,
      reasons: buyerReasons(m, df),
    });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS);
}
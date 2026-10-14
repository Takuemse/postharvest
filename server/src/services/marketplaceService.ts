import { prisma } from "../lib/prisma";
import { computeUrgency, todayInHarare } from "../utils/harvestStatus";
import { distanceRank, isBrowsable, type Place } from "../utils/marketplace";
import type { BrowseQuery } from "../validators/marketplace";
import { harvestFacts, harvestInclude } from "./matchingService";

const PAGE_SIZE = 20;
const day = (d: Date) => d.toISOString().slice(0, 10);

// Where "nearest" is measured from: the town the buyer filtered on, otherwise their business town.
async function referencePlace(userId: string, locationId?: number): Promise<Place | null> {
  if (locationId) {
    const l = await prisma.location.findUnique({ where: { id: locationId } });
    return l ? { locationId: l.id, province: l.province } : null;
  }
  const b = await prisma.business.findFirst({ where: { ownerId: userId }, include: { location: true } });
  return b ? { locationId: b.location.id, province: b.location.province } : null;
}

// Buyer view of supply. Never exposes urgency, freshness numbers, or any contact details.
export async function browseSupply(userId: string, q: BrowseQuery) {
  const today = todayInHarare();
  const place = q.locationId ? { id: q.locationId } : q.province ? { province: q.province } : undefined;

  const [ref, harvests] = await Promise.all([
    referencePlace(userId, q.locationId),
    prisma.harvest.findMany({
      where: {
        status: "ACTIVE",
        crop: { isActive: true },
        ...(q.cropId ? { cropId: q.cropId } : {}),
        ...(place ? { farm: { location: place } } : {}),
      },
      include: harvestInclude,
    }),
  ]);

  const filters = {
    minKg: q.minKg,
    availableBy: q.availableBy ? new Date(`${q.availableBy}T00:00:00.000Z`) : undefined,
    maxPrice: q.maxPrice,
    currency: q.currency,
  };

  const rows = [];
  for (const h of harvests) {
    const hf = harvestFacts(h);
    if (!hf) continue;
    const { daysRemaining } = computeUrgency({ harvestDate: h.harvestDate, shelfLifeDays: hf.shelfLifeDays, today });
    const ok = isBrowsable(
      {
        availableKg: hf.availableKg,
        daysRemaining,
        availableFrom: hf.availableFrom,
        askingPricePerKg: hf.askingPricePerKg,
        currency: hf.currency,
      },
      filters,
    );
    if (!ok) continue;
    rows.push({ h, hf, rank: distanceRank(ref, { locationId: hf.locationId, province: hf.province }) });
  }

  // Nearest first, then the most recently harvested, then the biggest lot.
  rows.sort(
    (a, b) =>
      a.rank - b.rank ||
      b.h.harvestDate.getTime() - a.h.harvestDate.getTime() ||
      b.hf.availableKg - a.hf.availableKg,
  );

  const start = (q.page - 1) * PAGE_SIZE;
  const items = rows.slice(start, start + PAGE_SIZE).map(({ h, hf }) => ({
    harvestId: h.id,
    crop: { id: h.crop.id, name: h.crop.name },
    farm: { name: h.farm.name, town: h.farm.location.name },
    availableKg: hf.availableKg,
    harvestDate: day(h.harvestDate),
    storage: h.storage,
    asking: hf.askingPricePerKg !== null ? { pricePerKg: hf.askingPricePerKg, currency: h.currency } : null,
  }));

  return { items, total: rows.length, page: q.page, pageSize: PAGE_SIZE, hasMore: start + PAGE_SIZE < rows.length };
}
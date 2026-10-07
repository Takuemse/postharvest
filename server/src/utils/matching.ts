const DAY = 86_400_000;
const diffDays = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / DAY);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

export type Distance = "SAME_TOWN" | "SAME_PROVINCE" | "OTHER_PROVINCE";
export type Fit = "STRONG" | "GOOD" | "POSSIBLE";

// Placeholder assumptions: validate with real farmers and transporters.
const TRANSIT_DAYS: Record<Distance, number> = { SAME_TOWN: 0, SAME_PROVINCE: 1, OTHER_PROVINCE: 2 };
const DISTANCE_POINTS: Record<Distance, number> = { SAME_TOWN: 20, SAME_PROVINCE: 12, OTHER_PROVINCE: 5 };
export const MIN_DAYS_LEFT_AT_DELIVERY = 1;

export type HarvestFacts = {
  harvestDate: Date;
  availableFrom: Date;
  shelfLifeDays: number;
  availableKg: number;
  askingPricePerKg: number | null;
  currency: string;
  locationId: number;
  province: string;
};

export type DemandFacts = {
  neededBy: Date;
  remainingKg: number;
  maxPricePerKg: number | null;
  currency: string;
  locationId: number;
  province: string;
};

export type MatchResult =
  | { eligible: false; reason: "NO_STOCK" | "NO_DEMAND" | "TOO_LATE" | "TOO_STALE" | "PRICE" }
  | {
      eligible: true;
      matchedKg: number;
      coversAll: boolean;
      score: number;
      fit: Fit;
      distance: Distance;
      transitDays: number;
      deliveryDate: Date;
      daysLeftAtDelivery: number;
    };

export type Eligible = Extract<MatchResult, { eligible: true }>;

export function fitLabel(score: number): Fit {
  return score >= 80 ? "STRONG" : score >= 60 ? "GOOD" : "POSSIBLE";
}

export function evaluateMatch(h: HarvestFacts, d: DemandFacts, today: Date): MatchResult {
  if (h.availableKg <= 0) return { eligible: false, reason: "NO_STOCK" };
  if (d.remainingKg <= 0) return { eligible: false, reason: "NO_DEMAND" };

  const distance: Distance =
    h.locationId === d.locationId ? "SAME_TOWN" : h.province === d.province ? "SAME_PROVINCE" : "OTHER_PROVINCE";
  const transitDays = TRANSIT_DAYS[distance];

  const start = h.availableFrom > today ? h.availableFrom : today;
  const deliveryDate = addDays(start, transitDays);
  if (deliveryDate > d.neededBy) return { eligible: false, reason: "TOO_LATE" };

  const daysLeftAtDelivery = h.shelfLifeDays - diffDays(deliveryDate, h.harvestDate);
  if (daysLeftAtDelivery < MIN_DAYS_LEFT_AT_DELIVERY) return { eligible: false, reason: "TOO_STALE" };

  if (
    h.askingPricePerKg !== null &&
    d.maxPricePerKg !== null &&
    h.currency === d.currency &&
    h.askingPricePerKg > d.maxPricePerKg
  ) {
    return { eligible: false, reason: "PRICE" };
  }

  const matchedKg = Math.min(h.availableKg, d.remainingKg);
  const quantityPts = 20 * (matchedKg / d.remainingKg + matchedKg / h.availableKg); // 0-40
  const freshnessPts = (Math.min(daysLeftAtDelivery, h.shelfLifeDays) * 30) / h.shelfLifeDays; // 0-30
  const slack = diffDays(d.neededBy, deliveryDate);
  const slackPts = slack >= 2 ? 10 : slack === 1 ? 6 : 3;

  const score = Math.round(quantityPts + freshnessPts + DISTANCE_POINTS[distance] + slackPts);

  return {
    eligible: true,
    matchedKg,
    coversAll: h.availableKg >= d.remainingKg,
    score,
    fit: fitLabel(score),
    distance,
    transitDays,
    deliveryDate,
    daysLeftAtDelivery,
  };
}
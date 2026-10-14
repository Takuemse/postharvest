// Rules for what a buyer may browse. Pure, so it is easy to test.
export const MIN_DAYS_LEFT_TODAY = 1;

export type SupplyFacts = {
  availableKg: number;
  daysRemaining: number; // shelf life left today; never sent to the browser
  availableFrom: Date;
  askingPricePerKg: number | null;
  currency: string;
};

export type SupplyFilters = {
  minKg?: number;
  availableBy?: Date;
  maxPrice?: number;
  currency?: string;
};

export function isBrowsable(s: SupplyFacts, f: SupplyFilters): boolean {
  if (s.availableKg <= 0) return false;
  if (s.daysRemaining < MIN_DAYS_LEFT_TODAY) return false;
  if (f.minKg !== undefined && s.availableKg < f.minKg) return false;
  if (f.availableBy && s.availableFrom > f.availableBy) return false;
  // Same rule as the match engine: the price limit only applies when both prices exist and share a currency.
  if (
    f.maxPrice !== undefined &&
    s.askingPricePerKg !== null &&
    s.currency === (f.currency ?? "USD") &&
    s.askingPricePerKg > f.maxPrice
  ) {
    return false;
  }
  return true;
}

export type Place = { locationId: number; province: string };

// 0 = same town, 1 = same province, 2 = elsewhere. With no reference place, everything ranks equally.
export function distanceRank(ref: Place | null, to: Place): number {
  if (!ref) return 0;
  if (ref.locationId === to.locationId) return 0;
  return ref.province === to.province ? 1 : 2;
}
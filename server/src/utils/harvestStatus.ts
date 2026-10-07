const DAY_MS = 86_400_000;

export type Urgency = "SAFE" | "ATTENTION" | "URGENT";
export type StockState = "AVAILABLE" | "PARTLY_RESERVED" | "FULLY_RESERVED" | "SOLD_OUT";

// "Today" as a date-only value in Zimbabwe (UTC+2, no daylight saving).
export function todayInHarare(now = new Date()): Date {
  const ymd = now.toLocaleDateString("en-CA", { timeZone: "Africa/Harare" }); // YYYY-MM-DD
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function computeUrgency(input: { harvestDate: Date; shelfLifeDays: number; today?: Date }) {
  const today = input.today ?? todayInHarare();
  const ageDays = Math.max(0, Math.floor((today.getTime() - input.harvestDate.getTime()) / DAY_MS));
  const daysRemaining = input.shelfLifeDays - ageDays;
  const fraction = daysRemaining / input.shelfLifeDays;

  const urgency: Urgency = fraction > 0.5 ? "SAFE" : fraction >= 0.2 ? "ATTENTION" : "URGENT";
  return { ageDays, daysRemaining, urgency, pastShelfLife: daysRemaining <= 0 };
}

export function stockState(quantityKg: number, reservedKg: number, soldKg: number): StockState {
  if (soldKg >= quantityKg) return "SOLD_OUT";
  if (reservedKg + soldKg >= quantityKg) return "FULLY_RESERVED";
  if (reservedKg + soldKg > 0) return "PARTLY_RESERVED";
  return "AVAILABLE";
}
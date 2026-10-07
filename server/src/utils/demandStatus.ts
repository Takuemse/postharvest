export type DemandState = "OPEN" | "PARTLY_FULFILLED" | "FULFILLED" | "OVERDUE" | "CLOSED" | "CANCELLED";

export function daysUntil(neededBy: Date, today: Date): number {
  return Math.round((neededBy.getTime() - today.getTime()) / 86_400_000);
}

// Stored: status (the buyer's decision) and quantities. Everything else is derived.
export function demandState(i: {
  status: "OPEN" | "CLOSED" | "CANCELLED";
  quantityKg: number;
  fulfilledKg: number;
  daysUntilNeeded: number;
}): DemandState {
  if (i.status === "CANCELLED") return "CANCELLED";
  if (i.status === "CLOSED") return "CLOSED";
  if (i.fulfilledKg >= i.quantityKg) return "FULFILLED";
  if (i.daysUntilNeeded < 0) return "OVERDUE";
  return i.fulfilledKg > 0 ? "PARTLY_FULFILLED" : "OPEN";
}
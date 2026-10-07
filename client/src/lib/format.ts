import type { Storage } from "./types";

export const STORAGE_LABEL: Record<Storage, string> = {
  AMBIENT: "Open air or room temperature",
  COOL: "Cool room or shade",
  REFRIGERATED: "Fridge or cold room",
};

export const kg = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`;

export function daysLeftText(daysRemaining: number | null) {
  if (daysRemaining === null) return "Shelf life unknown";
  if (daysRemaining < 0) return "Past its estimated shelf life";
  if (daysRemaining === 0) return "Last day";
  return daysRemaining === 1 ? "1 day left" : `${daysRemaining} days left`;
}

export function harvestedText(ageDays: number | null) {
  if (ageDays === null) return "";
  if (ageDays === 0) return "today";
  return ageDays === 1 ? "yesterday" : `${ageDays} days ago`;
}

export function daysAgoInHarare(n: number) {
  const d = new Date(`${todayInHarare()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// Today as YYYY-MM-DD in Zimbabwe time.
export const todayInHarare = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Harare" });

export function daysFromNowInHarare(n: number) {
  const d = new Date(`${todayInHarare()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function neededByText(days: number) {
  if (days < 0) return days === -1 ? "Overdue by 1 day" : `Overdue by ${-days} days`;
  if (days === 0) return "Needed today";
  if (days === 1) return "Needed tomorrow";
  return `Needed in ${days} days`;
}
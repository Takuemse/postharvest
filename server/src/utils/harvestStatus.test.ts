import { test } from "node:test";
import assert from "node:assert/strict";
import { computeUrgency, stockState } from "./harvestStatus";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const urgencyOn = (day: string, life = 5) =>
  computeUrgency({ harvestDate: d("2026-10-01"), shelfLifeDays: life, today: d(day) });

test("5-day shelf life: SAFE on days 0-2", () => {
  assert.equal(urgencyOn("2026-10-01").urgency, "SAFE");
  assert.equal(urgencyOn("2026-10-03").urgency, "SAFE");
});

test("5-day shelf life: ATTENTION on days 3-4 (20% is still ATTENTION)", () => {
  assert.equal(urgencyOn("2026-10-04").urgency, "ATTENTION");
  assert.equal(urgencyOn("2026-10-05").urgency, "ATTENTION");
});

test("5-day shelf life: URGENT at day 5 and flagged past shelf life after", () => {
  const atEnd = urgencyOn("2026-10-06");
  assert.equal(atEnd.urgency, "URGENT");
  assert.equal(atEnd.pastShelfLife, true);
  assert.equal(urgencyOn("2026-10-09").daysRemaining, -3);
});

test("a harvest dated in the future never has negative age", () => {
  assert.equal(computeUrgency({ harvestDate: d("2026-10-10"), shelfLifeDays: 5, today: d("2026-10-01") }).ageDays, 0);
});

test("stock state", () => {
  assert.equal(stockState(100, 0, 0), "AVAILABLE");
  assert.equal(stockState(100, 40, 0), "PARTLY_RESERVED");
  assert.equal(stockState(100, 60, 40), "FULLY_RESERVED");
  assert.equal(stockState(100, 0, 100), "SOLD_OUT");
});
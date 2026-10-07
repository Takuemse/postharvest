import { test } from "node:test";
import assert from "node:assert/strict";
import { daysUntil, demandState } from "./demandStatus";

const base = { status: "OPEN" as const, quantityKg: 500, fulfilledKg: 0, daysUntilNeeded: 3 };

test("open, partly fulfilled and fulfilled", () => {
  assert.equal(demandState(base), "OPEN");
  assert.equal(demandState({ ...base, fulfilledKg: 200 }), "PARTLY_FULFILLED");
  assert.equal(demandState({ ...base, fulfilledKg: 500 }), "FULFILLED");
});

test("overdue only when still unfulfilled", () => {
  assert.equal(demandState({ ...base, daysUntilNeeded: -1 }), "OVERDUE");
  assert.equal(demandState({ ...base, daysUntilNeeded: -1, fulfilledKg: 500 }), "FULFILLED");
  assert.equal(demandState({ ...base, daysUntilNeeded: 0 }), "OPEN");
});

test("the buyer's own decision wins", () => {
  assert.equal(demandState({ ...base, status: "CANCELLED" }), "CANCELLED");
  assert.equal(demandState({ ...base, status: "CLOSED", fulfilledKg: 500 }), "CLOSED");
});

test("daysUntil counts whole days", () => {
  const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
  assert.equal(daysUntil(d("2026-10-10"), d("2026-10-07")), 3);
  assert.equal(daysUntil(d("2026-10-06"), d("2026-10-07")), -1);
});
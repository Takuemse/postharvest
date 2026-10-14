import test from "node:test";
import assert from "node:assert/strict";
import { distanceRank, isBrowsable, type SupplyFacts } from "./marketplace";

const base: SupplyFacts = {
  availableKg: 100,
  daysRemaining: 5,
  availableFrom: new Date("2026-10-12T00:00:00.000Z"),
  askingPricePerKg: 0.6,
  currency: "USD",
};

test("hides produce with nothing available", () => {
  assert.equal(isBrowsable({ ...base, availableKg: 0 }, {}), false);
  assert.equal(isBrowsable(base, {}), true);
});

test("hides produce with less than a day of shelf life left", () => {
  assert.equal(isBrowsable({ ...base, daysRemaining: 0 }, {}), false);
  assert.equal(isBrowsable({ ...base, daysRemaining: 1 }, {}), true);
});

test("minimum kg filter", () => {
  assert.equal(isBrowsable(base, { minKg: 100 }), true);
  assert.equal(isBrowsable(base, { minKg: 101 }), false);
});

test("available-by filter uses availableFrom", () => {
  assert.equal(isBrowsable(base, { availableBy: new Date("2026-10-12T00:00:00.000Z") }), true);
  assert.equal(isBrowsable(base, { availableBy: new Date("2026-10-11T00:00:00.000Z") }), false);
});

test("price filter hides dearer produce, keeps unpriced and other-currency produce", () => {
  assert.equal(isBrowsable(base, { maxPrice: 0.5, currency: "USD" }), false);
  assert.equal(isBrowsable(base, { maxPrice: 0.6, currency: "USD" }), true);
  assert.equal(isBrowsable({ ...base, askingPricePerKg: null }, { maxPrice: 0.1, currency: "USD" }), true);
  assert.equal(isBrowsable(base, { maxPrice: 0.1, currency: "ZWG" }), true);
});

test("distance rank", () => {
  const ref = { locationId: 1, province: "MANICALAND" };
  assert.equal(distanceRank(ref, { locationId: 1, province: "MANICALAND" }), 0);
  assert.equal(distanceRank(ref, { locationId: 2, province: "MANICALAND" }), 1);
  assert.equal(distanceRank(ref, { locationId: 3, province: "HARARE" }), 2);
  assert.equal(distanceRank(null, { locationId: 3, province: "HARARE" }), 0);
});
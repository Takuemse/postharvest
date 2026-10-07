import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateMatch, fitLabel, type DemandFacts, type Eligible, type HarvestFacts } from "./matching";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const TODAY = d("2026-10-07");

const harvest: HarvestFacts = {
  harvestDate: d("2026-10-05"), availableFrom: d("2026-10-05"), shelfLifeDays: 5,
  availableKg: 800, askingPricePerKg: 0.6, currency: "USD", locationId: 1, province: "HARARE",
};
const demand: DemandFacts = {
  neededBy: d("2026-10-10"), remainingKg: 500, maxPricePerKg: null, currency: "USD", locationId: 1, province: "HARARE",
};

function eligible(h: HarvestFacts, dm: DemandFacts): Eligible {
  const r = evaluateMatch(h, dm, TODAY);
  if (!r.eligible) assert.fail(`expected a match but got ${r.reason}`);
  return r;
}

test("same town: strong fit, scored by hand", () => {
  // quantity 32.5 + freshness 18 + distance 20 + slack 10 = 80.5 -> 81
  const r = eligible(harvest, demand);
  assert.equal(r.score, 81);
  assert.equal(r.fit, "STRONG");
  assert.equal(r.matchedKg, 500);
  assert.equal(r.transitDays, 0);
  assert.equal(r.daysLeftAtDelivery, 3);
  assert.equal(r.coversAll, true);
});

test("other province: two days of travel lowers freshness and the score", () => {
  // quantity 32.5 + freshness 6 + distance 5 + slack 6 = 49.5 -> 50
  const r = eligible({ ...harvest, locationId: 5, province: "MANICALAND" }, demand);
  assert.equal(r.score, 50);
  assert.equal(r.fit, "POSSIBLE");
  assert.equal(r.transitDays, 2);
  assert.equal(r.daysLeftAtDelivery, 1);
});

test("cannot arrive before the needed-by date", () => {
  const far = { ...harvest, locationId: 5, province: "MANICALAND" };
  const r = evaluateMatch(far, { ...demand, neededBy: d("2026-10-08") }, TODAY);
  assert.deepEqual(r, { eligible: false, reason: "TOO_LATE" });
});

test("too old by the time it arrives", () => {
  const old = { ...harvest, harvestDate: d("2026-10-01"), availableFrom: d("2026-10-01") };
  assert.deepEqual(evaluateMatch(old, demand, TODAY), { eligible: false, reason: "TOO_STALE" });
});

test("price: asking above the buyer's limit is excluded, equal or unknown is not", () => {
  assert.deepEqual(
    evaluateMatch({ ...harvest, askingPricePerKg: 2 }, { ...demand, maxPricePerKg: 1.5 }, TODAY),
    { eligible: false, reason: "PRICE" },
  );
  assert.equal(evaluateMatch({ ...harvest, askingPricePerKg: 1.5 }, { ...demand, maxPricePerKg: 1.5 }, TODAY).eligible, true);
  assert.equal(evaluateMatch({ ...harvest, askingPricePerKg: 2 }, { ...demand, maxPricePerKg: 1.5, currency: "ZWG" }, TODAY).eligible, true);
  assert.equal(evaluateMatch({ ...harvest, askingPricePerKg: null }, { ...demand, maxPricePerKg: 1.5 }, TODAY).eligible, true);
});

test("partial match: matches what the farmer has", () => {
  const r = eligible({ ...harvest, availableKg: 300 }, demand);
  assert.equal(r.matchedKg, 300);
  assert.equal(r.coversAll, false);
});

test("a later available-from date delays delivery", () => {
  const r = eligible({ ...harvest, availableFrom: d("2026-10-09") }, demand);
  assert.equal(r.deliveryDate.toISOString().slice(0, 10), "2026-10-09");
});

test("no stock or no demand", () => {
  assert.deepEqual(evaluateMatch({ ...harvest, availableKg: 0 }, demand, TODAY), { eligible: false, reason: "NO_STOCK" });
  assert.deepEqual(evaluateMatch(harvest, { ...demand, remainingKg: 0 }, TODAY), { eligible: false, reason: "NO_DEMAND" });
});

test("fit labels", () => {
  assert.equal(fitLabel(80), "STRONG");
  assert.equal(fitLabel(79), "GOOD");
  assert.equal(fitLabel(60), "GOOD");
  assert.equal(fitLabel(59), "POSSIBLE");
});
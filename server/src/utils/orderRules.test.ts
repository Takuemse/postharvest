import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedActions, contactVisible, holdsStock } from "./orderRules";

test("requested: only the other side can confirm or decline", () => {
  assert.deepEqual(allowedActions("REQUESTED", "FARMER", "BUYER"), ["confirm", "decline"]);
  assert.deepEqual(allowedActions("REQUESTED", "BUYER", "BUYER"), ["cancel"]);
  assert.deepEqual(allowedActions("REQUESTED", "BUYER", "FARMER"), ["confirm", "decline"]);
  assert.deepEqual(allowedActions("REQUESTED", "FARMER", "FARMER"), ["cancel"]);
});

test("confirmed: only the farmer marks ready; both can cancel", () => {
  assert.deepEqual(allowedActions("CONFIRMED", "FARMER", "BUYER"), ["ready", "cancel"]);
  assert.deepEqual(allowedActions("CONFIRMED", "BUYER", "BUYER"), ["cancel"]);
});

test("ready: only the buyer marks received; both can cancel", () => {
  assert.deepEqual(allowedActions("READY", "BUYER", "BUYER"), ["complete", "cancel"]);
  assert.deepEqual(allowedActions("READY", "FARMER", "BUYER"), ["cancel"]);
});

test("finished orders allow nothing", () => {
  assert.deepEqual(allowedActions("COMPLETED", "FARMER", "BUYER"), []);
  assert.deepEqual(allowedActions("CANCELLED", "BUYER", "BUYER"), []);
});

test("contact details and stock holds", () => {
  assert.equal(contactVisible("REQUESTED"), false);
  assert.equal(contactVisible("CONFIRMED"), true);
  assert.equal(contactVisible("CANCELLED"), false);
  assert.equal(holdsStock("REQUESTED"), false);
  assert.equal(holdsStock("READY"), true);
  assert.equal(holdsStock("COMPLETED"), false);
});
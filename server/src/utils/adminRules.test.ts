import test from "node:test";
import assert from "node:assert/strict";
import { suspensionBlocker } from "./adminRules";

test("an admin cannot suspend themselves", () => {
  assert.match(suspensionBlocker("a1", { id: "a1", role: "ADMIN" })!, /own account/);
});

test("admin accounts cannot be suspended", () => {
  assert.match(suspensionBlocker("a1", { id: "a2", role: "ADMIN" })!, /Admin accounts/);
});

test("farmers and buyers can be suspended", () => {
  assert.equal(suspensionBlocker("a1", { id: "f1", role: "FARMER" }), null);
  assert.equal(suspensionBlocker("a1", { id: "b1", role: "BUYER" }), null);
});
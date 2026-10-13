import { test } from "node:test";
import assert from "node:assert/strict";
import { toMinor, money } from "../src/lib/money.js";
test("decimal strings convert exactly without floating-point arithmetic", () => {
  assert.equal(toMinor("12500.75"), 1250075);
  assert.equal(toMinor("0.29"), 29);
  assert.equal(toMinor("0"), 0);
  assert.equal(toMinor("1.1"), 110);
  assert.equal(toMinor("90071992547409.91"), Number.MAX_SAFE_INTEGER);
});
test("unsupported precision, syntax, negative amounts and overflow are rejected", () => {
  for (const value of [
    "1.001",
    "-1",
    "Infinity",
    "NaN",
    "1e3",
    "",
    "1,000",
    "90071992547409.92",
    "1.",
  ])
    assert.throws(() => toMinor(value));
});
test("currency formatting preserves cents even at the safe integer boundary", () => {
  assert.equal(money(1250075, "CAD"), "CAD 12,500.75");
  assert.equal(money(0, "USD"), "USD 0.00");
  assert.equal(
    money(Number.MAX_SAFE_INTEGER, "CAD"),
    "CAD 90,071,992,547,409.91",
  );
});

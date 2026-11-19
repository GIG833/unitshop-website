import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PENDING_ORDER_KEY,
  readPendingOrderKey,
  storePendingOrderKey,
  clearPendingOrderKey,
} from "../src/features/checkout/order-attempt.ts";

function mockStore() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}
const key = "123e4567-e89b-42d3-a456-426614174000";

test("an opaque order key survives page remounts in the same tab", () => {
  const store = mockStore();
  assert.equal(readPendingOrderKey(store), null);
  storePendingOrderKey(store, key);
  assert.equal(readPendingOrderKey(store), key);
  assert.deepEqual([...store.values.keys()], [PENDING_ORDER_KEY]);
  // No names, phone numbers, addresses or payload are persisted.
  assert.deepEqual([...store.values.values()], [key]);
  clearPendingOrderKey(store);
  assert.equal(readPendingOrderKey(store), null);
});

test("unknown or invalid keys cannot be replayed as a legitimate UUID", () => {
  const store = mockStore();
  for (const invalid of [
    "", "abc", "0".repeat(128), "123e4567-e89b-02d3-a456-426614174000",
    "{\"customer_phone\":\"09999\"}",
  ]) {
    store.setItem(PENDING_ORDER_KEY, invalid);
    assert.equal(readPendingOrderKey(store), null);
    assert.throws(() => storePendingOrderKey(store, invalid));
  }
});

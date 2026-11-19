import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ORDER_STATUSES,
  isOrderStatus,
  availableOrderTransitions,
  canChangeOrderStatus,
} from "../src/features/admin/order-workflow.ts";

test("order statuses are explicit and invalid status values are rejected", () => {
  assert.deepEqual(ORDER_STATUSES, ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]);
  assert.equal(isOrderStatus("shipped"), true);
  for (const bad of ["paid", "refunded", "", null, 42]) assert.equal(isOrderStatus(bad), false);
});

test("COD follows sequential fulfilment states without skipping steps", () => {
  assert.deepEqual(availableOrderTransitions("pending", "COD", "pending"), ["confirmed", "cancelled"]);
  assert.deepEqual(availableOrderTransitions("confirmed", "COD", "pending"), ["processing", "cancelled"]);
  assert.deepEqual(availableOrderTransitions("processing", "COD", "pending"), ["shipped", "cancelled"]);
  assert.deepEqual(availableOrderTransitions("shipped", "COD", "pending"), ["delivered"]);
  assert.deepEqual(availableOrderTransitions("delivered", "COD", "pending"), []);
  assert.deepEqual(availableOrderTransitions("cancelled", "COD", "pending"), []);
  assert.equal(canChangeOrderStatus("pending", "delivered", "COD", "pending"), false);
});

test("MMQR fulfilment remains blocked until actual payment is verified", () => {
  for (const status of ["pending", "rejected", null]) {
    assert.deepEqual(availableOrderTransitions("pending", "MMQR", status), ["cancelled"]);
    assert.deepEqual(availableOrderTransitions("confirmed", "MMQR", status), ["cancelled"]);
    assert.deepEqual(availableOrderTransitions("shipped", "MMQR", status), []);
    assert.equal(canChangeOrderStatus("pending", "confirmed", "MMQR", status), false);
  }
  assert.deepEqual(availableOrderTransitions("pending", "MMQR", "verified"), ["confirmed", "cancelled"]);
  assert.equal(canChangeOrderStatus("confirmed", "processing", "MMQR", "verified"), true);
  assert.deepEqual(availableOrderTransitions("pending", "UNKNOWN", "verified"), []);
});

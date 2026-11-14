import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addItem,
  changeQuantity,
  removeItem,
  parseCart,
  totalMMK,
  loadSavedCart,
  saveCart,
  CART_KEY,
  MAX_ITEMS,
} from "../src/features/cart/model.ts";
import { dictionaries } from "../src/lib/i18n/dictionaries.ts";
const active = { id: 12, is_active: true };
function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
test("add active products and merge quantities without duplicate rows", () => {
  const original = [];
  const first = addItem(original, active);
  assert.deepEqual(original, []);
  assert.deepEqual(addItem(first, active), [{ productId: 12, quantity: 2 }]);
  assert.deepEqual(first, [{ productId: 12, quantity: 1 }]);
});
test("inactive and invalid products cannot be added", () => {
  for (const product of [
    { ...active, is_active: false },
    { ...active, is_active: null },
    { ...active, id: 0 },
    { ...active, id: -1 },
    { ...active, id: 1.5 },
  ])
    assert.throws(() => addItem([], product));
});
test("quantities can increase/decrease; zero, fractions and excessive values are rejected", () => {
  const entries = [{ productId: 12, quantity: 2 }];
  assert.deepEqual(changeQuantity(entries, 12, 1), [
    { productId: 12, quantity: 1 },
  ]);
  assert.deepEqual(changeQuantity(entries, 12, 3), [
    { productId: 12, quantity: 3 },
  ]);
  for (const quantity of [0, -1, 1.1, 100, NaN, Infinity])
    assert.throws(() => changeQuantity(entries, 12, quantity));
  assert.throws(() => addItem([{ productId: 12, quantity: 99 }], active));
});
test("removal deletes only the selected product and supports an empty cart", () => {
  assert.deepEqual(
    removeItem(
      [
        { productId: 12, quantity: 2 },
        { productId: 13, quantity: 1 },
      ],
      12,
    ),
    [{ productId: 13, quantity: 1 }],
  );
  assert.deepEqual(removeItem([{ productId: 12, quantity: 1 }], 12), []);
});
test("a new read after refresh restores saved IDs and quantities", () => {
  const storage = memoryStorage();
  const entries = addItem(addItem([], active), active);
  saveCart(storage, entries);
  assert.deepEqual(loadSavedCart(storage), entries);
  saveCart(storage, removeItem(entries, 12));
  assert.deepEqual(loadSavedCart(storage), []);
});
test("persisted prices and other untrusted fields are discarded", () => {
  const storage = memoryStorage();
  saveCart(storage, [
    { productId: 12, quantity: 1, price: 1, name: "forged", is_active: true },
  ]);
  assert.equal(storage.getItem(CART_KEY), '[{"productId":12,"quantity":1}]');
});
test("corrupted persisted data is rejected, not converted into a purchasable cart", () => {
  for (const raw of [
    "not JSON",
    "{}",
    "null",
    '[{"productId":12,"quantity":0}]',
    '[{"productId":"12","quantity":1}]',
    '[{"productId":12,"quantity":1},{"productId":12,"quantity":2}]',
  ])
    assert.throws(() => parseCart(raw));
  assert.deepEqual(parseCart(null), []);
});
test("storage failures propagate for the UI to display a persistence warning", () => {
  assert.throws(() =>
    loadSavedCart({
      getItem() {
        throw new Error("denied");
      },
    }),
  );
  assert.throws(() =>
    saveCart(
      {
        setItem() {
          throw new Error("quota exceeded");
        },
      },
      [{ productId: 12, quantity: 1 }],
    ),
  );
});
test("distinct product limit bounds storage and loading work", () => {
  const entries = Array.from({ length: MAX_ITEMS }, (_, i) => ({
    productId: i + 1,
    quantity: 1,
  }));
  assert.throws(() => addItem(entries, { id: MAX_ITEMS + 1, is_active: true }));
  assert.throws(() =>
    parseCart(JSON.stringify([...entries, { productId: 101, quantity: 1 }])),
  );
});
test("MMK totals include quantities without floating point accumulation", () => {
  assert.equal(
    totalMMK([
      { price: 12500, quantity: 2 },
      { price: 999.5, quantity: 3 },
    ]),
    27998.5,
  );
  assert.equal(totalMMK([{ price: 0.1, quantity: 3 }]), 0.3);
  assert.equal(totalMMK([]), 0);
});
test("both languages contain cart loading, empty, error and action translations", () => {
  assert.deepEqual(
    Object.keys(dictionaries.en).sort(),
    Object.keys(dictionaries.my).sort(),
  );
  for (const locale of ["en", "my"])
    for (const key of [
      "cartTitle",
      "addToCart",
      "cartLoading",
      "cartEmpty",
      "cartError",
      "cartRemove",
      "cartIncrease",
      "cartDecrease",
      "cartTotal",
      "cartStorageError",
      "cartUnavailable",
    ])
      assert.ok(dictionaries[locale][key].length > 0);
});

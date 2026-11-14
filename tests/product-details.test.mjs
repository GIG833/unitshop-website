import assert from "node:assert/strict";
import { test } from "node:test";
import { loadProduct, parseProductId } from "../src/features/catalog/data.ts";
import { dictionaries } from "../src/lib/i18n/dictionaries.ts";

const product = {
  id: 12,
  name_en: "Router",
  name_mm: "ရောက်တာ",
  price: 24000,
  category_id: 2,
  description_en: "Product description",
  description_mm: null,
  image_url: "https://example.com/router.jpg",
  is_active: true,
};
function mockClient({ data = product, error = null } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(["from", table]);
      return {
        select(fields) {
          calls.push(["select", fields]);
          return {
            eq(field, value) {
              calls.push(["eq", field, value]);
              return this;
            },
            async maybeSingle() {
              return { data, error };
            },
          };
        },
      };
    },
  };
}
test("detail query uses only SELECT with exact ID and active filters", async () => {
  const client = mockClient();
  const result = await loadProduct(client, "12");
  assert.deepEqual(result, product);
  assert.deepEqual(client.calls, [
    ["from", "products"],
    [
      "select",
      "id,name_en,name_mm,price,category_id,description_en,description_mm,image_url,is_active",
    ],
    ["eq", "id", 12],
    ["eq", "is_active", true],
  ]);
});
test("invalid IDs never query Supabase", async () => {
  for (const id of [
    "",
    "0",
    "-1",
    "1.5",
    "1e2",
    "abc",
    "12 OR 1=1",
    "9007199254740992",
    "01",
    " 12",
  ]) {
    const client = mockClient();
    assert.equal(parseProductId(id), null);
    assert.equal(await loadProduct(client, id), null);
    assert.deepEqual(client.calls, []);
  }
});
test("missing, inactive, and mismatched responses do not expose a product", async () => {
  for (const data of [
    null,
    { ...product, is_active: false },
    { ...product, id: 13 },
  ]) {
    assert.equal(await loadProduct(mockClient({ data }), "12"), null);
  }
});
test("query permission errors reject without leaking raw database errors", async () => {
  await assert.rejects(
    loadProduct(mockClient({ error: { message: "private diagnostic" } }), "12"),
    { message: "Product could not be loaded." },
  );
});
test("a retry can succeed after a failed request", async () => {
  await assert.rejects(
    loadProduct(mockClient({ error: { message: "network" } }), "12"),
  );
  assert.equal((await loadProduct(mockClient(), "12")).id, 12);
});
test("invalid data cannot fabricate prices and unsafe images are omitted", async () => {
  await assert.rejects(
    loadProduct(mockClient({ data: { ...product, price: -1 } }), "12"),
  );
  assert.equal(
    (
      await loadProduct(
        mockClient({ data: { ...product, image_url: "javascript:alert(1)" } }),
        "12",
      )
    ).image_url,
    null,
  );
});
test("English and Myanmar include all product detail state translations", () => {
  assert.deepEqual(
    Object.keys(dictionaries.en).sort(),
    Object.keys(dictionaries.my).sort(),
  );
  for (const locale of ["en", "my"]) {
    for (const key of [
      "backToProducts",
      "productDetails",
      "productLoading",
      "productError",
      "productNotFound",
      "productNotFoundBody",
      "description",
      "noDescription",
      "retry",
      "noImage",
    ])
      assert.ok(dictionaries[locale][key].length > 0);
  }
});

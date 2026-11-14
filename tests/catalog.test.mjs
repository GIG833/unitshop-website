import assert from "node:assert/strict";
import { test } from "node:test";
import {
  loadCatalog,
  localizedText,
  filterProducts,
  safeImageUrl,
  formatPrice,
} from "../src/features/catalog/data.ts";

const product = {
  id: 1,
  name_en: "Router",
  name_mm: "ရောက်တာ",
  price: 12345,
  category_id: 2,
  description_en: "English description",
  description_mm: null,
  image_url: "https://example.com/router.jpg",
  is_active: true,
};
function mockClient({
  rows = [product],
  categories = [{ id: 2, name_en: "Routers" }],
  fail = null,
} = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table };
      calls.push(call);
      return {
        select(columns) {
          call.columns = columns;
          return {
            eq(column, value) {
              call.filter = [column, value];
              return this;
            },
            order(column) {
              call.order = column;
              return {
                async range(start, end) {
                  call.range = [start, end];
                  return {
                    data: (table === "products" ? rows : categories).slice(
                      start,
                      end + 1,
                    ),
                    error: fail === table ? { message: "denied" } : null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}
test("reads only explicit public fields, filters active products and paginates", async () => {
  const rows = Array.from({ length: 101 }, (_, i) => ({
    ...product,
    id: i + 1,
  }));
  const client = mockClient({ rows });
  const result = await loadCatalog(client);
  assert.equal(result.products.length, 101);
  assert.deepEqual(result.categories, [{ id: 2, name_en: "Routers" }]);
  const calls = client.calls.filter((c) => c.table === "products");
  assert.equal(calls.length, 2);
  calls.forEach((call) => {
    assert.deepEqual(call.filter, ["is_active", true]);
    assert.ok(!call.columns.includes("*"));
  });
  assert.deepEqual(
    calls.map((c) => c.range),
    [
      [0, 99],
      [100, 199],
    ],
  );
});
test("never returns inactive rows, even if a response includes them", async () => {
  const result = await loadCatalog(
    mockClient({ rows: [product, { ...product, id: 2, is_active: false }] }),
  );
  assert.deepEqual(
    result.products.map((p) => p.id),
    [1],
  );
});
test("either query failing rejects the entire catalogue without samples", async () => {
  for (const fail of ["products", "categories"])
    await assert.rejects(loadCatalog(mockClient({ fail })));
});
test("empty permitted results remain empty", async () => {
  assert.deepEqual(
    await loadCatalog(mockClient({ rows: [], categories: [] })),
    { products: [], categories: [] },
  );
});
test("invalid price fails instead of inventing a price", async () => {
  for (const price of [-1, null, "", NaN])
    await assert.rejects(
      loadCatalog(mockClient({ rows: [{ ...product, price }] })),
    );
});
test("category filters use database IDs and active state", () => {
  const rows = [
    product,
    { ...product, id: 2, category_id: 3 },
    { ...product, id: 3, is_active: false },
  ];
  assert.equal(filterProducts(rows, "all").length, 2);
  assert.deepEqual(
    filterProducts(rows, 2).map((p) => p.id),
    [1],
  );
  assert.deepEqual(filterProducts(rows, 99), []);
});
test("bilingual values fall back without fabricating content", () => {
  assert.equal(localizedText("Router", "ရောက်တာ", "my"), "ရောက်တာ");
  assert.equal(localizedText("Router", "  ", "my"), "Router");
  assert.equal(localizedText("Router", "ရောက်တာ", "en"), "Router");
  assert.equal(localizedText(null, null, "my"), "");
});
test("images accept HTTPS only; prices retain MMK and decimal precision", () => {
  for (const value of [
    null,
    "javascript:alert(1)",
    "http://example.com/a.jpg",
    "bad",
  ])
    assert.equal(safeImageUrl(value), null);
  assert.equal(safeImageUrl(product.image_url), product.image_url);
  assert.equal(formatPrice(12345.5, "en"), "12,345.5 MMK");
  assert.ok(formatPrice(12345, "my").endsWith(" MMK"));
});

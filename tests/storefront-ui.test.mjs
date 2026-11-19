import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  categoryPresentationIndex,
  categoryIconPath,
} from "../src/features/catalog/category-presentation.ts";
import { dictionaries } from "../src/lib/i18n/dictionaries.ts";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const card = readFileSync(new URL("../src/components/product-card.tsx", import.meta.url), "utf8");
const storefront = readFileSync(new URL("../src/components/storefront.tsx", import.meta.url), "utf8");

test("all six store categories have meaningful icons and bilingual labels", () => {
  const names = ["MiFi", "Routers", "WiFi Cards", "CCTV", "Gadgets", "Power Banks"];
  const icons = names.map((name, index) => {
    assert.equal(categoryPresentationIndex(name), index);
    assert.ok(dictionaries.en.categoryNames[index].length > 0);
    assert.ok(dictionaries.my.categoryNames[index].length > 0);
    assert.ok(dictionaries.en.categoryDescriptions[index].length > 0);
    assert.ok(dictionaries.my.categoryDescriptions[index].length > 0);
    return categoryIconPath(name);
  });
  assert.equal(new Set(icons).size, 6);
  assert.match(categoryIconPath("WiFi Cards"), /category-wifi-card/);
  assert.match(categoryIconPath("Power Bank"), /category-power-bank/);
  assert.equal(categoryPresentationIndex("powerbanks"), 5);
  assert.equal(categoryPresentationIndex("novel devices"), -1);
  assert.equal(categoryIconPath("novel devices"), "/images/category-generic.svg");
  assert.doesNotMatch(categoryIconPath("novel devices"), /device-0/);
});
test("storefront keeps full product descriptions on the details page, not tall listing cards", () => {
  assert.ok(card.includes("product-card-summary"));
  assert.ok(card.includes("product.description_en"));
  assert.match(css, /\.product-card \.product-card-summary\s*\{[^}]*-webkit-line-clamp:\s*2/s);
  assert.match(css, /\.product-card \.product-copy h3\s*\{[^}]*-webkit-line-clamp:\s*3/s);
  assert.ok(card.includes('src={product.image_url}'));
  assert.ok(card.includes("detailsLabel"));
});
test("mobile header exposes cart, localized orders and menu without wrapping links", () => {
  assert.ok(storefront.includes("account-shortcut"));
  assert.ok(storefront.includes("cart-shortcut"));
  assert.ok(storefront.includes('aria-label={t.cartTitle}'));
  assert.ok(storefront.includes('href={`/my-orders?lang=${locale}`}'));
  assert.match(css, /\.storefront-header \.header-actions\s*\{[^}]*flex-wrap:\s*nowrap/s);
  assert.ok(css.includes(".storefront-header .account-shortcut"));
});
test("small screens keep equal category cards and two-column product cards in both locales", () => {
  assert.match(css, /\.category-card:last-child\s*\{[^}]*grid-column:\s*auto/s);
  assert.match(css, /html\[lang="my"\] \.product-grid\s*\{[^}]*repeat\(2,/s);
  assert.ok(storefront.includes('href="#featured"'));
  assert.ok(storefront.includes("categoryIconPath(category.name_en)"));
});
test("real checkout is described accurately in both languages", () => {
  assert.equal(dictionaries.en.checkoutTitle, "Guest checkout");
  assert.ok(!dictionaries.en.cartNoCheckout.includes("not available yet"));
  assert.ok(!dictionaries.my.cartNoCheckout.includes("မရရှိနိုင်သေးပါ"));
  assert.deepEqual(Object.keys(dictionaries.en).sort(), Object.keys(dictionaries.my).sort());
});

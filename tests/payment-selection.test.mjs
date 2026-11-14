import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as payment from "../src/features/checkout/payment.ts";
import * as i18n from "../src/lib/i18n/dictionaries.ts";

// Render the real TSX component in memory using existing TypeScript/React dependencies.
// No browser, network, customer data or emitted application files are involved.
const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL("../src/components/payment-selection.tsx", import.meta.url),
  "utf8",
);
const output = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;
const componentModule = { exports: {} };
new Function("require", "module", "exports", output)(
  (name) =>
    name === "@/features/checkout/payment"
      ? payment
      : name === "@/lib/i18n/dictionaries"
        ? i18n
        : require(name),
  componentModule,
  componentModule.exports,
);
const { PaymentSelection } = componentModule.exports;
function render(method, locale = "en", invalid = false) {
  return renderToStaticMarkup(
    React.createElement(PaymentSelection, {
      method,
      locale,
      invalid,
      onChange() {},
    }),
  );
}
test("only COD and MMQR are valid payment preferences", () => {
  assert.deepEqual(payment.PAYMENT_METHODS, ["cod", "mmqr"]);
  for (const value of ["cod", "mmqr"])
    assert.equal(payment.isPaymentMethod(value), true);
  for (const value of [null, undefined, "", "card", "COD", "bank", 1, {}])
    assert.equal(payment.isPaymentMethod(value), false);
});
test("preview policy never enables uploads and MMQR requires manual verification", () => {
  assert.equal(payment.PAYMENT_PREVIEW.cod.showQrPlaceholder, false);
  assert.equal(payment.PAYMENT_PREVIEW.cod.screenshotUploadEnabled, false);
  assert.equal(payment.PAYMENT_PREVIEW.mmqr.showQrPlaceholder, true);
  assert.equal(payment.PAYMENT_PREVIEW.mmqr.screenshotUploadEnabled, false);
  assert.equal(payment.PAYMENT_PREVIEW.mmqr.requiresManualVerification, true);
});
test("every rendered state offers exactly two native mutually exclusive radio choices", () => {
  for (const method of [null, "cod", "mmqr"]) {
    const html = render(method);
    assert.equal((html.match(/type="radio"/g) || []).length, 2);
    assert.equal((html.match(/name="paymentMethod"/g) || []).length, 2);
    assert.equal((html.match(/checked=""/g) || []).length, method ? 1 : 0);
    if (method)
      assert.match(html, new RegExp(`id="payment-${method}"[^>]*checked=""`));
    assert.doesNotMatch(html, /type="file"|<img|<svg|<canvas|<iframe/);
  }
});
test("COD displays no-screenshot guidance and no merchant QR placeholder", () => {
  const html = render("cod");
  assert.ok(html.includes(i18n.dictionaries.en.paymentCodNoScreenshot));
  assert.ok(!html.includes('class="merchant-qr-placeholder"'));
  assert.ok(!html.includes(i18n.dictionaries.en.paymentScreenshotLater));
});
test("MMQR shows placeholder, future-upload and manual verification guidance in both languages", () => {
  for (const locale of ["en", "my"]) {
    const html = render("mmqr", locale);
    assert.ok(html.includes('class="merchant-qr-placeholder"'));
    for (const key of [
      "paymentQrPlaceholder",
      "paymentScreenshotLater",
      "paymentManualVerification",
    ])
      assert.ok(html.includes(i18n.dictionaries[locale][key]));
  }
});
test("unselected attempted validation has an accessible bilingual error", () => {
  for (const locale of ["en", "my"]) {
    const html = render(null, locale, true);
    assert.ok(html.includes('role="alert"'));
    assert.ok(html.includes('aria-describedby="payment-selection-error"'));
    assert.ok(html.includes(i18n.dictionaries[locale].paymentRequired));
  }
});

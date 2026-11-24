import test from "node:test";
import assert from "node:assert/strict";
import { faq, productAnswer } from "../src/features/telegram/support.ts";

const items = [
  { id: 1, name_en: "DNXT M20", price: 200000, is_active: true },
  { id: 2, name_en: "DNXT M200", price: 300000, is_active: true },
  { id: 3, name_en: "M20 hidden", price: 1, is_active: false },
];

test("model queries use active exact model tokens and catalogue prices", () => {
  const answer = productAnswer("m20 ဘယ်ဈေးလဲ", items);
  assert.match(answer, /200,000/);
  assert.doesNotMatch(answer, /hidden|M200/);
  assert.equal(productAnswer("M20 လိုင်းကောင်းလား", items), undefined);
});

test("payment receipt inquiries are handed off", () => {
  assert.match(faq("MMQR ရလား"), /screenshot/);
  assert.equal(faq("MMQR ငွေလွှဲထားတာ ရပြီလား"), undefined);
});

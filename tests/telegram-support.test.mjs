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

import { shoppingAnswer, handoff, offerHelp } from "../src/features/telegram/support.ts";
const catalog = {categories:[{id:1,name_en:"MiFi"},{id:2,name_en:" Routers"},{id:3,name_en:"Gadgets"}],products:[
  {id:1,name_en:"Portable PowerBank",category_id:1,price:200000,is_active:true},
  {id:2,name_en:"Home router",description_en:"4 external antennas",category_id:2,price:190000,is_active:true},
  {id:3,name_en:"Standalone powerbank",category_id:3,price:50000,is_active:true},
  {id:4,name_en:"10000mAh",category_id:1,price:90000,is_active:true},
]};
test("shopping questions get a clarification or verified catalogue suggestions", () => {
  assert.match(shoppingAnswer("လိုင်းရကောင်းတဲ့စက်လေးပြပေးပါ",catalog),/သယ်သုံးဖို့လား/);
  assert.match(shoppingAnswer("တိုင်ပါတာရှိလား",catalog),/Home router/);
  const power = shoppingAnswer("Powerbank ပါတဲ့ ဝိုင်ဖိုင်စက်ရောရှိလား", catalog);
  assert.match(power,/Portable PowerBank/);
  assert.doesNotMatch(power,/Standalone|10000mAh/);
  const portable = shoppingAnswer("သယ်သုံးဖို့",catalog);
  assert.doesNotMatch(shoppingAnswer("တိုင်ပါတာရှိလား",catalog,portable),/Home router/);
});
test("staff escalation keeps the original inquiry when the customer opts in",()=>{
  const q="တိုင်ပါတာရှိလား";
  assert.equal(handoff(q,""),undefined);
  assert.equal(handoff("ဆိုင်ကိုမေးပေးပါ",offerHelp(q,"")),q);
});

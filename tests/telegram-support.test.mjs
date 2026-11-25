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

test("general router price requests list home routers without asking for a model", () => {
  for (const question of ["Router ဈေးပြပါ", "router စျေးဘယ်လောက်လဲ"]) {
    const answer = shoppingAnswer(question, catalog);
    assert.match(answer, /Home router — 190,000/);
    assert.doesNotMatch(answer, /Portable PowerBank/);
  }
  assert.equal(handoff("ဆိုင်ကိုမေးပေးပါ — ဒီစက်လေးရလား", ""), "ဒီစက်လေးရလား");
});

test("shop visit, cash on delivery, warranty and township questions",()=>{
  assert.match(faq("ဆိုင်က ဘယ်နားမှာလဲရှင်"),/16\.8287080/);
  assert.match(faq("အိမ်ရောက်ငွေချေရလား"),/COD/);
  assert.match(faq("အာမခံရော ပါလား"),/မော်ဒယ်အလိုက်/);
  const question=faq("Mytel business card ရောင်းလားဗျ");
  assert.match(faq("ပဲခူးမြို့",question),/Mytel Mini Bus ကတ် သုံးမယ့်မြို့နယ် — ပဲခူးမြို့/);
  assert.match(faq("Location Unlock လား"),/ကွန်ရက်/);
});
test("device-only follow-up uses a single preceding active product, asks when ambiguous",()=>{
  const previous="https://www.unitshopmm.com/products/1";
  assert.match(shoppingAnswer("စက်သီးသန့်ပါ", catalog, previous),/Portable PowerBank/);
  assert.match(shoppingAnswer("စက်သီးသန့်ပါ", catalog, previous+"\nhttps://www.unitshopmm.com/products/2"),/ဘယ်စက်/);
});

test("portable suggestions respect Burmese and numeric spending limits",()=>{
  for(const cap of ["နှစ်သိန်း မကျော်","၂၀၀,၀၀၀ မကျော်"]) {
    const answer=shoppingAnswer("အိတ်ဆောင် "+cap,{...catalog,products:[...catalog.products,{id:8,name_en:"Over budget",category_id:1,price:250000,is_active:true}]});
    assert.match(answer,/Portable PowerBank/);
    assert.doesNotMatch(answer,/Over budget/);
  }
});

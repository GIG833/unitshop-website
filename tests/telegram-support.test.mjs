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

test("a correction selects only active WiFi cards even after portable suggestions",()=>{
  const data={categories:[...catalog.categories,{id:19,name_en:" WiFi Cards"}],products:[
    ...catalog.products,{id:42,name_en:"ATOM Flexinet",category_id:19,is_active:true,price:40000},
    {id:43,name_en:"U9 Supernet",category_id:19,is_active:true,price:50000},
    {id:44,name_en:"Inactive",category_id:19,is_active:false,price:1}]};
  const answer=shoppingAnswer("စက်မဟုတ်ဘူး ကတ် လိုချင်တာပါ",data,"သယ်သုံးဖို့ WiFi စက်တွေ");
  assert.match(answer,/40,000/); assert.match(answer,/U9 Supernet/); assert.doesNotMatch(answer,/Portable PowerBank|Inactive/);
  assert.doesNotMatch(shoppingAnswer("ATOM ကဒ်",data),/U9 Supernet/);
  assert.doesNotMatch(shoppingAnswer("SIM Router ဈေးပြပါ",data)||"",/ကတ်သီးသန့်/);
});

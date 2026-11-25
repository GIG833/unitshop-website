import type { Product } from "../catalog/data";

export const shop = "https://www.unitshopmm.com";

export function faq(input: string, previous = ""): string | undefined {
  const text = input.trim().toLowerCase();
  if (/ဆိုင်.*(ဘယ်နား|ဘယ်မှာ|လိပ်စာ|ဘယ်နေရာ|လာယူ|လာဝယ်)|ဆိုင်လိပ်စာ|အခုလာမလို့|shop address|shop location/.test(text))
    return "ဆိုင်က ရန်ကုန်၊ သဃန်းကျွန်း၊ သုဝဏ္ဏဈေးအနီး၊ အမှတ် 7A၊ G.I.G Company မှာပါဗျ။ ဖုန်း 09780078055\nမြေပုံဖွင့်ရန် https://www.google.com/maps/search/?api=1&query=16.8287080,96.2102567";
  if (/အိမ်ရောက်ငွေချေ|ပစ္စည်းရောက်မှ.*(ရှင်း|ပေး|ငွေချေ)|အိမ်အရောက်ငွေချေ/.test(text))
    return "အိမ်ရောက်ငွေချေ ရပါတယ်ဗျ။ Website မှာ မှာယူတဲ့အခါ COD ကို ရွေးပေးပါ။ ဆိုင်မှာလည်း လာယူလို့ရပါတယ်။";
  if (/mytel|မိုင်တဲလ်|မိုင်တယ်/.test(text) && /ကတ်|ကဒ်|business|mini.?bus|card|sim/.test(text))
    return "Mytel Mini Bus ကတ်က သုံးမယ့်မြို့နယ်အလိုက် စစ်ပေးရပါတယ်ဗျ။ ဘယ်မြို့နယ်မှာ သုံးမှာလဲ?";
  if (/location\s*unlock|နေရာပြောင်း.*သုံး|သယ်သွား.*သုံးလို့ရလား/.test(text))
    return "Location Unlock စက်ကို နေရာပြောင်းသယ်သုံးလို့ရပါတယ်ဗျ။ လိုင်းရဖို့ သုံးတဲ့ SIM ရဲ့ ကွန်ရက်မိရပါမယ်။ Mytel Mini Bus လို ကတ်ဆိုရင် သုံးမယ့်မြို့နယ်ကိုလည်း စစ်ပေးရပါတယ်။";
  if (/အာမခံ|warranty/.test(text) && !/လိုင်း|signal/.test(text))
    return offerHelp(input, "ဆိုင်က ရောင်းတဲ့စက်တွေမှာ အာမခံပါတယ်ဗျ။ အာမခံကာလနဲ့ အကျုံးဝင်တဲ့အချက်တွေကို မော်ဒယ်အလိုက် ဆိုင်က စစ်ပေးနိုင်ပါတယ်။");
  if (previous.includes("Mytel Mini Bus") && previous.endsWith("ဘယ်မြို့နယ်မှာ သုံးမှာလဲ?") && text.length < 80)
    return offerHelp("Mytel Mini Bus ကတ် သုံးမယ့်မြို့နယ် — " + input, "ဒီမြို့နယ်မှာ ကတ်သုံးလို့ရမရ ဆိုင်က စစ်ပေးရပါမယ်ဗျ။");
  if (/^(\/start(?: .*)?|\/help|hi|hello|မင်္ဂလာပါ)$/.test(text))
    return "မင်္ဂလာပါဗျ။ ဈေးနှုန်းနဲ့ ပစ္စည်းအကြောင်း သိချင်ရင် မော်ဒယ်နာမည် ဒါမှမဟုတ် «တိုင်ပါတာရှိလား»၊ «သယ်သုံးဖို့ WiFi ပြပေးပါ» လို့ မေးလို့ရပါတယ်။ COD၊ MMQR နဲ့ Promotion အကြောင်းလည်း မေးနိုင်ပါတယ်။ ဆိုင်ကို တိုက်ရိုက်မေးချင်ရင် /staff နောက်မှာ မေးခွန်းရေးပေးပါ။";
  // Only answer general policy questions. Personal payment or order issues need staff.
  if (/^(cod|mmqr|ငွေပေးချေမှု|payment methods)[ ?။]*$/i.test(text) || /^(cod|mmqr)\s*(ရလား|ရပါသလား|ရလားဗျ)[?။ ]*$/.test(text))
    return "Website မှာ COD နဲ့ MMQR ရပါတယ်။ MMQR နဲ့ပေးချေရင် screenshot တင်ပေးပါ။ ဆိုင်က ငွေဝင်စစ်ဆေးပြီး အတည်ပြုပေးပါတယ်။";
  if (/^(promotion|promotions|ပရိုမိုးရှင်း)[ ?။]*$/.test(text))
    return "လက်ရှိ Promotion တွေကို Website ပင်မစာမျက်နှာမှာ ကြည့်နိုင်ပါတယ်။ သက်ဆိုင်တဲ့ လျှော့ဈေးကို ဆိုင်က နောက်ဆုံးဘောက်ချာမှာ တွက်ပေးပါတယ်။\n" + shop;
}

export function productAnswer(input: string, products: Product[]): string | undefined {
  const text = input.normalize("NFKC").toLowerCase();
  if (/refund|warranty|repair|signal|coverage|speed|delivery|order|ငွေလွှဲ|အာမခံ|ပြုပြင်|လိုင်း|ရွာ|ပို့ခ|ပြန်လဲ|အော်ဒါ|လျှော့/.test(text)) return;
  const tokens = text.match(/[a-z0-9]+/g) ?? [];
  const models = tokens.filter(token => /[a-z]/.test(token) && /[0-9]/.test(token));
  const matches = products.filter(product => {
    if (!product.is_active) return false;
    const names = [product.name_en, product.name_mm].filter((s): s is string => !!s?.trim());
    return names.some(name => {
      const normalized = name.normalize("NFKC").toLowerCase().trim();
      const words: string[] = normalized.match(/[a-z0-9]+/g) ?? [];
      return normalized === text.trim() || (models.length > 0 && models.every(model => words.includes(model)));
    });
  });
  if (!matches.length) return;
  return matches.slice(0, 4).map(product => [
    product.name_mm || product.name_en,
    new Intl.NumberFormat("en-US").format(product.price) + " ကျပ်",
    (product.description_mm || product.description_en || "").slice(0, 400),
    shop + "/products/" + product.id,
  ].filter(Boolean).join("\n")).join("\n\n").slice(0, 3900);
}

type Use = "portable" | "home";
const portableWords = /portable|mifi|pocket|သယ်|အိတ်ဆောင်|ခရီး|အပြင်|ကားပေါ်|car\s/;
const homeWords = /အိမ်|အထိုင်|တစ်နေရာ|တနေရာ|home/;
const antennaWords = /antenna|တိုင်|အင်တင်နာ|အင်တဲနာ/;
const bankWords = /power\s*bank|ပါဝါဘဏ်|ပါဝါဘန့်|ဖုန်း.*အား.*သွင်း/;
const useQuestion = "အိမ်မှာ တစ်နေရာတည်းထားသုံးဖို့လားဗျ၊ အပြင်သွားရင် သယ်သုံးဖို့လား?";
const staffOffer = "ဆိုင်က စစ်ပေးစေချင်ရင် ဒီစာကို Reply နှိပ်ပြီး «ဆိုင်ကိုမေးပေးပါ» လို့ ပို့ပေးပါဗျ။";

export function offerHelp(input: string, message: string) {
  return message + "\n\n" + staffOffer + "\nမေးထားတာ — " + input.slice(0, 450);
}

export function handoff(input: string, previous: string) {
  if (input.startsWith("ဆိုင်ကိုမေးပေးပါ — ")) return input.slice("ဆိုင်ကိုမေးပေးပါ — ".length);
  if (/^\/staff(?:\s|$)/i.test(input)) return input.replace(/^\/staff\s*/i, "") || "ဝန်ထမ်းနဲ့ ပြောချင်ပါတယ်။";
  if (/^(?:ဆိုင်ကိုမေးပေးပါ|ဝန်ထမ်းနဲ့ပြောချင်ပါတယ်)[။ ]*$/.test(input.replace(/\s/g,"")))
    return previous.split("\nမေးထားတာ — ")[1] || input;
  if (/ငွေလွှဲထား|ငွေဝင်ပြီလား|အော်ဒါ.*(ဘယ်ရောက်|စစ်ပေး|ဖျက်)|refund|my order/i.test(input)) return input;
}

export function shoppingAnswer(input: string, catalog: {products: Product[]; categories: {id:number; name_en:string}[]}, previous = "") {
  const text = input.normalize("NFKC").toLowerCase();
  if (/စက်သီးသန[့််]*|စက်ချည်း|စက်ပဲ|device only/.test(text)) {
    const links = [...previous.matchAll(/https:\/\/www\.unitshopmm\.com\/products\/(\d+)/g)];
    const prior = links.length === 1 ? catalog.products.find(p => p.is_active && p.id === Number(links[0][1])) : undefined;
    const listing = productAnswer(input, catalog.products) || (prior && productAnswer(prior.name_en, [prior]));
    if (listing) return offerHelp(input + " " + (prior?.name_en || ""), "Website မှာ ဖော်ပြထားတဲ့ဈေးပါဗျ။ SIM ပါဝင်မှုကို ဆိုင်က အတည်ပြုပေးနိုင်ပါတယ်။\n" + listing);
    return "ဘယ်စက်လေးရဲ့ စက်သီးသန့်ဈေးကို ကြည့်ချင်လဲဗျ။ စက်ပုံလေးပို့ပေးလည်း ရပါတယ်။";
  }
  if (/အာမခံ|ပြန်လဲ|ပြုပြင်|refund|warranty|အော်ဒါ|ပို့ခ|delivery/.test(text)) return;
  if (/(လိုင်း|signal|coverage).*(သေချာ|အာမခံ|အမြန်နှုန်း)|ရွာ.*လိုင်း/.test(text))
    return offerHelp(input, "လိုင်းရနှုန်းက SIM နဲ့ သုံးမယ့်နေရာပေါ် မူတည်ပါတယ်ဗျ။");
  const digits = text.replace(/[၀-၉]/g, digit => String(digit.charCodeAt(0) - 0x1040)).replace(/,/g, "");
  const lakh = digits.match(/(တစ်|တ|နှစ်|သုံး|လေး|ငါး|\d+(?:\.\d+)?)\s*သိန်း/);
  const lakhValues: Record<string,number> = {တစ်:1,တ:1,နှစ်:2,သုံး:3,လေး:4,ငါး:5};
  const budget = lakh ? (lakhValues[lakh[1]] || Number(lakh[1])) * 100000 : Number(digits.match(/(?:under|budget)\s*(\d{4,})/)?.[1] || digits.match(/(\d{4,})\s*(?:ကျပ်|ks|mmk|အောက်|မကျော်|လောက်ပဲ)/)?.[1]);
  const hasBudget = /အောက်|ဘတ်ဂျက်|budget|under|မကျော်|လောက်ပဲ/.test(text);
  if (hasBudget && !budget)
    return offerHelp(input, "ဘတ်ဂျက်နဲ့ ကိုက်တဲ့ မော်ဒယ်ကို ဆိုင်က စစ်ပေးနိုင်ပါတယ်ဗျ။");
  let use: Use | undefined;
  if (portableWords.test(text)) use = "portable";
  else if (homeWords.test(text)) use = "home";

  if (!use && /router|ရောက်တာ|ရောက်တာစက်|ရောက်တာစျေး/.test(text) && /ဈေး|စျေး|စျေ|စျေးနှုန်း|price|ဘယ်လောက်/.test(text) && !/[a-z]+[0-9]/i.test(text)) use = "home";
  const antenna = antennaWords.test(text);
  const bank = bankWords.test(text);
  if (!use && (antenna || bank)) {
    if (previous.startsWith("သယ်သုံးဖို့")) use = "portable";
    if (previous.startsWith("အိမ်သုံးအတွက်")) use = "home";
  }
  const models = (text.match(/[a-z0-9]+/g) || []).filter(word => /[a-z]/.test(word) && /[0-9]/.test(word));
  if (!use && !antenna && !bank && /လိုင်း|လိုင်းရ|လှိုင်း|signal|coverage|wifi|ဝိုင်ဖိုင်|ဝိုင်ဖိုင်း|စက်.*ပြပေး/.test(text)) return useQuestion;
  if (!use && !antenna && !bank) return;
  const category = new Map(catalog.categories.map(c => [c.id, c.name_en.trim().toLowerCase()]));
  const products = catalog.products.filter(p => {
    const words: string[] = p.name_en.toLowerCase().match(/[a-z0-9]+/g) || [];
    if (!models.every(model => words.includes(model))) return false;
    const group = category.get(p.category_id);
    if (hasBudget && (p.price > budget || (p.price === budget && /အောက်|under/.test(text)))) return false;
    if (!p.is_active || !["mifi", "routers"].includes(group || "")) return false;
    const info = [p.name_en,p.name_mm,p.description_en,p.description_mm].join("\n").toLowerCase();
    const portable = group === "mifi" || /pocket wi-?fi|portable router/.test(p.name_en.toLowerCase());
    if ((use === "portable" && !portable) || (use === "home" && portable)) return false;
    if (antenna && (!antennaWords.test(info) || /(?:no|without|internal) (?:external )?antennas?|antenna (?:port|connector)|တိုင်မပါ/.test(info))) return false;
    if (bank && (!bankWords.test(info) || /(?:no|without) power\s*bank|ပါဝါဘဏ်မပါ/.test(info))) return false;
    return true;
  }).sort((a,b) => a.price-b.price || a.id-b.id);
  if (!products.length) return offerHelp(input, "အဲဒီအချက်တွေနဲ့ ကိုက်ညီတဲ့စက်ကို လက်ရှိ Website စာရင်းထဲမှာ အတည်မပြုနိုင်သေးပါဘူးဗျ။");
  const lead = use === "portable" ? "သယ်သုံးဖို့ " : use === "home" ? "အိမ်သုံးအတွက် " : "";
  const feature = [antenna && "တိုင်ပါတဲ့", bank && "Powerbank ပါတဲ့"].filter(Boolean).join("၊ ");
  return lead + feature + " WiFi စက်တွေထဲက ဈေးသက်သာတဲ့ဘက်က စပြီး ပြပေးထားပါတယ်ဗျ။\n\n" +
    products.slice(0,3).map(p => p.name_en + " — " + p.price.toLocaleString("en-US") + " ကျပ်\n" + shop + "/products/" + p.id).join("\n\n");
}

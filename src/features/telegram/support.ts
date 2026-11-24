import type { Product } from "../catalog/data";

export const shop = "https://www.unitshopmm.com";

export function faq(input: string): string | undefined {
  const text = input.trim().toLowerCase();
  if (/^(\/start(?: .*)?|\/help|hi|hello|မင်္ဂလာပါ)$/.test(text))
    return "မင်္ဂလာပါဗျ။ ဈေးနှုန်းနဲ့ ပစ္စည်းအကြောင်း သိချင်ရင် မော်ဒယ်နာမည် ရိုက်ပေးပါ။ COD၊ MMQR နဲ့ Promotion အကြောင်းလည်း မေးနိုင်ပါတယ်။ ဆိုင်ကို တိုက်ရိုက်မေးချင်ရင် /staff နောက်မှာ မေးခွန်းရေးပေးပါ။";
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

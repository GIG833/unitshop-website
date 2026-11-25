import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadCatalog } from "@/features/catalog/data";
import { faq, productAnswer, shoppingAnswer, handoff, offerHelp } from "@/features/telegram/support";

import { aiShopping } from "@/features/telegram/assistant";

type Message = {
  chat: { id: number; type: string };
  from?: { id: number; is_bot?: boolean };
  text?: string;
  caption?: string;
  photo?: {file_id: string; width: number; file_size?: number}[];
  reply_to_message?: { from?: { id: number }; text?: string; caption?: string; forward_origin?: unknown };
};

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const staff = process.env.TELEGRAM_SUPPORT_CHAT_ID;
  if (!token || !secret || !staff) return new Response(null, { status: 503 });
  const received = Buffer.from(request.headers.get("x-telegram-bot-api-secret-token") || "");
  const expected = Buffer.from(secret);
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    return new Response(null, { status: 403 });

  async function send(chat: number | string, text: string, prompt: boolean | string[][] = false) {
    const response = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, ...(Array.isArray(prompt) ? {reply_markup: {keyboard:prompt.map(row=>row.map(text=>({text}))),resize_keyboard:true,one_time_keyboard:true}} : prompt ? {reply_markup: {force_reply: true}} : {}), link_preview_options: { is_disabled: true } }),
    });
    if (!response.ok) throw new Error("Telegram delivery failed");
  }

  const { message }: { message?: Message } = await request.json();
  if (!message?.chat || message.from?.is_bot) return new Response(null);
  const text = (message.text || message.caption)?.trim();
  if (String(message.chat.id) === staff) {
    const reply = message.reply_to_message;
    const customer = (reply?.text || reply?.caption)?.match(/^UnitShop inquiry #([1-9]\d*)\n/)?.[1];
    if (customer && text && !reply?.forward_origin && String(reply?.from?.id) === token.split(":")[0])
      await send(customer, text);
  } else if (message.chat.type === "private") {
    const id = message.chat.id;
    const photo = message.photo?.at(-1)?.file_id;
    const question = text || (photo ? "ပုံထဲက ပစ္စည်းဈေး မေးထားပါတယ်။" : "");
    if (!question) {
      await send(id, "ရှာနေတဲ့စက်ပုံလေး ပို့ပေးလို့ရပါတယ်ဗျ။");
      return new Response(null);
    }
    const reply = message.reply_to_message;
    const previous = !reply?.forward_origin && String(reply?.from?.id) === token.split(":")[0] ? reply?.text || "" : "";
    const inquiry = handoff(question, previous);
    async function relayPhoto(fileId: string) {
      const response = await fetch("https://api.telegram.org/bot" + token + "/sendPhoto", {
        method:"POST", headers:{"content-type":"application/json"},
        body:JSON.stringify({chat_id:staff,photo:fileId,caption:"UnitShop inquiry #"+id+"\n"+question.slice(0,900)}),
      });
      if (!response.ok) throw new Error("Telegram photo handoff failed");
    }
    if (inquiry) {
      if (photo) await relayPhoto(photo);
      else await send(staff, "UnitShop inquiry #" + id + "\n" + inquiry.slice(0, 3900));
      await send(id, "မေးခွန်းကို ဆိုင်ဆီ ပို့ပေးထားပါပြီဗျ။ ဒီ Chat ထဲမှာ ပြန်လည်ဖြေကြားပေးပါမယ်။");
      return new Response(null);
    }
    let answer = photo ? undefined : faq(question, previous);
    if (/^\/start(?: |$)|^\/help$/i.test(question) && !photo) {
      await send(id, "မင်္ဂလာပါဗျ။ စက်ပုံလေး ပို့ပြီး ဈေးမေးလို့ရပါတယ်။ အောက်ကနေလည်း နှိပ်ရွေးနိုင်ပါတယ်။",
        [["Router ဈေးပြပါ", "သယ်သုံးဖို့ WiFi"], ["ဆိုင်လိပ်စာ", "အိမ်ရောက်ငွေချေ"], ["ဆိုင်ကိုမေးပေးပါ"]]);
      return new Response(null);
    }
    const conversational = !answer || answer.endsWith("ဘယ်မြို့နယ်မှာ သုံးမှာလဲ?");
    if (!answer) {
      try {
        const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const catalog = await loadCatalog(client);
        if (!photo) answer = shoppingAnswer(question, catalog, previous) || productAnswer(question, catalog.products);
        if (!answer || answer.includes("ဆိုင်က စစ်ပေးစေချင်ရင်")) {
          answer = await aiShopping(question, catalog, token, photo) || answer;
        }
      } catch {
        answer = photo ? undefined : offerHelp(question, "ပစ္စည်းစာရင်းကို ခဏ ဖတ်မရသေးပါဘူးဗျ။");
      }
    }
    if (photo && !answer) {
      await relayPhoto(photo);
      await send(id, "ပုံလေး ရထားပါတယ်ဗျ။ ဆိုင်က မော်ဒယ်နဲ့ ဈေးကို စစ်ပြီး ဒီမှာ ပြန်ဖြေပေးပါမယ်။");
      return new Response(null);
    }
    if (!answer || answer.includes("ဆိုင်က စစ်ပေးစေချင်ရင်")) {
      const summary = answer?.split("\n\n")[0] || "ဘာလေး ကြည့်ချင်လဲဗျ။ အောက်ကနေ နှိပ်ရွေးလို့ရပါတယ်။";
      await send(id, summary, [["Router ဈေးပြပါ", "သယ်သုံးဖို့ WiFi"], ["ဆိုင်ကိုမေးပေးပါ — " + (answer?.split("\nမေးထားတာ — ")[1] || question).slice(0, 110)]]);
    } else if (answer.endsWith("သယ်သုံးဖို့လား?")) {
      await send(id, answer, [["အိမ်သုံးဖို့", "သယ်သုံးဖို့"]]);
    } else {
      await send(id, answer, conversational);
    }
  }
  return new Response(null);
}

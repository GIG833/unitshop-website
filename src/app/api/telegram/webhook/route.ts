import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadCatalog } from "@/features/catalog/data";
import { faq, productAnswer, shoppingAnswer, handoff, offerHelp } from "@/features/telegram/support";

type Message = {
  chat: { id: number; type: string };
  from?: { id: number; is_bot?: boolean };
  text?: string;
  reply_to_message?: { from?: { id: number }; text?: string; forward_origin?: unknown };
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

  async function send(chat: number | string, text: string, prompt = false) {
    const response = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, ...(prompt ? {reply_markup: {force_reply: true}} : {}), link_preview_options: { is_disabled: true } }),
    });
    if (!response.ok) throw new Error("Telegram delivery failed");
  }

  const { message }: { message?: Message } = await request.json();
  if (!message?.chat || message.from?.is_bot) return new Response(null);
  const text = message.text?.trim();
  if (String(message.chat.id) === staff) {
    const reply = message.reply_to_message;
    const customer = reply?.text?.match(/^UnitShop inquiry #([1-9]\d*)\n/)?.[1];
    if (customer && text && !reply?.forward_origin && String(reply?.from?.id) === token.split(":")[0])
      await send(customer, text);
  } else if (message.chat.type === "private") {
    const id = message.chat.id;
    if (!text) {
      await send(id, "မေးခွန်းလေးကို စာနဲ့ ရိုက်ပေးပါဗျ။");
      return new Response(null);
    }
    const reply = message.reply_to_message;
    const previous = !reply?.forward_origin && String(reply?.from?.id) === token.split(":")[0] ? reply?.text || "" : "";
    const inquiry = handoff(text, previous);
    if (inquiry) {
      await send(staff, "UnitShop inquiry #" + id + "\n" + inquiry.slice(0, 3900));
      await send(id, "မေးခွန်းကို ဆိုင်ဆီ ပို့ပေးထားပါပြီဗျ။ ဒီ Chat ထဲမှာ ပြန်လည်ဖြေကြားပေးပါမယ်။");
      return new Response(null);
    }
    let answer = faq(text);
    const conversational = !answer;
    if (!answer) {
      try {
        const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const catalog = await loadCatalog(client);
        answer = shoppingAnswer(text, catalog, previous) || productAnswer(text, catalog.products);
      } catch {
        answer = offerHelp(text, "ပစ္စည်းစာရင်းကို ခဏ ဖတ်မရသေးပါဘူးဗျ။");
      }
    }
    await send(id, answer || offerHelp(text, "ဘယ်လိုပစ္စည်းရှာနေတာလဲဗျ။ မော်ဒယ်နာမည် ဒါမှမဟုတ် လိုချင်တဲ့အချက်လေး ရေးပေးပါ။"), conversational);
  }
  return new Response(null);
}

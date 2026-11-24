// Explicit preview-only setup. Never print callback URLs or request credentials.
const env = process.env;
if (env.VERCEL_ENV !== "preview") throw Error("Requires Preview");
const url = new URL(env.TELEGRAM_PREVIEW_CALLBACK);
if (!/^unitshop-website-[a-z0-9]+-gig-d1c7\.vercel\.app$/.test(url.hostname) || url.protocol !== "https:" || url.pathname !== "/api/telegram/webhook") throw Error("Unexpected callback");
const secret = env.TELEGRAM_WEBHOOK_SECRET;
if (!secret || !env.TELEGRAM_BOT_TOKEN) throw Error("Missing bot configuration");
const response = await fetch(url, {method:"POST", redirect:"manual",headers:{"content-type":"application/json","x-telegram-bot-api-secret-token":secret},body:"{}"});
if(response.status !== 200 || (await response.text()) !== "") throw Error("Preview callback check failed: HTTP " + response.status);
async function telegram(method, body) {
  const res = await fetch("https://api.telegram.org/bot"+env.TELEGRAM_BOT_TOKEN+"/"+method,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  if(!data.ok) throw Error(method+" failed: HTTP "+res.status);
  return data.result;
}
if ((await telegram("getMe",{})).username !== "UnitShopMMBot") throw Error("Unexpected bot");
const group=await telegram("getChat",{chat_id:env.TELEGRAM_SUPPORT_CHAT_ID});
if(group.title !== "UNITSHOP CUSTOMER SERVICE") throw Error("Unexpected support chat");
await telegram("setWebhook",{url:url.href,secret_token:secret,allowed_updates:["message"]});
if((await telegram("getWebhookInfo",{})).url!==url.href) throw Error("Callback registration not confirmed");
console.log("Verified Telegram Preview webhook and staff destination");

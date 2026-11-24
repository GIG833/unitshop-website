// Run once on the intended preview with the group name and private pairing command.
const [title, command] = process.argv.slice(2);
if (!title || !command || process.env.VERCEL_ENV !== "preview") throw Error("Preview pairing arguments required");
async function telegram(method) {
  const r = await fetch("https://api.telegram.org/bot" + process.env.TELEGRAM_BOT_TOKEN + "/" + method);
  if (!r.ok) throw Error("Telegram request failed: HTTP " + r.status);
  return (await r.json()).result;
}
if ((await telegram("getMe")).username !== "UnitShopMMBot") throw Error("Unexpected bot");
const updates = await telegram("getUpdates?limit=100");
const groups = new Set(updates.map(update => update.message).filter(message =>
  message && ["group","supergroup"].includes(message.chat.type) &&
  message.chat.title === title && message.text === command
).map(message => message.chat.id));
if (groups.size !== 1) throw Error("Pairing message missing or ambiguous");
console.log("Verified staff group ID", [...groups][0]);

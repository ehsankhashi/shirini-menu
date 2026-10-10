// سرور سفارش‌های شیرینی‌سرا — بدون وابستگی (Node 18 یا بالاتر)
//
// جریان کار:
//  1) سایت سفارش را POST می‌کند به /api/orders
//  2) سرور سفارش را ذخیره و با ربات (بله یا تلگرام) برای فروشگاه می‌فرستد؛ زیر پیام دکمه‌های «تأیید» و «لغو» است
//  3) وقتی فروشگاه «تأیید» را بزند، وضعیت می‌شود confirmed (= در حال آماده‌سازی)
//     و (اگر پیامک تنظیم شده باشد) برای مشتری پیامک می‌رود. سایت هم وضعیت را می‌گیرد و به مشتری نشان می‌دهد.
//
// تنظیمات با متغیرهای محیطی:
//   BOT_TOKEN        توکن ربات (الزامی)
//   OWNER_CHAT_ID    شناسه‌ی چت/گروهی که سفارش‌ها به آن می‌آید (الزامی)
//   BOT_API          آدرس API ربات. پیش‌فرض بله: https://tapi.bale.ai   |  تلگرام: https://api.telegram.org
//   ALLOWED_ORIGIN   آدرس سایت برای CORS، مثل https://shirinisara.ir (پیش‌فرض *)
//   PORT             پیش‌فرض 3000
//   KAVENEGAR_KEY    (اختیاری) کلید کاوه‌نگار برای پیامک به مشتری
//   KAVENEGAR_SENDER (اختیاری) شماره‌ی فرستنده

"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const {
  BOT_TOKEN, OWNER_CHAT_ID,
  BOT_API = "https://tapi.bale.ai",
  ALLOWED_ORIGIN = "*",
  PORT = 3000,
  KAVENEGAR_KEY, KAVENEGAR_SENDER,
} = process.env;

if (!BOT_TOKEN || !OWNER_CHAT_ID) {
  console.error("BOT_TOKEN و OWNER_CHAT_ID را تنظیم کنید (README را ببینید).");
  process.exit(1);
}

const DB_FILE = path.join(__dirname, "orders.json");
const STATUS_TEXT = {
  pending: "⏳ در انتظار تأیید",
  confirmed: "✅ تأیید شد — در حال آماده‌سازی",
  delivered: "🎉 تحویل شد",
  canceled: "❌ لغو شد",
};

// ---------- ذخیره‌سازی ساده در فایل ----------
let db = {};
try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); } catch (e) { db = {}; }
function saveDb() {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}

// ---------- ربات ----------
async function bot(method, payload) {
  const r = await fetch(`${BOT_API}/bot${BOT_TOKEN}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.ok === false) throw new Error(`${method} failed: ${JSON.stringify(d)}`);
  return d;
}

const fa = n => Number(n).toLocaleString("fa-IR");

function orderText(o) {
  let m = `🎂 سفارش جدید — شیرینی‌سرا\nشماره: ${o.no}\n\n👤 ${o.name}\n📞 ${o.phone}\n🛵 روش تحویل: ${o.delivery}\n`;
  if (o.delivery === "پیک") m += `📍 آدرس: ${o.address}\n`;
  m += `📅 زمان تحویل: ${o.when}\n\n`;
  o.items.forEach(it => { m += `• ${it.name}${it.opts ? ` (${it.opts})` : ""} ×${it.qty} — ${fa(it.line)} تومان\n`; });
  m += `\nجمع: ${fa(o.t.subtotal)} تومان`;
  if (o.t.off) m += `\nتخفیف: −${fa(o.t.off)} تومان`;
  if (o.t.shipping) m += `\nهزینه ارسال: ${fa(o.t.shipping)} تومان`;
  m += `\nقابل پرداخت: ${fa(o.t.total)} تومان`;
  if (o.note) m += `\n\n📝 ${o.note}`;
  return m;
}

function keyboardFor(o) {
  if (o.status === "pending") {
    return [[
      { text: "✅ تأیید و شروع آماده‌سازی", callback_data: `confirmed:${o.no}` },
      { text: "❌ لغو", callback_data: `canceled:${o.no}` },
    ]];
  }
  if (o.status === "confirmed") {
    return [[
      { text: "🎉 تحویل شد", callback_data: `delivered:${o.no}` },
      { text: "❌ لغو", callback_data: `canceled:${o.no}` },
    ]];
  }
  return [];
}

async function sendSms(phone, text) {
  if (!KAVENEGAR_KEY) return;
  const q = new URLSearchParams({ receptor: phone, message: text });
  if (KAVENEGAR_SENDER) q.set("sender", KAVENEGAR_SENDER);
  try {
    const r = await fetch(`https://api.kavenegar.com/v1/${KAVENEGAR_KEY}/sms/send.json?${q}`);
    if (!r.ok) console.warn("SMS failed:", r.status, await r.text());
  } catch (e) { console.warn("SMS error:", e.message); }
}

const CUSTOMER_SMS = {
  confirmed: o => `سلام ${o.name}، سفارش شماره ${o.no} شما در شیرینی‌سرا تأیید شد و در حال آماده‌سازی است. 🧁`,
  canceled: o => `سلام ${o.name}، متأسفانه سفارش شماره ${o.no} شما لغو شد. برای اطلاعات بیشتر با ما تماس بگیرید.`,
};

// ---------- دریافت پاسخ دکمه‌ها (long polling؛ نیازی به آدرس عمومی/وبهوک نیست) ----------
async function pollUpdates() {
  let offset = 0;
  for (;;) {
    try {
      const d = await bot("getUpdates", { offset, timeout: 30, allowed_updates: ["callback_query"] });
      for (const u of d.result || []) {
        offset = u.update_id + 1;
        if (u.callback_query) await handleCallback(u.callback_query).catch(e => console.warn("callback:", e.message));
      }
    } catch (e) {
      console.warn("poll error:", e.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

async function handleCallback(cb) {
  const msg = cb.message;
  // فقط از چت/گروه فروشگاه پذیرفته می‌شود
  if (!msg || String(msg.chat.id) !== String(OWNER_CHAT_ID)) {
    return bot("answerCallbackQuery", { callback_query_id: cb.id, text: "مجاز نیست" });
  }
  const [status, no] = String(cb.data || "").split(":");
  const o = db[no];
  if (!o || !STATUS_TEXT[status]) {
    return bot("answerCallbackQuery", { callback_query_id: cb.id, text: "سفارش پیدا نشد" });
  }
  if (o.status === status) {
    return bot("answerCallbackQuery", { callback_query_id: cb.id, text: "قبلاً ثبت شده" });
  }
  o.status = status;
  o.updatedAt = Date.now();
  saveDb();
  if (CUSTOMER_SMS[status]) sendSms(o.phone, CUSTOMER_SMS[status](o));
  await bot("answerCallbackQuery", { callback_query_id: cb.id, text: STATUS_TEXT[status] });
  await bot("editMessageText", {
    chat_id: msg.chat.id, message_id: msg.message_id,
    text: `${orderText(o)}\n\nوضعیت: ${STATUS_TEXT[status]}`,
    reply_markup: { inline_keyboard: keyboardFor(o) },
  });
}

// ---------- HTTP ----------
const hits = new Map();   // محدودیت ساده‌ی نرخ: ۱۰ سفارش در ساعت برای هر IP
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 3600e3);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 10;
}

function send(res, code, obj) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit = 100 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > limit) { reject(new Error("big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const str = (v, max) => String(v ?? "").slice(0, max);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

function cleanOrder(b) {
  if (!b || !/^09\d{9}$/.test(String(b.phone))) return null;
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50) return null;
  const items = b.items.map(it => ({
    name: str(it.name, 100), opts: str(it.opts, 200),
    qty: Math.max(1, Math.min(999, num(it.qty))), unit: num(it.unit), line: num(it.line),
  }));
  const t = b.t || {};
  return {
    no: str(b.no, 20).replace(/\D/g, "") || String(Date.now()).slice(-6),
    name: str(b.name, 100), phone: String(b.phone),
    delivery: b.delivery === "پیک" ? "پیک" : "حضوری",
    address: str(b.address, 500), note: str(b.note, 1000),
    when: str(b.when, 100), issued: str(b.issued, 50),
    items, t: { subtotal: num(t.subtotal), off: num(t.off), shipping: num(t.shipping), total: num(t.total) },
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "OPTIONS") return send(res, 204, {});

  // ثبت سفارش
  if (req.method === "POST" && url.pathname === "/api/orders") {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress;
    if (rateLimited(ip)) return send(res, 429, { ok: false, error: "تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید" });
    let order;
    try { order = cleanOrder(JSON.parse(await readBody(req))); } catch (e) { order = null; }
    if (!order) return send(res, 400, { ok: false, error: "اطلاعات سفارش معتبر نیست" });
    while (db[order.no]) order.no = String(Number(order.no) + 1);   // شماره‌ی تکراری
    order.status = "pending";
    order.createdAt = Date.now();
    db[order.no] = order;
    saveDb();
    try {
      await bot("sendMessage", { chat_id: OWNER_CHAT_ID, text: orderText(order), reply_markup: { inline_keyboard: keyboardFor(order) } });
    } catch (e) {
      console.error("ارسال به فروشگاه ناموفق:", e.message);
      delete db[order.no]; saveDb();
      return send(res, 502, { ok: false, error: "ارسال سفارش به فروشگاه ناموفق بود" });
    }
    return send(res, 200, { ok: true, no: order.no });
  }

  // وضعیت سفارش (با شماره‌ی سفارش + موبایل)
  const m = url.pathname.match(/^\/api\/orders\/(\d+)$/);
  if (req.method === "GET" && m) {
    const o = db[m[1]];
    if (!o || o.phone !== url.searchParams.get("phone")) return send(res, 404, { ok: false });
    return send(res, 200, { ok: true, status: o.status });
  }

  send(res, 404, { ok: false });
});

server.listen(PORT, () => console.log(`سرور سفارش روی پورت ${PORT} اجرا شد`));
pollUpdates();

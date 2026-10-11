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
//
// پرداخت آنلاین (زرین‌پال) — اگر ZARINPAL_MERCHANT تنظیم نشود، پرداخت غیرفعال است
// و «تأیید» مثل قبل مستقیم سفارش را به «در حال آماده‌سازی» می‌برد:
//   ZARINPAL_MERCHANT کد مرچنت ۳۶ حرفی
//   PUBLIC_URL        آدرس عمومی همین سرور (https) مثل https://order.your-site.ir
//   SITE_URL          آدرس سایت منو (مقصد بازگشت از درگاه) مثل https://user.github.io/shirini-menu/
//   ZARINPAL_SANDBOX  اگر مقدار داشته باشد (مثلاً 1) از درگاه آزمایشی استفاده می‌شود

"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  BOT_TOKEN, OWNER_CHAT_ID,
  BOT_API = "https://tapi.bale.ai",
  ALLOWED_ORIGIN = "*",
  PORT = 3000,
  KAVENEGAR_KEY, KAVENEGAR_SENDER,
  ZARINPAL_MERCHANT, ZARINPAL_SANDBOX, SITE_URL,
} = process.env;
const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/$/, "");

if (!BOT_TOKEN || !OWNER_CHAT_ID) {
  console.error("BOT_TOKEN و OWNER_CHAT_ID را تنظیم کنید (README را ببینید).");
  process.exit(1);
}

const DB_FILE = process.env.DB_FILE || path.join(__dirname, "orders.json");
const PAY_ON = !!(ZARINPAL_MERCHANT && PUBLIC_URL && SITE_URL);
if (!PAY_ON) console.warn("پرداخت آنلاین غیرفعال است (ZARINPAL_MERCHANT / PUBLIC_URL / SITE_URL تنظیم نشده)");
const ZP = ZARINPAL_SANDBOX ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
const STATUS_TEXT = {
  pending: "⏳ در انتظار تأیید",
  awaiting_payment: "💳 تأیید شد — در انتظار پرداخت مشتری",
  confirmed: PAY_ON ? "✅ پرداخت شد — در حال آماده‌سازی" : "✅ تأیید شد — در حال آماده‌سازی",
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
      { text: PAY_ON ? "✅ تأیید و درخواست پرداخت" : "✅ تأیید و شروع آماده‌سازی",
        callback_data: `${PAY_ON ? "awaiting_payment" : "confirmed"}:${o.no}` },
      { text: "❌ لغو", callback_data: `canceled:${o.no}` },
    ]];
  }
  if (o.status === "awaiting_payment") {
    return [[
      { text: "💵 پرداخت دستی/حضوری شد", callback_data: `confirmed:${o.no}` },
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

const payLink = o => `${PUBLIC_URL}/pay/${o.no}?k=${o.payKey}`;
const CUSTOMER_SMS = {
  awaiting_payment: o => `سلام ${o.name}، سفارش شماره ${o.no} شما در شیرینی‌سرا تأیید شد. برای شروع آماده‌سازی پرداخت کنید: ${payLink(o)}`,
  confirmed: o => PAY_ON
    ? `سلام ${o.name}، پرداخت سفارش شماره ${o.no} ثبت شد و سفارش شما در حال آماده‌سازی است. 🧁`
    : `سلام ${o.name}، سفارش شماره ${o.no} شما در شیرینی‌سرا تأیید شد و در حال آماده‌سازی است. 🧁`,
  canceled: o => `سلام ${o.name}، متأسفانه سفارش شماره ${o.no} شما لغو شد. برای اطلاعات بیشتر با ما تماس بگیرید.`,
};

// ---------- پرداخت (زرین‌پال v4) ----------
async function zp(endpoint, body) {
  const r = await fetch(`${ZP}/pg/v4/payment/${endpoint}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}

function htmlPage(res, code, msg) {
  res.writeHead(code, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body dir="rtl" style="font-family:Tahoma,sans-serif;text-align:center;padding:60px 20px;line-height:2">${msg}</body>`);
}

const verifying = new Set();   // جلوگیری از verify هم‌زمان برای یک سفارش

async function notifyPaid(o) {
  const text = `${orderText(o)}\n\nوضعیت: ${STATUS_TEXT.confirmed}\n💳 کد پیگیری درگاه: ${o.refId}`;
  let edited = false;
  if (o.msgId) {
    try {
      await bot("editMessageText", { chat_id: OWNER_CHAT_ID, message_id: o.msgId, text, reply_markup: { inline_keyboard: keyboardFor(o) } });
      edited = true;
    } catch (e) { console.warn("edit owner msg:", e.message); }
  }
  await bot("sendMessage", edited
    ? { chat_id: OWNER_CHAT_ID, text: `💳 پرداخت سفارش ${o.no} انجام شد — ${fa(o.t.total)} تومان (پیگیری: ${o.refId})\nمشتری: ${o.name}` }
    : { chat_id: OWNER_CHAT_ID, text, reply_markup: { inline_keyboard: keyboardFor(o) } }
  ).catch(e => console.warn("notify owner:", e.message));
}

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
  const ALLOWED = {
    pending: PAY_ON ? ["awaiting_payment", "canceled"] : ["confirmed", "canceled"],
    awaiting_payment: ["confirmed", "canceled"],
    confirmed: ["delivered", "canceled"],
  };
  if (!(ALLOWED[o.status] || []).includes(status)) {
    return bot("answerCallbackQuery", { callback_query_id: cb.id, text: "این تغییر وضعیت مجاز نیست" });
  }
  const prev = o.status;
  o.status = status;
  o.updatedAt = Date.now();
  try { saveDb(); } catch (e) {
    o.status = prev;
    console.error("saveDb:", e.message);
    return bot("answerCallbackQuery", { callback_query_id: cb.id, text: "ذخیره ناموفق بود" });
  }
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
  if (req.method === "OPTIONS") {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  });
  return res.end();
}

  // ثبت سفارش
  if (req.method === "POST" && url.pathname === "/api/orders") {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress;
    if (rateLimited(ip)) return send(res, 429, { ok: false, error: "تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید" });
    let order;
    try { order = cleanOrder(JSON.parse(await readBody(req))); } catch (e) { order = null; }
    if (!order) return send(res, 400, { ok: false, error: "اطلاعات سفارش معتبر نیست" });
    while (db[order.no]) order.no = String(Number(order.no) + 1);   // شماره‌ی تکراری
    order.status = "pending";
    order.payKey = crypto.randomBytes(8).toString("hex");
    order.createdAt = Date.now();
    db[order.no] = order;
    try { saveDb(); } catch (e) {
      console.error("ذخیره‌ی سفارش ناموفق:", e.message);
      delete db[order.no];
      return send(res, 500, { ok: false, error: "ذخیره‌ی سفارش ناموفق بود" });
    }
    try {
      const sent = await bot("sendMessage", { chat_id: OWNER_CHAT_ID, text: orderText(order), reply_markup: { inline_keyboard: keyboardFor(order) } });
      order.msgId = sent.result && sent.result.message_id;
      try { saveDb(); } catch (e) { console.warn("saveDb msgId:", e.message); }
    } catch (e) {
      console.error("ارسال به فروشگاه ناموفق:", e.message);
      delete db[order.no];
      try { saveDb(); } catch (e2) {}
      return send(res, 502, { ok: false, error: "ارسال سفارش به فروشگاه ناموفق بود" });
    }
    return send(res, 200, { ok: true, no: order.no });
  }

  // وضعیت سفارش (با شماره‌ی سفارش + موبایل)
  // اگر سفارش نباشد 200 با gone:true برمی‌گردد تا کنسول مرورگر پر از خطای 404 نشود
  const m = url.pathname.match(/^\/api\/orders\/(\d+)$/);
  if (req.method === "GET" && m) {
    const o = db[m[1]];
    if (!o || o.phone !== url.searchParams.get("phone")) return send(res, 200, { ok: false, gone: true });
    const out = { ok: true, status: o.status, total: o.t.total };
    if (PAY_ON && o.status === "awaiting_payment") out.payUrl = payLink(o);
    return send(res, 200, out);
  }

  // شروع پرداخت: مشتری از سایت/پیامک به این آدرس می‌آید و به درگاه می‌رود
  const p = url.pathname.match(/^\/pay\/(\d+)$/);
  if (PAY_ON && req.method === "GET" && p) {
    const o = db[p[1]];
    if (!o || o.payKey !== url.searchParams.get("k")) return htmlPage(res, 404, "سفارش پیدا نشد.");
    if (o.status === "confirmed" || o.status === "delivered") return htmlPage(res, 200, "این سفارش قبلاً پرداخت شده است. ✅");
    if (o.status !== "awaiting_payment") return htmlPage(res, 400, "این سفارش در مرحله‌ی پرداخت نیست.");
    try {
      const d = await zp("request", {
        merchant_id: ZARINPAL_MERCHANT,
        amount: o.t.total * 10,                                  // تومان ← ریال
        callback_url: `${PUBLIC_URL}/pay/callback?no=${o.no}`,
        description: `سفارش شیرینی‌سرا ${o.no}`,
        metadata: { mobile: o.phone },
      });
      if (!d.data || d.data.code !== 100) throw new Error(JSON.stringify(d));
      o.authority = d.data.authority;
      saveDb();
      res.writeHead(302, { Location: `${ZP}/pg/StartPay/${d.data.authority}` });
      return res.end();
    } catch (e) {
      console.error("payment request failed:", e.message);
      return htmlPage(res, 502, "اتصال به درگاه ناموفق بود. کمی بعد دوباره تلاش کنید.");
    }
  }

  // بازگشت از درگاه: سرور خودش پرداخت را verify می‌کند
  if (PAY_ON && req.method === "GET" && url.pathname === "/pay/callback") {
    const o = db[url.searchParams.get("no")];
    const authority = url.searchParams.get("Authority");
    const back = ok => {
      const to = new URL(SITE_URL);
      to.searchParams.set("pay", ok ? "ok" : "fail");
      if (o) to.searchParams.set("order", o.no);
      res.writeHead(302, { Location: to.toString() });
      res.end();
    };
    if (!o || !authority || o.authority !== authority) return back(false);
    if (o.status === "confirmed" || o.status === "delivered") return back(true);   // رفرش مجدد
    if (o.status !== "awaiting_payment" || url.searchParams.get("Status") !== "OK") return back(false);
    if (verifying.has(o.no)) return back(false);
    verifying.add(o.no);
    try {
      const d = await zp("verify", { merchant_id: ZARINPAL_MERCHANT, amount: o.t.total * 10, authority });
      if (d.data && (d.data.code === 100 || d.data.code === 101)) {
        o.status = "confirmed";
        o.paidAt = Date.now();
        o.refId = d.data.ref_id;
        o.updatedAt = Date.now();
        try { saveDb(); } catch (e) { console.error("saveDb بعد از پرداخت (مهم!):", e.message, "سفارش", o.no, "ref", o.refId); }
        sendSms(o.phone, CUSTOMER_SMS.confirmed(o));
        notifyPaid(o);
        return back(true);
      }
      console.warn("verify failed:", JSON.stringify(d));
    } catch (e) { console.error("verify error:", e.message); }
    finally { verifying.delete(o.no); }
    return back(false);
  }

  send(res, 404, { ok: false });
});

server.listen(PORT, () => console.log(`سرور سفارش روی پورت ${PORT} اجرا شد`));
pollUpdates();

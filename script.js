// ================= ویرایش فروشگاه =================
// آدرس سرور دریافت سفارش (پوشه‌ی server همین پروژه). مثال: "https://order.example.ir"
// سفارش‌ها به این سرور ارسال می‌شوند و سرور آن‌ها را برای فروشگاه (بله/تلگرام) می‌فرستد.
const ORDER_API = "https://ehsankhashi.github.io/shirini-menu/";
// کدهای تخفیف: درصد
const DISCOUNTS = { "WELCOME10": 10, "SWEET20": 20 };
// حداقل زمان سفارش (ساعت قبل از تحویل) — برای کیک ۲۴ ساعت
const MIN_ORDER_HOURS = 24;
// هزینه ارسال (تومان) — تحویل حضوری رایگان است
const SHIPPING_COST = 60000;
// بازه‌ی مجاز ساعت تحویل (۱۰ صبح تا ۱۰ شب)
const HOUR_MIN = 10, HOUR_MAX = 22;

// محصولات: img آدرس عکس، tags برچسب (hot پرفروش / new جدید)، available ناموجود، sales تعداد فروش، views تعداد بازدید (برای مرتب‌سازی)
const products = [
  { id: 1, name: "کیک روسی", desc: "لایه‌های نرم عسلی با کرم خامه‌ای", price: 720000, cat: "cake", emoji: "🍰", img: "", tags: [], available: true, sales: 140, views: 980, sizes: ["۶ نفره","۸ نفره"] },
  { id: 2, name: "کیک شکلاتی", desc: "گاناش شکلات تلخ، مناسب ۸ نفر", price: 850000, discount: 5, cat: "cake", emoji: "🎂", img: "images/cake1.jpg", tags: ["hot"], available: true, sales: 310, views: 2100, sizes: ["۶ نفره","۸ نفره","۱۲ نفره"], flavors: ["شکلات تلخ","شکلات شیری","نارگیلی"] },
  { id: 3, name: "کیک سه شیر", desc: "نرم و آبدار با خامه‌ی تازه", price: 680000, cat: "cake", emoji: "🥛", img: "", tags: [], available: true, sales: 120, views: 860, sizes: ["۶ نفره","۸ نفره"] },
  { id: 4, name: "کیک سیب دارچین", desc: "سیب تازه و دارچین خوش‌عطر", price: 640000, cat: "cake", emoji: "🍎", img: "", tags: [], available: true, sales: 95, views: 640, sizes: ["۶ نفره","۸ نفره"] },
  { id: 5, name: "کیک هویج کارامل", desc: "با سس کارامل و کرم‌چیز", price: 660000, cat: "cake", emoji: "🥕", img: "images/cake3.jpg", tags: [], available: true, sales: 110, views: 720, sizes: ["۶ نفره","۸ نفره"] },
  { id: 6, name: "کیک پسته اسفناج", desc: "ترکیب خاص پسته و اسفناج", price: 760000, cat: "cake", emoji: "🥜", img: "", tags: ["new"], available: true, sales: 40, views: 1350, sizes: ["۶ نفره","۸ نفره"] },
  { id: 7, name: "چیزکیک شکلاتی", desc: "پایه‌ی بیسکویتی با کرم شکلات", price: 740000, cat: "cheesecake", emoji: "🍫", img: "", tags: [], available: true, sales: 150, views: 1100, sizes: ["۶ نفره","۸ نفره"] },
  { id: 8, name: "چیزکیک سن‌سباستین", desc: "سوخته و کرمی به سبک باسکی", price: 780000, cat: "cheesecake", emoji: "🍰", img: "", tags: [], available: true, sales: 200, views: 1500, sizes: ["۶ نفره","۸ نفره"] },
  { id: 9, name: "چیزکیک کاپوچینو", desc: "طعم قهوه و کرم نرم", price: 750000, cat: "cheesecake", emoji: "☕", img: "", tags: ["new"], available: true, sales: 35, views: 900, sizes: ["۶ نفره","۸ نفره"] },
  { id: 10, name: "چیزکیک نیویورکی", desc: "با سس توت‌فرنگی تازه", price: 720000, cat: "cheesecake", emoji: "🍰", img: "images/cake2.jpg", tags: ["hot"], available: true, sales: 280, views: 1900, sizes: ["۶ نفره","۸ نفره"], flavors: ["توت‌فرنگی","لیمو","کارامل"] },
  { id: 11, name: "کوکی شکلاتی", desc: "جعبه ۶ عددی، با چیپس شکلات", price: 150000, cat: "cookie", emoji: "🍪", img: "", tags: ["hot"], available: true, sales: 260, views: 1250 },
  { id: 12, name: "کوکی گردویی", desc: "جعبه ۶ عددی، با مغز گردو", price: 160000, cat: "cookie", emoji: "🌰", img: "", tags: [], available: true, sales: 130, views: 610 },
  { id: 13, name: "کوکی رژیمی", desc: "جعبه ۶ عددی، بدون شکر", price: 170000, cat: "cookie", emoji: "🍪", img: "", tags: [], available: true, sales: 70, views: 540 },
  { id: 14, name: "بسکوییت کره‌ای", desc: "ترد و کره‌ای، بسته‌ی هدیه", price: 120000, cat: "dessert", emoji: "🍘", img: "", tags: [], available: true, sales: 90, views: 480 },
  { id: 15, name: "تارت", desc: "پایه‌ی کره‌ای با کرم و میوه", price: 140000, cat: "dessert", emoji: "🥧", img: "", tags: [], available: true, sales: 105, views: 700 },
  { id: 16, name: "پاریس برست", desc: "خمیر شو با کرم پرالین", price: 180000, cat: "dessert", emoji: "🥐", img: "", tags: [], available: true, sales: 85, views: 820 },
  { id: 17, name: "شوکت", desc: "دسر خانگی شیرینی‌سرا", price: 130000, cat: "dessert", emoji: "🍩", img: "", tags: [], available: true, sales: 60, views: 430 },
  { id: 18, name: "اکلر", desc: "شو با کرم و روکش شکلات", price: 110000, cat: "dessert", emoji: "🥖", img: "", tags: [], available: true, sales: 170, views: 1000 },
  { id: 19, name: "رنگینک", desc: "دسر سنتی با خرما و گردو", price: 150000, cat: "dessert", emoji: "🍮", img: "", tags: ["new"], available: true, sales: 45, views: 570 },
];

// ================= خواندن اطلاعات محصولات از فایل اکسل =================
// فایل products.xlsx باید کنار index.html باشد. ستون‌ها: کد | نام | توضیحات | قیمت | تخفیف | دسته‌بندی | برچسب | موجود | سایزها | طعم‌ها | (قیمت نهایی) | تعداد فروش | تعداد بازدید | عکس
// ردیف‌های اکسل ملاک منو هستند (ردیف جدید = محصول جدید، ردیف حذف‌شده = محصول حذف‌شده). ایموجی از آرایه‌ی products بر اساس کد برداشته می‌شود؛ عکس از ستون «عکس (آدرس)» و در نبود آن از آرایه.
// اگر فایل خوانده نشد، همان اطلاعات داخل آرایه‌ی بالا نمایش داده می‌شود.
const EXCEL_FILE = "products.xlsx";

function toEnNum(v) {
  const s = String(v ?? "")
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[,٬،\s]/g, "").replace(/٪|%/g, "").replace("٫", ".");
  return s === "" ? NaN : Number(s);
}
function unitPrice(p) {
  const d = Math.min(100, Math.max(0, p.discount || 0));
  return Math.round(p.price * (100 - d) / 100);
}
const CAT_MAP = { "کیک": "cake", "چیزکیک": "cheesecake", "کوکی": "cookie", "شیرینی": "cookie", "دسر": "dessert", cake: "cake", cheesecake: "cheesecake", cookie: "cookie", dessert: "dessert" };
const CAT_EMOJI = { cake: "🎂", cheesecake: "🍰", cookie: "🍪", dessert: "🍮" };
const TAG_MAP = { "پرفروش": "hot", "جدید": "new", hot: "hot", new: "new" };
const normKey = s => String(s ?? "").replace(/[\u200c\u200f\s]/g, "").toLowerCase();
const splitList = v => String(v ?? "").split(/[،,؛;\n]+/).map(x => x.trim()).filter(Boolean);

async function loadProductsFromExcel() {
  try {
    if (typeof XLSX === "undefined") throw new Error("کتابخانه SheetJS بارگذاری نشد");
    const res = await fetch(EXCEL_FILE + "?v=" + Date.now());
    if (!res.ok) throw new Error("HTTP " + res.status);
    const wb = XLSX.read(await res.arrayBuffer(), { type: "array" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    const list = [];
    rows.forEach(raw => {
      const r = {};
      Object.keys(raw).forEach(k => r[normKey(k)] = raw[k]);
      const get = k => r[normKey(k)];
      const id = toEnNum(get("کد"));
      const name = String(get("نام") ?? "").trim();
      if (isNaN(id) || !name || list.some(x => x.id === id)) return;
      const old = products.find(x => x.id === id) || {};
      const price = toEnNum(get("قیمت (تومان)"));
      const finalPrice = (!isNaN(price) && price >= 0) ? price : old.price;
      if (finalPrice === undefined) return;
      const disc = toEnNum(get("تخفیف (درصد)"));
      const cat = CAT_MAP[normKey(get("دسته‌بندی"))] || old.cat || "cake";
      const tags = splitList(get("برچسب")).map(t => TAG_MAP[normKey(t)]).filter(Boolean);
      const avail = !/^(خیر|نه|ناموجود|no|false|0)$/i.test(String(get("موجود") ?? "").trim());
      const sizes = splitList(get("سایزها"));
      const flavors = splitList(get("طعم‌ها"));
      const p = {
        id, name, desc: String(get("توضیحات") ?? "").trim(),
        price: finalPrice,
        discount: isNaN(disc) ? 0 : Math.min(100, Math.max(0, disc)),
        cat, emoji: old.emoji || CAT_EMOJI[cat],
        img: String(get("عکس (آدرس)") ?? "").trim() || old.img || "",
        tags, available: avail,
        sales: isNaN(toEnNum(get("تعداد فروش"))) ? 0 : toEnNum(get("تعداد فروش")),
        views: isNaN(toEnNum(get("تعداد بازدید"))) ? 0 : toEnNum(get("تعداد بازدید")),
      };
      if (sizes.length || flavors.length) { p.sizes = sizes; p.flavors = flavors; }
      list.push(p);
    });
    if (!list.length) throw new Error("هیچ ردیف معتبری در فایل اکسل پیدا نشد");
    products.splice(0, products.length, ...list);
    // حذف آیتم‌های سبد که دیگر در منو نیستند
    Object.keys(cart).forEach(k => { if (!products.some(p => p.id === cart[k].id)) delete cart[k]; });
    saveCart();
  } catch (e) {
    console.warn("خواندن products.xlsx ناموفق بود؛ اطلاعات پیش‌فرض استفاده شد:", e);
  }
}

// ================= پیاده‌سازی =================
const menuEl = document.getElementById("menu");
let activeCat = "all";
let activeSearch = "";
let activeSort = "newest";
// سبد ماندگار در localStorage: { "id|سایز|طعم|متن": {id, qty, size, flavor, text} }
let cart = {};
try { cart = JSON.parse(localStorage.getItem("shiriniCart2") || "{}"); } catch(e) { cart = {}; }
let discount = 0;

function saveCart() { localStorage.setItem("shiriniCart2", JSON.stringify(cart)); }
function toFa(n) { return n.toLocaleString("fa-IR"); }

// مرتب‌سازی: جدیدترین (برچسب «جدید» اول، بعد کد بزرگ‌تر) / پرفروش‌ترین / پربازدیدترین / قیمت
const isNew = p => (p.tags || []).includes("new") ? 1 : 0;
const SORTERS = {
  newest:    (a, b) => isNew(b) - isNew(a) || b.id - a.id,
  bestseller:(a, b) => (b.sales || 0) - (a.sales || 0) || b.id - a.id,
  views:     (a, b) => (b.views || 0) - (a.views || 0) || b.id - a.id,
  priceAsc:  (a, b) => unitPrice(a) - unitPrice(b) || a.id - b.id,
  priceDesc: (a, b) => unitPrice(b) - unitPrice(a) || a.id - b.id,
};

function renderMenu() {
  menuEl.innerHTML = "";
  const q = activeSearch.trim();
  const list = products.filter(p =>
    (activeCat === "all" || p.cat === activeCat) &&
    (!q || p.name.includes(q) || p.desc.includes(q))
  );
  list.sort(SORTERS[activeSort] || SORTERS.newest);
  if (!list.length) {
    menuEl.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#999;padding:40px'>محصولی یافت نشد 🍰</p>";
    return;
  }
  list.forEach(p => {
    const badges = (p.tags || []).map(t =>
      t === "hot" ? '<span class="badge hot">پرفروش</span>' :
      t === "new" ? '<span class="badge new">جدید</span>' : ""
    ).join("") + (!p.available ? '<span class="badge out">ناموجود</span>' : "") +
      (p.discount > 0 ? `<span class="badge off">${toFa(p.discount)}٪ تخفیف</span>` : "");
    const hasOpts = !!((p.sizes && p.sizes.length) || (p.flavors && p.flavors.length));
    const media = p.img
      ? `<div class="img-wrap">
           <img src="${p.img}" alt="${p.name}" class="product-img" loading="lazy"
                onload="this.classList.add('loaded')"
                onclick="openLightbox('${p.img.replace(/'/g,"\\'")}','${p.name.replace(/'/g,"\\'")}')">
           <div class="skeleton"></div>
         </div>`
      : `<div class="emoji">${p.emoji}</div>`;
    // شمارنده و دکمه افزودن در یک ردیف
    const controls = p.available ? `
      <div class="qty-row">
        ${hasOpts
          ? `<button class="add-btn" onclick="openOptions(${p.id})">انتخاب و افزودن</button>`
          : `<div class="qty-selector">
               <button onclick="cardQty(${p.id},-1)" aria-label="کاهش تعداد">−</button>
               <span id="qty-${p.id}">۱</span>
               <button onclick="cardQty(${p.id},1)" aria-label="افزایش تعداد">+</button>
             </div>
             <button class="add-btn" onclick="addDirect(${p.id})">افزودن</button>`}
      </div>`
      : `<button class="add-btn" disabled>ناموجود</button>`;
    menuEl.innerHTML += `
      <div class="card ${!p.available ? "unavailable" : ""}">
        ${badges}
        ${media}
        <div class="card-body">
          <div class="card-head">
            <h3>${p.name}</h3>
            ${p.discount > 0
              ? `<span class="price-wrap"><span class="price-old">${toFa(p.price)}</span><span class="price">${toFa(unitPrice(p))} تومان</span></span>`
              : `<span class="price">${toFa(p.price)} تومان</span>`}
          </div>
          <div class="desc">${p.desc}</div>
          ${controls}
        </div>
      </div>`;
  });
}

// تعداد روی کارت (محصولات بدون گزینه)
const cardQtyState = {};
function cardQty(id, d) {
  cardQtyState[id] = Math.max(1, (cardQtyState[id] || 1) + d);
  document.getElementById(`qty-${id}`).textContent = toFa(cardQtyState[id]);
}
function addDirect(id) {
  addToCart(id, cardQtyState[id] || 1, "", "", "");
}
// مودال انتخاب گزینه‌ها برای کیک‌ها
function openOptions(id) {
  const p = products.find(x => x.id === id);
  const sizeSel = (p.sizes || []).map(s=>`<option value="${s}">${s}</option>`).join("");
  const flavorSel = (p.flavors || []).map(f=>`<option value="${f}">${f}</option>`).join("");
  const html = `
    <div class="modal open" id="optModal" onclick="if(event.target===this)this.remove()" style="display:block">
      <div class="modal-box" role="dialog" aria-modal="true">
        <div class="modal-head"><h2>${p.emoji} ${p.name}</h2>
          <button class="close-btn" onclick="document.getElementById('optModal').remove()" aria-label="بستن">✕</button></div>
        ${sizeSel ? `<label style="font-size:.85rem">سایز:</label>
        <select id="optSize" style="width:100%;padding:9px;margin:4px 0 10px;border:1px solid #e8c8a8;border-radius:8px;font-family:inherit">${sizeSel}</select>` : ""}
        ${flavorSel ? `<label style="font-size:.85rem">طعم:</label>
        <select id="optFlavor" style="width:100%;padding:9px;margin:4px 0 10px;border:1px solid #e8c8a8;border-radius:8px;font-family:inherit">${flavorSel}</select>` : ""}
        <label style="font-size:.85rem">متن روی کیک (اختیاری):</label>
        <input type="text" id="optText" placeholder="مثلاً: تولدت مبارک سارا" style="width:100%;padding:9px;margin:4px 0 14px;border:1px solid #e8c8a8;border-radius:8px;font-family:inherit">
        <button class="add-btn" style="width:100%;padding:9px;font-size:.9rem" onclick="addWithOptions(${p.id})">افزودن به سبد</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}
function addWithOptions(id) {
  const size = (document.getElementById("optSize") || {}).value || "";
  const flavor = (document.getElementById("optFlavor") || {}).value || "";
  const text = document.getElementById("optText").value.trim();
  addToCart(id, 1, size, flavor, text);
  document.getElementById("optModal").remove();
}

function addToCart(id, qty = 1, size = "", flavor = "", text = "") {
  const key = [id, size, flavor, text].join("|");
  if (!cart[key]) cart[key] = { id, qty: 0, size, flavor, text };
  cart[key].qty += qty;
  saveCart(); updateCart();
  // انیمیشن پرش دکمه سبد
  const btn = document.getElementById("cartBtn");
  if (btn) { btn.classList.remove("bounce"); void btn.offsetWidth; btn.classList.add("bounce"); }
}
function changeQty(key, d) {
  cart[key].qty += d;
  if (cart[key].qty <= 0) delete cart[key];
  saveCart(); updateCart(); renderCartItems();
}

function cartTotals() {
  let subtotal = 0;
  Object.values(cart).forEach(it => {
    subtotal += unitPrice(products.find(p => p.id === it.id)) * it.qty;
  });
  const shipping = document.getElementById("deliveryMode").value === "پیک" ? SHIPPING_COST : 0;
  const off = Math.round(subtotal * discount / 100);
  return { subtotal, shipping, off, total: Math.max(0, subtotal - off + shipping) };
}

function updateCart() {
  const keys = Object.keys(cart);
  const count = Object.values(cart).reduce((a, b) => a + b.qty, 0);
  document.getElementById("cartBar").hidden = keys.length === 0;
  document.getElementById("cartCount").textContent = toFa(count);
  document.getElementById("cartTotal").textContent = toFa(cartTotals().total);
}

// ===== مودال سبد =====
function openCart() {
  renderCartItems();
  document.getElementById("cartModal").classList.add("open");
  setTimeout(() => document.getElementById("custName").focus(), 50);
}
function closeCart() { document.getElementById("cartModal").classList.remove("open"); }
function modalBackdropClose(e) { if (e.target === e.currentTarget) closeCart(); }

function renderCartItems() {
  const el = document.getElementById("cartItems");
  const keys = Object.keys(cart);
  if (!keys.length) {
    el.innerHTML = "<p style='text-align:center;color:#999;padding:20px'>سبد خالی است 🍰</p>";
    document.getElementById("cartSummary").textContent = "";
    return;
  }
  el.innerHTML = keys.map(key => {
    const it = cart[key];
    const p = products.find(x => x.id === it.id);
    const opts = [it.size, it.flavor, it.text].filter(Boolean).join(" • ");
    return `<div class="cart-item">
      <span>${p.emoji} ${p.name}
        ${opts ? `<span class="item-opts">${opts}</span>` : ""}
      </span>
      <span class="qty-controls">
        <button onclick="changeQty('${key.replace(/'/g,"\\'")}',1)" aria-label="افزایش">+</button>
        ${toFa(it.qty)}
        <button onclick="changeQty('${key.replace(/'/g,"\\'")}',-1)" aria-label="کاهش">−</button>
      </span>
    </div>`;
  }).join("");
  const t = cartTotals();
  document.getElementById("cartSummary").innerHTML =
    `جمع: ${toFa(t.subtotal)} تومان` +
    (t.off ? `<br><span class="off">تخفیف: −${toFa(t.off)} تومان</span>` : "") +
    (t.shipping ? `<br>هزینه ارسال: ${toFa(t.shipping)} تومان` : "") +
    `<br>قابل پرداخت: ${toFa(t.total)} تومان`;
}

// یک دکمه برای تعویض روش تحویل: پیک ⇄ حضوری
function toggleDelivery() {
  const el = document.getElementById("deliveryMode");
  el.value = el.value === "پیک" ? "حضوری" : "پیک";
  syncDelivery();
}
function syncDelivery() {
  const courier = document.getElementById("deliveryMode").value === "پیک";
  document.getElementById("deliveryBtn").innerHTML = courier
    ? "<span>🛵 تحویل با پیک</span><small>تغییر به حضوری ⇄</small>"
    : "<span>🏬 تحویل حضوری</span><small>تغییر به پیک ⇄</small>";
  document.getElementById("custAddress").style.display = courier ? "block" : "none";
  renderCartItems(); updateCart();
}

function applyDiscount() {
  const code = document.getElementById("discountCode").value.trim().toUpperCase();
  if (DISCOUNTS[code]) {
    discount = DISCOUNTS[code];
    alert(`✅ کد تخفیف ${toFa(discount)}٪ اعمال شد`);
  } else {
    discount = 0;
    alert("❌ کد تخفیف معتبر نیست");
  }
  renderCartItems();
}

// ===== تقویم شمسی (تبدیل میلادی ⇄ جلالی، بر اساس الگوریتم jalaali-js) =====
const JMONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
const jdiv = (a, b) => ~~(a / b);
const jmod = (a, b) => a - ~~(a / b) * b;
function jalCal(jy) {
  const breaks = [-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
  const bl = breaks.length, gy = jy + 621;
  let leapJ = -14, jp = breaks[0], jm, jump = 0, leap, n, i;
  if (jy < jp || jy >= breaks[bl - 1]) throw new Error("سال شمسی نامعتبر: " + jy);
  for (i = 1; i < bl; i++) {
    jm = breaks[i]; jump = jm - jp;
    if (jy < jm) break;
    leapJ += jdiv(jump, 33) * 8 + jdiv(jmod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ += jdiv(n, 33) * 8 + jdiv(jmod(n, 33) + 3, 4);
  if (jmod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = jdiv(gy, 4) - jdiv((jdiv(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + jdiv(jump + 4, 33) * 33;
  leap = jmod(jmod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}
function g2d(gy, gm, gd) {
  let d = jdiv((gy + jdiv(gm - 8, 6) + 100100) * 1461, 4) + jdiv(153 * jmod(gm + 9, 12) + 2, 5) + gd - 34840408;
  return d - jdiv(jdiv(gy + 100100 + jdiv(gm - 8, 6), 100) * 3, 4) + 752;
}
function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j += jdiv(jdiv(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = jdiv(jmod(j, 1461), 4) * 5 + 308;
  const gd = jdiv(jmod(i, 153), 5) + 1;
  const gm = jmod(jdiv(i, 153), 12) + 1;
  return { gy: jdiv(j, 1461) - 100100 + jdiv(8 - gm, 6), gm, gd };
}
function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - jdiv(jm, 7) * (jm - 7) + jd - 1;
}
function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  let k = jdn - g2d(gy, 3, r.march);
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + jdiv(k, 31), jd: jmod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1; k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + jdiv(k, 30), jd: jmod(k, 30) + 1 };
}
const toJalaali = (gy, gm, gd) => d2j(g2d(gy, gm, gd));
const toGregorian = (jy, jm, jd) => d2g(j2d(jy, jm, jd));
function jalaaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalCal(jy).leap === 0 ? 30 : 29;
}
const faDigits = s => String(s).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
const pad2 = n => String(n).padStart(2, "0");

// "2026-10-07" → "چهارشنبه ۱۵ مهر ۱۴۰۵"
function formatJalali(isoDate) {
  const [gy, gm, gd] = isoDate.split("-").map(Number);
  const j = toJalaali(gy, gm, gd);
  const weekday = new Date(gy, gm - 1, gd).toLocaleDateString("fa-IR", { weekday: "long" });
  return `${weekday} ${faDigits(j.jd)} ${JMONTHS[j.jm - 1]} ${faDigits(j.jy)}`;
}

// ===== انتخاب زمان تحویل (روز، ماه، ساعت، دقیقه — سال خودکار) =====
// مقدار میلادی در دو input مخفی deliverDate و deliverTime نگه داشته می‌شود.
function todayJ() { const n = new Date(); return toJalaali(n.getFullYear(), n.getMonth() + 1, n.getDate()); }
// اگر ماه/روز انتخابی قبل از امروز باشد، سال بعد در نظر گرفته می‌شود
function pickYear(m, d) {
  const t = todayJ();
  return (m < t.jm || (m === t.jm && d < t.jd)) ? t.jy + 1 : t.jy;
}
function fillDays() {
  const m = +document.getElementById("jMonth").value;
  const dEl = document.getElementById("jDay");
  const keep = +dEl.value || 1, len = jalaaliMonthLength(pickYear(m, keep), m);
  dEl.innerHTML = Array.from({ length: len }, (_, i) => `<option value="${i + 1}">${faDigits(i + 1)}</option>`).join("");
  dEl.value = Math.min(keep, len);
}
// ساعت ۲۲ فقط با دقیقه‌ی ۰۰ قابل انتخاب است
function fillMins() {
  const mEl = document.getElementById("jMin");
  const keep = mEl.value || "00";
  const list = +document.getElementById("jHour").value >= HOUR_MAX ? [0] : [0, 15, 30, 45];
  mEl.innerHTML = list.map(m => `<option value="${pad2(m)}">${faDigits(pad2(m))}</option>`).join("");
  mEl.value = list.includes(+keep) ? keep : "00";
}
function syncDateTime() {
  const m = +document.getElementById("jMonth").value, d = +document.getElementById("jDay").value;
  const g = toGregorian(pickYear(m, d), m, d);
  document.getElementById("deliverDate").value = `${g.gy}-${pad2(g.gm)}-${pad2(g.gd)}`;
  document.getElementById("deliverTime").value =
    `${document.getElementById("jHour").value}:${document.getElementById("jMin").value}`;
}
// پیش‌فرض: حداقل زمان مجاز (۲۴ ساعت بعد) گرد شده به ۱۵ دقیقه، داخل بازه‌ی ۱۰ تا ۲۲
function initDatePicker() {
  const t = new Date(Math.ceil((Date.now() + MIN_ORDER_HOURS * 3600 * 1000) / 900000) * 900000);
  const mins = t.getHours() * 60 + t.getMinutes();
  if (mins < HOUR_MIN * 60) t.setHours(HOUR_MIN, 0, 0, 0);
  else if (mins > HOUR_MAX * 60) { t.setDate(t.getDate() + 1); t.setHours(HOUR_MIN, 0, 0, 0); }
  const j = toJalaali(t.getFullYear(), t.getMonth() + 1, t.getDate());
  const mEl = document.getElementById("jMonth"), hEl = document.getElementById("jHour");
  mEl.innerHTML = JMONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
  hEl.innerHTML = Array.from({ length: HOUR_MAX - HOUR_MIN + 1 }, (_, i) => HOUR_MIN + i).map(h =>
    `<option value="${pad2(h)}">${faDigits(pad2(h))}</option>`).join("");
  mEl.value = j.jm;
  fillDays();
  document.getElementById("jDay").value = j.jd;
  hEl.value = pad2(t.getHours());
  fillMins();
  document.getElementById("jMin").value = pad2(t.getMinutes());
  mEl.addEventListener("change", () => { fillDays(); syncDateTime(); });
  hEl.addEventListener("change", () => { fillMins(); syncDateTime(); });
  ["jDay", "jMin"].forEach(id => document.getElementById(id).addEventListener("change", syncDateTime));
  syncDateTime();
}

// ===== ثبت و ارسال سفارش =====
const esc = v => String(v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let orderBusy = false;
async function submitOrder(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (orderBusy) return;
  const name = document.getElementById("custName").value.trim();
  const phoneEl = document.getElementById("custPhone");
  const phone = phoneEl.value.trim();
  const note = document.getElementById("custNote").value.trim();
  const date = document.getElementById("deliverDate").value;
  const time = document.getElementById("deliverTime").value;
  const delivery = document.getElementById("deliveryMode").value;
  const addressEl = document.getElementById("custAddress");
  const address = addressEl.value.trim();

  if (!Object.keys(cart).length) { alert("سبد خالی است"); return; }
  // اعتبارسنجی موبایل ایران
  if (!/^09\d{9}$/.test(phone)) {
    phoneEl.classList.add("invalid");
    phoneEl.focus();
    alert("شماره موبایل معتبر نیست — باید با ۰۹ شروع شود و ۱۱ رقم باشد");
    return;
  }
  phoneEl.classList.remove("invalid");
  if (delivery === "پیک" && !address) {
    alert("لطفاً آدرس تحویل را وارد کنید");
    addressEl.focus();
    return;
  }
  // بازه‌ی ساعت و حداقل زمان سفارش
  const [hh, mm] = time.split(":").map(Number);
  const tmin = hh * 60 + mm;
  if (tmin < HOUR_MIN * 60 || tmin > HOUR_MAX * 60) {
    alert("ساعت تحویل باید بین ۱۰ صبح تا ۱۰ شب باشد");
    return;
  }
  const dt = new Date(date + "T" + time);
  if (isNaN(dt) || dt < new Date(Date.now() + MIN_ORDER_HOURS * 3600 * 1000)) {
    alert(`زمان تحویل باید حداقل ${toFa(MIN_ORDER_HOURS)} ساعت بعد باشد`);
    return;
  }

  const t = cartTotals();
  const items = Object.values(cart).map(it => {
    const p = products.find(x => x.id === it.id);
    return { name: p.name, opts: [it.size, it.flavor, it.text].filter(Boolean).join(" • "),
             qty: it.qty, unit: unitPrice(p), line: unitPrice(p) * it.qty };
  });
  const now = new Date();
  const order = {
    no: String(Date.now()).slice(-6), name, phone, delivery, address: delivery === "پیک" ? address : "", note, t, items,
    when: `${formatJalali(date)} ساعت ${faDigits(time)}`,
    issued: formatJalali(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`),
  };

  const statusEl = document.getElementById("orderStatus");
  const btn = document.getElementById("submitOrderBtn");
  orderBusy = true; btn.disabled = true;
  statusEl.className = "";
  statusEl.textContent = "در حال ثبت سفارش ...";
  try {
    if (!ORDER_API) throw new Error("آدرس سرور سفارش‌ها تنظیم نشده است");
    const res = await fetch(ORDER_API.replace(/\/$/, "") + "/api/orders", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "ثبت سفارش ناموفق بود");
    if (data.no) order.no = String(data.no);   // سرور ممکن است شماره را عوض کند
    if (typeof Account !== "undefined") await Account.recordOrder(order);   // ثبت در سوابق حساب کاربری
    const loggedIn = typeof Account !== "undefined" && Account.user;
    // خالی کردن سبد
    cart = {}; discount = 0; saveCart(); updateCart(); renderCartItems();
    document.getElementById("discountCode").value = "";
    document.getElementById("custNote").value = "";
    statusEl.className = "success";
    statusEl.textContent = `✅ سفارش شماره ${faDigits(order.no)} ثبت شد و برای ما ارسال شد. پس از تأیید، به شما اطلاع می‌دهیم که سفارش در حال آماده‌سازی است.` +
      (loggedIn ? " وضعیت سفارش را در «حساب من ← سوابق سفارش» ببینید." : "");
  } catch (err) {
    console.warn("ثبت سفارش ناموفق بود:", err);
    statusEl.className = "error";
    statusEl.textContent = "❌ " + (err.message || "ثبت سفارش ناموفق بود") + " — لطفاً دوباره تلاش کنید یا تماس بگیرید.";
  } finally {
    orderBusy = false; btn.disabled = false;
  }
}

// ===== لایت‌باکس =====
function openLightbox(src, name) {
  document.getElementById("lightboxImg").src = src;
  document.getElementById("lightboxCaption").textContent = name;
  document.getElementById("lightbox").classList.add("open");
}
function closeLightbox(e) {
  if (e && e.target.tagName === "IMG") return;
  document.getElementById("lightbox").classList.remove("open");
}

// بستن با Esc
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    document.getElementById("lightbox").classList.remove("open");
    closeCart();
    const om = document.getElementById("optModal");
    if (om) om.remove();
  }
});

// ===== فیلتر و جستجو =====
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeCat = btn.dataset.cat;
    renderMenu();
  };
});
document.getElementById("sortSelect").addEventListener("change", e => {
  activeSort = e.target.value;
  renderMenu();
});
document.getElementById("searchInput").addEventListener("input", e => {
  activeSearch = e.target.value;
  renderMenu();
});

// ===== شروع =====
initDatePicker();
menuEl.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#999;padding:40px'>در حال بارگذاری منو...</p>";
loadProductsFromExcel().then(() => { syncDelivery(); renderMenu(); });
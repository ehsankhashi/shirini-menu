// ================= ویرایش فروشگاه =================
// اطلاعات تماس: کانال‌های سفارش را با شماره/آیدی خودتان عوض کنید
const CHANNELS = {
  whatsapp: { id: "989121234567",     url: id => `https://wa.me/${id}?text=` },
  telegram: { id: "shirinisara",      url: id => `https://t.me/${id}?text=` },
  eitaa:    { id: "989121234567",     url: id => `https://eitaa.com/${id}?text=` },
  bale:     { id: "989121234567",     url: id => `https://ble.ir/${id}?text=` },
};
// کدهای تخفیف: درصد
const DISCOUNTS = { "WELCOME10": 10, "SWEET20": 20 };
// حداقل زمان سفارش (ساعت قبل از تحویل) — برای کیک ۲۴ ساعت
const MIN_ORDER_HOURS = 24;
// هزینه ارسال (تومان) — تحویل حضوری رایگان است
const SHIPPING_COST = 60000;

// محصولات: img آدرس عکس، tags برچسب (hot پرفروش / new جدید)، available ناموجود
const products = [
  { id: 1,  name: "کیک شکلاتی تولد",  desc: "گاناش شکلات تلخ، مناسب ۸ نفر", price: 850000, cat: "cake",    emoji: "🎂", img: "images/cake1.jpg",    tags: ["hot"],     available: true,  sizes: ["۶ نفره","۸ نفره","۱۲ نفره"], flavors: ["شکلات تلخ","شکلات شیری","نارگیلی"] },
  { id: 2,  name: "چیزکیک نیویورکی",  desc: "با سس توت‌فرنگی تازه",         price: 720000, cat: "cake",    emoji: "🍰", img: "images/cake2.jpg",    tags: ["new"],     available: true,  sizes: ["۶ نفره","۸ نفره"],           flavors: ["توت‌فرنگی","لیمو","کارامل"] },
  { id: 3,  name: "کیک هویج و گردو",  desc: "با کرم‌چیز وانیلی، ۶ نفره",    price: 640000, cat: "cake",    emoji: "🥕", img: "images/cake3.jpg",    tags: [],          available: true,  sizes: ["۶ نفره","۸ نفره"],           flavors: ["وانیلی"] },
  { id: 4,  name: "کیک قرمز مخملی",   desc: "ردولوت با فراستینگ خامه‌ای",   price: 780000, cat: "cake",    emoji: "❤️", img: "",                    tags: ["hot"],     available: false, sizes: ["۸ نفره"],                    flavors: ["کلاسیک"] },
  { id: 5,  name: "شیرینی نخودچی",    desc: "نیم‌کیلویی، مغزدار",           price: 280000, cat: "cookie",  emoji: "🍪", img: "images/cookie1.jpg",  tags: ["hot"],     available: true },
  { id: 6,  name: "شیرینی کشمشی",     desc: "نیم‌کیلویی، خامه‌ای",          price: 300000, cat: "cookie",  emoji: "🥮", img: "images/cookie2.jpg",  tags: [],          available: true },
  { id: 7,  name: "نان‌بربری شیرین",  desc: "با کشمش و زعفران، هر عدد",     price: 45000,  cat: "cookie",  emoji: "🥖", img: "images/cookie3.jpg",  tags: [],          available: true },
  { id: 8,  name: "کلوچه عسلی",       desc: "جعبه ۱۰ عددی",                 price: 190000, cat: "cookie",  emoji: "🍯", img: "images/cookie4.jpg",  tags: ["new"],     available: true },
  { id: 9,  name: "ترایفل شکلات",     desc: "در شیشه، لایه‌های کرم",        price: 120000, cat: "dessert", emoji: "🍮", img: "images/dessert1.jpg", tags: [],          available: true },
  { id: 10, name: "پاناکوتا وانیلی",  desc: "با سس کارامل نمکی",            price: 135000, cat: "dessert", emoji: "🥛", img: "images/dessert2.jpg", tags: [],          available: true },
  { id: 11, name: "تیرامیسو",         desc: "اسپرسو و ماسکارپونه",          price: 160000, cat: "dessert", emoji: "☕", img: "images/dessert3.jpg", tags: ["hot"],     available: true },
  { id: 12, name: "ماست‌موز دسر",     desc: "با گردو و عسل، تازه روز",      price: 98000,  cat: "dessert", emoji: "🌰", img: "images/dessert4.jpg", tags: [],          available: false },
];

// ================= خواندن اطلاعات محصولات از فایل اکسل =================
// فایل products.xlsx باید کنار index.html باشد. ستون‌ها: کد | نام | توضیحات | قیمت | تخفیف | دسته‌بندی | برچسب | موجود | سایزها | طعم‌ها
// ردیف‌های اکسل ملاک منو هستند (ردیف جدید = محصول جدید، ردیف حذف‌شده = محصول حذف‌شده). عکس و ایموجی از آرایه‌ی products بر اساس کد برداشته می‌شود.
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
const CAT_MAP = { "کیک": "cake", "شیرینی": "cookie", "دسر": "dessert", cake: "cake", cookie: "cookie", dessert: "dessert" };
const CAT_EMOJI = { cake: "🎂", cookie: "🍪", dessert: "🍮" };
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
        cat, emoji: old.emoji || CAT_EMOJI[cat], img: old.img || "",
        tags, available: avail,
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
// سبد ماندگار در localStorage: { "id|سایز|طعم|متن": {id, qty, size, flavor, text} }
let cart = {};
try { cart = JSON.parse(localStorage.getItem("shiriniCart") || "{}"); } catch(e) { cart = {}; }
let discount = 0;

function saveCart() { localStorage.setItem("shiriniCart", JSON.stringify(cart)); }
function toFa(n) { return n.toLocaleString("fa-IR"); }

function renderMenu() {
  menuEl.innerHTML = "";
  const q = activeSearch.trim();
  const list = products.filter(p =>
    (activeCat === "all" || p.cat === activeCat) &&
    (!q || p.name.includes(q) || p.desc.includes(q))
  );
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
    // ساختار دو ردیفه: شمارنده جدا، دکمه افزودن جدا
    const controls = p.available ? `
      <div class="qty-row">
        ${hasOpts
          ? `<button class="add-btn" onclick="openOptions(${p.id})">⚙️ انتخاب و افزودن</button>`
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
          <h3>${p.name}</h3>
          <div class="desc">${p.desc}</div>
          <div class="card-foot">${p.discount > 0
            ? `<span class="price-wrap"><span class="price-old">${toFa(p.price)}</span><span class="price">${toFa(unitPrice(p))} تومان</span></span>`
            : `<span class="price">${toFa(p.price)} تومان</span>`}</div>
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
        <select id="optSize" style="width:100%;padding:11px;margin:4px 0 10px;border:1px solid #e8c8a8;border-radius:10px;font-family:inherit">${sizeSel}</select>` : ""}
        ${flavorSel ? `<label style="font-size:.85rem">طعم:</label>
        <select id="optFlavor" style="width:100%;padding:11px;margin:4px 0 10px;border:1px solid #e8c8a8;border-radius:10px;font-family:inherit">${flavorSel}</select>` : ""}
        <label style="font-size:.85rem">متن روی کیک (اختیاری):</label>
        <input type="text" id="optText" placeholder="مثلاً: تولدت مبارک سارا" style="width:100%;padding:11px;margin:4px 0 14px;border:1px solid #e8c8a8;border-radius:10px;font-family:inherit">
        <button class="add-btn" style="width:100%;padding:13px;font-size:1rem" onclick="addWithOptions(${p.id})">افزودن به سبد</button>
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
  const delivery = document.querySelector('input[name="delivery"]:checked');
  const shipping = (delivery && delivery.value === "پیک") ? SHIPPING_COST : 0;
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

function toggleAddress() {
  const d = document.querySelector('input[name="delivery"]:checked').value;
  document.getElementById("custAddress").style.display = d === "پیک" ? "block" : "none";
  renderCartItems();
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

// حداقل ۲۴ ساعت بعد برای تحویل
function initDatePicker() {
  const dateInput = document.getElementById("deliverDate");
  const min = new Date(Date.now() + MIN_ORDER_HOURS * 3600 * 1000);
  dateInput.min = min.toISOString().split("T")[0];
  dateInput.value = dateInput.min;
}

// ===== ثبت سفارش در کانال‌ها =====
function submitOrder(e, channel = "whatsapp") {
  if (e && e.preventDefault) e.preventDefault();
  const name = document.getElementById("custName").value.trim();
  const phoneEl = document.getElementById("custPhone");
  const phone = phoneEl.value.trim();
  const note = document.getElementById("custNote").value.trim();
  const date = document.getElementById("deliverDate").value;
  const time = document.getElementById("deliverTime").value;
  const delivery = document.querySelector('input[name="delivery"]:checked').value;
  const addressEl = document.getElementById("custAddress");
  const address = addressEl.value.trim();

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
  // حداقل زمان سفارش
  const dt = new Date(date + "T" + time);
  if (isNaN(dt) || dt < new Date(Date.now() + MIN_ORDER_HOURS * 3600 * 1000)) {
    alert(`زمان تحویل باید حداقل ${toFa(MIN_ORDER_HOURS)} ساعت بعد باشد`);
    return;
  }
  const t = cartTotals();
  let msg = `🎂 سفارش جدید — شیرینی‌سرا\n\n👤 ${name}\n📞 ${phone}\n`;
  msg += `🛵 روش تحویل: ${delivery}\n`;
  if (delivery === "پیک") msg += `📍 آدرس: ${address}\n`;
  msg += `📅 زمان تحویل: ${date} ساعت ${time}\n\n`;
  Object.entries(cart).forEach(([key, it]) => {
    const p = products.find(x => x.id === it.id);
    const opts = [it.size, it.flavor, it.text].filter(Boolean).join(" • ");
    msg += `• ${p.name}${opts ? ` (${opts})` : ""} ×${it.qty} — ${toFa(unitPrice(p) * it.qty)} تومان\n`;
  });
  msg += `\nجمع: ${toFa(t.subtotal)} تومان`;
  if (t.off) msg += `\nتخفیف: −${toFa(t.off)} تومان`;
  if (t.shipping) msg += `\nهزینه ارسال: ${toFa(t.shipping)} تومان`;
  msg += `\nقابل پرداخت: ${toFa(t.total)} تومان`;
  if (note) msg += `\n\n📝 ${note}`;

  const ch = CHANNELS[channel];
  window.open(ch.url(ch.id) + encodeURIComponent(msg), "_blank");
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
document.getElementById("searchInput").addEventListener("input", e => {
  activeSearch = e.target.value;
  renderMenu();
});

// ===== شروع =====
initDatePicker();
menuEl.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#999;padding:40px'>در حال بارگذاری منو...</p>";
loadProductsFromExcel().then(() => { updateCart(); renderMenu(); });
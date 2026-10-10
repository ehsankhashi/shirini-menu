// ================= حساب کاربری شیرینی‌سرا =================
// ورود/ثبت‌نام با شماره موبایل، پروفایل (نام + آدرس) و سوابق سفارش.
//
// ⚠️ نسخه‌ی فعلی «فقط سمت مرورگر» است: داده‌ها در localStorage همین دستگاه ذخیره می‌شوند
// و کد تأیید پیامکی ندارد. برای اطلاع‌رسانی تأیید سفارش و همگام‌سازی بین دستگاه‌ها،
// باید یک بک‌اند و سرویس پیامک (کاوه‌نگار، ملی‌پیامک، قاصدک و ...) اضافه شود.
// تمام دسترسی به داده فقط از طریق شیء AccountAPI انجام می‌شود؛ بعداً کافی است
// AccountAPI را با نسخه‌ای که fetch به سرور می‌زند جایگزین کنید (نمونه در انتهای فایل).

const ACCOUNT_CFG = {
  // false = ورود مستقیم با شماره (بدون تأیید). true = مرحله‌ی کد تأیید (نیازمند سرور)
  requireOtp: false,
  storageKey: "shiriniAccounts1",   // همه‌ی حساب‌های این دستگاه: { "0912...": {...} }
  sessionKey: "shiriniSession1",    // شماره‌ی کاربر واردشده
  maxOrders: 50,                    // حداکثر سوابق نگهداری‌شده برای هر کاربر
};

// ---------- ابزارهای کوچک (مستقل از script.js) ----------
const acEnNum = v => String(v ?? "")
  .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
  .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const acNormPhone = v => acEnNum(v).replace(/\D/g, "");
const acValidPhone = v => /^09\d{9}$/.test(v);
const acEsc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const acFa = n => Number(n).toLocaleString("fa-IR");

// ---------- لایه‌ی داده (قابل جایگزینی با سرور) ----------
// همه‌ی متدها async هستند تا بعداً با fetch عوض شوند.
const AccountAPI = {
  _all() { try { return JSON.parse(localStorage.getItem(ACCOUNT_CFG.storageKey) || "{}"); } catch (e) { return {}; } },
  _save(all) { localStorage.setItem(ACCOUNT_CFG.storageKey, JSON.stringify(all)); },

  async exists(phone) { return !!this._all()[phone]; },

  // ارسال کد تأیید — در نسخه‌ی محلی کاری نمی‌کند
  async requestOtp(phone) { return { ok: true }; },

  // ورود یا ساخت حساب. اگر حساب نبود، ساخته می‌شود.
  async login(phone, code) {
    const all = this._all();
    let isNew = false;
    if (!all[phone]) {
      all[phone] = { phone, name: "", address: "", createdAt: Date.now(), orders: [] };
      this._save(all);
      isNew = true;
    }
    localStorage.setItem(ACCOUNT_CFG.sessionKey, phone);
    return { user: all[phone], isNew };
  },

  async logout() { localStorage.removeItem(ACCOUNT_CFG.sessionKey); },

  async me() {
    const phone = localStorage.getItem(ACCOUNT_CFG.sessionKey);
    return phone ? (this._all()[phone] || null) : null;
  },

  async updateProfile(phone, { name, address }) {
    const all = this._all();
    if (!all[phone]) throw new Error("حساب پیدا نشد");
    all[phone].name = name;
    all[phone].address = address;
    this._save(all);
    return all[phone];
  },

  // ثبت سفارش در سوابق. status: "pending" → بعداً سرور می‌تواند به confirmed/delivered تغییر دهد
  async addOrder(phone, order) {
    const all = this._all();
    if (!all[phone]) throw new Error("حساب پیدا نشد");
    all[phone].orders.unshift({ ...order, status: "pending", createdAt: Date.now() });
    all[phone].orders = all[phone].orders.slice(0, ACCOUNT_CFG.maxOrders);
    this._save(all);
    return all[phone];
  },

  // به‌روزرسانی وضعیت یک سفارش (بعد از اعلام سرور). true اگر تغییر کرد
  async setOrderStatus(phone, no, status) {
    const all = this._all();
    const o = all[phone] && all[phone].orders.find(x => String(x.no) === String(no));
    if (!o || o.status === status) return false;
    o.status = status;
    this._save(all);
    return true;
  },

  async deleteAccount(phone) {
    const all = this._all();
    delete all[phone];
    this._save(all);
    localStorage.removeItem(ACCOUNT_CFG.sessionKey);
  },
};

/* نمونه‌ی نسخه‌ی سروری (برای آینده):
const AccountAPI = {
  async requestOtp(phone) { return (await fetch("/api/auth/otp", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ phone }) })).json(); },
  async login(phone, code) { return (await fetch("/api/auth/login", { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ phone, code }) })).json(); },
  async me() { const r = await fetch("/api/me", { credentials: "include" }); return r.ok ? r.json() : null; },
  ...
};
*/

const STATUS_LABEL = {
  pending:   ["در انتظار تأیید", "st-pending"],
  confirmed: ["تأیید شد — در حال آماده‌سازی", "st-confirmed"],
  delivered: ["تحویل شده", "st-delivered"],
  canceled:  ["لغو شده", "st-canceled"],
};

// ---------- وضعیت و رابط کاربری ----------
const Account = {
  user: null,
  pendingPhone: "",
  tab: "profile",

  async init() {
    this.user = await AccountAPI.me();
    this.renderButton();
    document.addEventListener("keydown", e => { if (e.key === "Escape") this.close(); });
    this.fillOrderForm();
  },

  // ----- همگام‌سازی وضعیت سفارش‌ها با سرور و اطلاع‌رسانی به مشتری -----
  async syncStatuses() {
    if (typeof ORDER_API === "undefined" || !ORDER_API || !this.user) return;
    const phone = this.user.phone;
    const open = this.user.orders.filter(o => o.status === "pending" || o.status === "confirmed");
    let changed = false;
    for (const o of open) {
      try {
        const r = await fetch(`${ORDER_API.replace(/\/$/, "")}/api/orders/${encodeURIComponent(o.no)}?phone=${phone}`);
        if (!r.ok) continue;
        const d = await r.json();
        if (d.ok && d.status && await AccountAPI.setOrderStatus(phone, o.no, d.status)) {
          changed = true;
          if (d.status === "confirmed") this.toast(`🧁 سفارش ${acFa(o.no)} تأیید شد و در حال آماده‌سازی است`);
          else if (d.status === "delivered") this.toast(`🎉 سفارش ${acFa(o.no)} تحویل داده شد. نوش جان!`);
          else if (d.status === "canceled") this.toast(`سفارش ${acFa(o.no)} لغو شد. برای اطلاعات بیشتر تماس بگیرید.`);
        }
      } catch (e) { /* اتصال برقرار نبود؛ بار بعد */ }
    }
    if (changed) {
      this.user = await AccountAPI.me();
      if (document.getElementById("accountModal").classList.contains("open")) this.render();
    }
  },

  toast(msg) {
    const el = document.createElement("div");
    el.className = "ac-toast"; el.setAttribute("role", "status"); el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 9000);
  },

  renderButton() {
    const el = document.getElementById("accountBtn");
    if (!el) return;
    el.innerHTML = this.user
      ? `<span aria-hidden="true">👤</span> ${acEsc(this.user.name || "حساب من")}`
      : `<span aria-hidden="true">👤</span> ورود / ثبت‌نام`;
  },

  open() {
    document.getElementById("accountModal").classList.add("open");
    this.render();
  },
  close() {
    const m = document.getElementById("accountModal");
    if (m) m.classList.remove("open");
  },
  backdrop(e) { if (e.target === e.currentTarget) this.close(); },

  render() {
    const body = document.getElementById("accountBody");
    if (!this.user) return this.renderLogin(body);
    this.renderPanel(body);
  },

  // ----- ورود / ثبت‌نام -----
  renderLogin(body, step = "phone", msg = "") {
    if (step === "otp") {
      body.innerHTML = `
        <p class="ac-hint">کد تأیید به شماره <b dir="ltr">${acEsc(this.pendingPhone)}</b> ارسال شد.</p>
        <input type="text" id="acCode" inputmode="numeric" maxlength="6" placeholder="کد تأیید" aria-label="کد تأیید" autocomplete="one-time-code">
        <div class="ac-error" id="acError" role="alert">${acEsc(msg)}</div>
        <button class="ac-primary" onclick="Account.submitCode()">تأیید و ورود</button>
        <button class="ac-link" onclick="Account.renderLogin(document.getElementById('accountBody'))">تغییر شماره</button>`;
      document.getElementById("acCode").focus();
      return;
    }
    body.innerHTML = `
      <p class="ac-hint">با شماره موبایل وارد شوید؛ اگر حساب ندارید، همین‌جا ساخته می‌شود.</p>
      <input type="tel" id="acPhone" inputmode="numeric" placeholder="شماره موبایل (۰۹xxxxxxxxx)" aria-label="شماره موبایل" maxlength="11" dir="ltr" style="text-align:right">
      <div class="ac-error" id="acError" role="alert">${acEsc(msg)}</div>
      <button class="ac-primary" onclick="Account.submitPhone()">${ACCOUNT_CFG.requireOtp ? "دریافت کد تأیید" : "ورود / ساخت حساب"}</button>
      ${ACCOUNT_CFG.requireOtp ? "" : `<p class="ac-note">اطلاعات حساب فعلاً فقط روی همین دستگاه ذخیره می‌شود.</p>`}`;
    const inp = document.getElementById("acPhone");
    inp.focus();
    inp.addEventListener("keydown", e => { if (e.key === "Enter") this.submitPhone(); });
  },

  async submitPhone() {
    const phone = acNormPhone(document.getElementById("acPhone").value);
    if (!acValidPhone(phone)) return this.setError("شماره موبایل معتبر نیست — باید با ۰۹ شروع شود و ۱۱ رقم باشد");
    this.pendingPhone = phone;
    if (ACCOUNT_CFG.requireOtp) {
      const r = await AccountAPI.requestOtp(phone);
      if (!r || !r.ok) return this.setError("ارسال کد ناموفق بود، دوباره تلاش کنید");
      return this.renderLogin(document.getElementById("accountBody"), "otp");
    }
    await this.finishLogin(phone, "");
  },

  async submitCode() {
    const code = acEnNum(document.getElementById("acCode").value).trim();
    if (!code) return this.setError("کد تأیید را وارد کنید");
    await this.finishLogin(this.pendingPhone, code);
  },

  async finishLogin(phone, code) {
    try {
      const { user, isNew } = await AccountAPI.login(phone, code);
      this.user = user;
      this.tab = isNew || !user.name ? "profile" : "orders";
      this.renderButton();
      this.fillOrderForm();
      this.render();
    } catch (e) { this.setError("ورود ناموفق بود"); }
  },

  setError(msg) {
    const el = document.getElementById("acError");
    if (el) { el.textContent = msg; el.style.display = "block"; }
  },

  // ----- پنل کاربر -----
  renderPanel(body) {
    const u = this.user;
    body.innerHTML = `
      <div class="ac-tabs" role="tablist">
        <button role="tab" class="${this.tab === "profile" ? "active" : ""}" onclick="Account.setTab('profile')">پروفایل</button>
        <button role="tab" class="${this.tab === "orders" ? "active" : ""}" onclick="Account.setTab('orders')">سوابق سفارش (${acFa(u.orders.length)})</button>
      </div>
      <div id="acTabBody"></div>`;
    this.tab === "orders" ? this.renderOrders() : this.renderProfile();
  },
  setTab(t) { this.tab = t; this.render(); },

  renderProfile(msg = "") {
    const u = this.user;
    document.getElementById("acTabBody").innerHTML = `
      <div class="ac-phone">📞 <span dir="ltr">${acEsc(u.phone)}</span></div>
      <input type="text" id="acName" placeholder="نام و نام خانوادگی" value="${acEsc(u.name)}" aria-label="نام">
      <textarea id="acAddress" placeholder="آدرس پیش‌فرض تحویل" aria-label="آدرس" rows="3">${acEsc(u.address)}</textarea>
      <div class="ac-ok" id="acOk" role="status">${acEsc(msg)}</div>
      <button class="ac-primary" onclick="Account.saveProfile()">ذخیره اطلاعات</button>
      <div class="ac-row">
        <button class="ac-link" onclick="Account.logout()">خروج از حساب</button>
        <button class="ac-link danger" onclick="Account.removeAccount()">حذف حساب</button>
      </div>`;
  },

  async saveProfile() {
    const name = document.getElementById("acName").value.trim();
    const address = document.getElementById("acAddress").value.trim();
    this.user = await AccountAPI.updateProfile(this.user.phone, { name, address });
    this.renderButton();
    this.fillOrderForm();
    this.renderProfile("✅ اطلاعات ذخیره شد");
  },

  renderOrders() {
    const list = this.user.orders;
    const el = document.getElementById("acTabBody");
    if (!list.length) {
      el.innerHTML = `<p class="ac-empty">هنوز سفارشی ثبت نشده 🍰</p>`;
      return;
    }
    el.innerHTML = list.map(o => {
      const [label, cls] = STATUS_LABEL[o.status] || STATUS_LABEL.pending;
      const items = (o.items || []).map(it =>
        `<li>${acEsc(it.name)}${it.opts ? ` <small>(${acEsc(it.opts)})</small>` : ""} × ${acFa(it.qty)}</li>`).join("");
      return `<div class="ac-order">
        <div class="ac-order-head">
          <b>سفارش ${acEsc(acFa(o.no))}</b>
          <span class="ac-status ${cls}">${label}</span>
        </div>
        <div class="ac-order-meta">${acEsc(o.issued || "")} — ${o.delivery === "پیک" ? "🛵 پیک" : "🏬 حضوری"}</div>
        <ul>${items}</ul>
        <div class="ac-order-meta">📅 تحویل: ${acEsc(o.when || "")}</div>
        <div class="ac-order-total">${acFa(o.total)} تومان</div>
      </div>`;
    }).join("");
  },

  async logout() {
    await AccountAPI.logout();
    this.user = null;
    // اطلاعات حساب قبلی از فرم سفارش پاک شود تا با حساب بعدی قاطی نشود
    ["custName", "custPhone", "custAddress"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    this.renderButton();
    this.render();
  },

  async removeAccount() {
    if (!confirm("حساب و تمام سوابق سفارش از این دستگاه حذف شود؟")) return;
    await AccountAPI.deleteAccount(this.user.phone);
    this.user = null;
    ["custName", "custPhone", "custAddress"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    this.renderButton();
    this.render();
  },

  // ----- اتصال به فرم سفارش -----
  // فقط فیلدهای خالی را پر می‌کند تا چیزی که کاربر تایپ کرده پاک نشود.
  fillOrderForm() {
    const u = this.user;
    if (!u) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el && !el.value && v) el.value = v; };
    set("custName", u.name);
    set("custPhone", u.phone);
    set("custAddress", u.address);
  },

  // بعد از ارسال موفق سفارش توسط script.js صدا زده می‌شود
  async recordOrder(order) {
    if (!this.user) return;
    try {
      this.user = await AccountAPI.addOrder(this.user.phone, {
        no: order.no, issued: order.issued, when: order.when, delivery: order.delivery,
        address: order.address, note: order.note, items: order.items,
        total: order.t.total,
      });
      // اگر پروفایل خالی بود، از اطلاعات سفارش تکمیلش می‌کنیم
      if (!this.user.name || (!this.user.address && order.address)) {
        this.user = await AccountAPI.updateProfile(this.user.phone, {
          name: this.user.name || order.name,
          address: this.user.address || order.address,
        });
        this.renderButton();
      }
    } catch (e) { console.warn("ثبت سفارش در سوابق ناموفق بود:", e); }
  },
};

Account.ready = Account.init();
// ORDER_API در script.js تعریف می‌شود؛ پس همگام‌سازی را بعد از بارگذاری کامل صفحه شروع می‌کنیم
document.addEventListener("DOMContentLoaded", async () => {
  await Account.ready;
  Account.syncStatuses();
  setInterval(() => { if (!document.hidden) Account.syncStatuses(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) Account.syncStatuses(); });
});

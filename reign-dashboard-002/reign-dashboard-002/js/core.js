/* ==========================================================
   REIGN CORE — modal manager, formatting, toast, mock API.
   Load this first (see dashboard.html), then the modal files.

   Open any modal from any element:
     <button data-open-modal="withdraw" data-wallet="NGN">Withdraw</button>
   or from code:
     Reign.modals.open('convert', { wallet: 'NGN' });
   ========================================================== */
(() => {
  'use strict';
  const Reign = (window.Reign = window.Reign || {});

  /* ---------- Small DOM helpers ---------- */
  Reign.$ = (sel, root = document) => root.querySelector(sel);
  Reign.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  Reign.delay = delay;

  /** Show one [data-step] section inside a modal and hide the rest. */
  Reign.setStep = (root, name) => {
    root.dataset.state = name;
    Reign.$$('[data-step]', root).forEach((s) => { s.hidden = s.dataset.step !== name; });
  };

  /** Disable a button and show a spinner while an async job runs. */
  Reign.busy = (btn, on) => {
    btn.classList.toggle('is-busy', on);
    btn.disabled = on;
  };

  /** Show / clear an inline error box (.m-alert). */
  Reign.showError = (box, msg) => {
    if (!box) return;
    box.textContent = msg || '';
    box.hidden = !msg;
  };

  /* ---------- Formatting ---------- */
  const CURRENCIES = {
    NGN: { symbol: '₦', decimals: 2, name: 'Naira Wallet' },
    USD: { symbol: '$', decimals: 2, name: 'USD Wallet' },
    USDT: { symbol: '', decimals: 2, name: 'USDT Wallet' },
    BTC: { symbol: '', decimals: 8, name: 'Bitcoin Wallet' },
  };
  Reign.currencies = CURRENCIES;

  const fmt = (Reign.fmt = {
    number: (n, d = 2) =>
      Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }),
    money(n, code = 'NGN') {
      const c = CURRENCIES[code];
      const s = fmt.number(n, c.decimals);
      return c.symbol ? c.symbol + s : `${s} ${code}`;
    },
    date: (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    clock(sec) {
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      return `${m}:${s}`;
    },
  });

  /* ---------- Toast ---------- */
  Reign.toast = (message, type = '') => {
    let wrap = Reign.$('.m-toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'm-toast-wrap';
      wrap.setAttribute('role', 'status');
      wrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'm-toast' + (type ? ` m-toast--${type}` : '');
    t.textContent = message;
    wrap.appendChild(t);
    setTimeout(() => {
      t.classList.add('is-leaving');
      setTimeout(() => t.remove(), 320);
    }, 3200);
  };

  /* ==========================================================
     MOCK API
     Every method below returns a Promise, exactly like a real
     fetch() call would. Replace each body with your backend call,
     e.g.  return fetch('/api/wallets/withdraw', {method:'POST', ...}).then(r => r.json())

     IMPORTANT: fees, tax, penalties and payouts shown in the modals
     are for DISPLAY only. Your server must recalculate and enforce
     every amount when the request is actually submitted.
     ========================================================== */
  const api = () => Reign.api; // lets mock methods reach shared state without `this` binding issues
  Reign.api = {
    rates: { NGN: 1, USD: 1361.59978, USDT: 1360.41, BTC: 86638594 }, // value of 1 unit in NGN

    wallets: [
      { code: 'NGN', name: 'Naira Wallet', balance: 58404.104 },
      { code: 'USD', name: 'USD Wallet', balance: 120 },
      { code: 'USDT', name: 'USDT Wallet', balance: 35.5 },
      { code: 'BTC', name: 'Bitcoin Wallet', balance: 0.0012 },
    ],

    // min / max are in NGN
    plans: [
      { id: 'bronze', name: 'Bronze', roi: 15, days: 21, min: 5000, max: 499999 },
      { id: 'silver', name: 'Silver', roi: 22, days: 30, min: 500000, max: 1999999 },
      { id: 'gold', name: 'Gold', roi: 30, days: 45, min: 2000000, max: 4999999 },
      { id: 'platinum', name: 'Platinum', roi: 40, days: 60, min: 5000000, max: 50000000 },
    ],

    networks: {
      USDT: [
        { id: 'TRC20', label: 'TRC20 (Tron)' },
        { id: 'ERC20', label: 'ERC20 (Ethereum)' },
        { id: 'BEP20', label: 'BEP20 (BNB Smart Chain)' },
      ],
      BTC: [{ id: 'BTC', label: 'Bitcoin' }],
    },

    EARLY_WITHDRAWAL_PENALTY: 0.02, // 2% of profit earned so far
    MIN_WITHDRAWAL_NGN: 1000,

    /* ----- Profile, security and bank accounts (placeholder data) ----- */
    profile: {
      first: 'John', last: 'Doe', middle: '', email: 'name@example.com', phone: '+234 800 000 0000',
      dob: '1990-01-15', gender: 'Male', marital: 'Single', postal: '',
      country: 'Nigeria', state: '', city: '', address: '',
    },

    verification: {
      email: true,
      phone: true,
      twoFactor: true,
      identity: { status: 'verified', type: 'Passport', numberMasked: 'A••••••00', verifiedOn: '2026-08-11' },
    },

    bankList: [
      'Access Bank', 'Fidelity Bank', 'First Bank of Nigeria', 'Guaranty Trust Bank', 'Polaris Bank',
      'Stanbic IBTC Bank', 'Sterling Bank', 'United Bank for Africa', 'Wema Bank', 'Zenith Bank',
    ],

    bankAccounts: [
      { id: 'b1', bank: 'Fidelity Bank', number: '0000000001', name: 'JOHN DOE', isDefault: true },
      { id: 'b2', bank: 'First Bank of Nigeria', number: '0000000002', name: 'JOHN DOE', isDefault: false },
    ],

    async getBankAccounts() {
      await delay(700);
      // default account first, so selects preselect it
      return api().bankAccounts.map((a) => ({ ...a })).sort((a, b) => b.isDefault - a.isDefault);
    },

    async getProfile() { await delay(350); return { ...api().profile }; },
    async saveProfile(data) { await delay(800); Object.assign(api().profile, data); return { ok: true }; },
    async getVerification() { await delay(900); return JSON.parse(JSON.stringify(api().verification)); },
    async setTwoFactor(on) { await delay(700); api().verification.twoFactor = on; return { ok: true, twoFactor: on }; },

    /** Look up the registered name for an account number. Real version: your bank-verification provider. */
    async resolveAccount({ bank, number }) {
      await delay(900);
      if (!bank || !/^\d{10}$/.test(number)) throw new Error('invalid');
      const p = api().profile;
      return { name: `${p.first} ${p.last}`.toUpperCase() };
    },
    async addBankAccount({ bank, number, name }) {
      await delay(800);
      const a = api();
      if (a.bankAccounts.some((x) => x.number === number)) throw new Error('duplicate');
      const acc = { id: 'b' + Date.now(), bank, number, name, isDefault: a.bankAccounts.length === 0 };
      a.bankAccounts.push(acc);
      return { ...acc };
    },
    async setDefaultBank(id) {
      await delay(500);
      api().bankAccounts.forEach((x) => { x.isDefault = x.id === id; });
      return { ok: true };
    },
    async deleteBankAccount(id) {
      await delay(500);
      const a = api();
      const acc = a.bankAccounts.find((x) => x.id === id);
      if (acc && acc.isDefault) throw new Error('default');
      a.bankAccounts = a.bankAccounts.filter((x) => x.id !== id);
      return { ok: true };
    },

    async startFunding({ wallet, amount, method }) {
      await delay(700);
      return { ok: true, wallet, amount, method };
    },

    async createDepositAddress({ currency, network }) {
      await delay(1300);
      // "DEMO-" prefix on purpose: nobody should ever send real funds to a mock address.
      const rand = Array.from({ length: 28 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');
      return { address: `DEMO-${network}-${rand}`, currency, network };
    },

    async getDepositStatus() {
      await delay(300);
      return 'PENDING'; // PENDING | CONFIRMED
    },

    async getConversionQuote({ from, to, amount }) {
      await delay(800);
      const r = Reign.api.rates;
      const gross = (amount * r[from]) / r[to]; // in destination currency
      const platform = gross * 0.01;
      const tax = platform * 0.075;
      const provider = gross * 0.002;
      const network = to === 'USDT' ? 1 : to === 'BTC' ? 0.00002 : 0;
      const total = platform + tax + provider + network;
      return {
        from, to, amount, gross, platform, tax, provider, network, total,
        receive: Math.max(gross - total, 0),
        expiresIn: 300, // seconds
      };
    },

    async confirmConversion() { await delay(900); return { ok: true }; },
    async requestWithdrawal() { await delay(900); return { ok: true }; },
    async createInvestment() { await delay(900); return { ok: true }; },
    async requestEarlyWithdrawal() { await delay(900); return { ok: true }; },
  };

  /* ==========================================================
     MODAL MANAGER
     One modal open at a time. Handles backdrop click, Esc,
     focus trapping, scroll lock and restoring focus on close.
     Each modal file registers a controller: { open(root, ctx), close(root) }
     ========================================================== */
  const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const controllers = {};
  let current = null;
  let lastFocus = null;

  function focusFirst(el) {
    const items = Reign.$$(FOCUSABLE, el).filter((n) => n.offsetParent !== null && !n.classList.contains('modal__close'));
    (items[0] || Reign.$('.modal__close', el) || el).focus({ preventScroll: true });
  }

  function open(id, ctx = {}) {
    const el = document.getElementById('modal-' + id);
    if (!el) { console.warn(`[Reign] No modal with id "modal-${id}"`); return; }
    if (current && current.id === id) return;
    if (current) close({ restoreFocus: false });
    else lastFocus = document.activeElement;

    clearTimeout(el._hideTimer);
    current = { id, el };
    el.hidden = false;
    document.body.classList.add('modal-open');
    controllers[id]?.open?.(el, ctx);
    requestAnimationFrame(() => {
      el.classList.add('is-open');
      focusFirst(el);
    });
  }

  function close({ restoreFocus = true } = {}) {
    if (!current) return;
    const { id, el } = current;
    current = null;
    controllers[id]?.close?.(el);
    el.classList.remove('is-open');
    el._hideTimer = setTimeout(() => { el.hidden = true; }, 280);
    document.body.classList.remove('modal-open');
    if (restoreFocus && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  Reign.modals = {
    register: (id, controller) => { controllers[id] = controller; },
    open,
    close,
    get current() { return current && current.id; },
  };

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-modal]');
    if (opener) {
      e.preventDefault();
      open(opener.dataset.openModal, { ...opener.dataset });
      return;
    }
    if (e.target.closest('[data-close-modal]')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!current) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = Reign.$$(FOCUSABLE, current.el).filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();

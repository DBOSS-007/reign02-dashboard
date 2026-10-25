/* New Investment — choose plan + wallet + amount, see a live summary, then invest. */
(() => {
  'use strict';
  const { $, api, fmt, toast, busy, showError, modals } = Reign;
  const root = document.getElementById('modal-new-investment');
  if (!root) return;

  const plan = $('#ni-plan', root);
  const wallet = $('#ni-wallet', root);
  const amount = $('#ni-amount', root);
  const error = $('#ni-error', root);
  const submit = $('#ni-submit', root);
  const set = (id, text) => { $('#' + id, root).textContent = text; };

  const getPlan = () => api.plans.find((p) => p.id === plan.value);
  const getWallet = () => api.wallets.find((w) => w.code === wallet.value);

  /** Recalculate the summary and return an error message (or '' if valid). */
  function refresh() {
    const p = getPlan();
    const w = getWallet();
    const value = parseFloat(amount.value) || 0;
    const rate = api.rates[w.code];
    const profit = value * (p.roi / 100);
    const maturity = new Date();
    maturity.setDate(maturity.getDate() + p.days);

    set('ni-sum-plan', p.name);
    set('ni-sum-wallet', w.name);
    set('ni-sum-balance', fmt.money(w.balance, w.code));
    set('ni-sum-amount', fmt.money(value, w.code));
    set('ni-sum-roi', p.roi.toFixed(2) + '%');
    set('ni-sum-duration', `${p.days} Days`);
    set('ni-sum-daily', fmt.money(profit / p.days, w.code));
    set('ni-sum-profit', fmt.money(profit, w.code));
    set('ni-sum-return', fmt.money(value + profit, w.code));
    set('ni-sum-maturity', fmt.date(maturity));

    let msg = '';
    if (value > 0) {
      const ngn = value * rate;
      if (value > w.balance) msg = `Insufficient balance in your ${w.name}.`;
      else if (ngn < p.min) msg = `${p.name} requires at least ${fmt.money(p.min)} (about ${fmt.money(p.min / rate, w.code)}).`;
      else if (ngn > p.max) msg = `${p.name} accepts up to ${fmt.money(p.max)} (about ${fmt.money(p.max / rate, w.code)}).`;
    }
    showError(error, msg);
    amount.classList.toggle('is-invalid', !!msg);
    submit.disabled = !(value > 0) || !!msg;
    return msg;
  }

  [plan, wallet].forEach((el) => el.addEventListener('change', refresh));
  amount.addEventListener('input', refresh);

  $('form', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (refresh() || !(parseFloat(amount.value) > 0)) return;
    busy(submit, true);
    try {
      await api.createInvestment({ plan: plan.value, wallet: wallet.value, amount: parseFloat(amount.value) });
      modals.close();
      toast(`${getPlan().name} investment created`, 'ok');
    } catch (err) {
      showError(error, 'Could not create your investment. Please try again.');
    } finally {
      busy(submit, false);
      refresh();
    }
  });

  modals.register('new-investment', {
    open(_, ctx) {
      plan.innerHTML = api.plans.map((p) => `<option value="${p.id}">${p.name} (${p.roi.toFixed(2)}% ROI)</option>`).join('');
      wallet.innerHTML = api.wallets.map((w) => `<option value="${w.code}">${w.name} (${fmt.number(w.balance, Reign.currencies[w.code].decimals)})</option>`).join('');
      if (ctx.plan) plan.value = ctx.plan;
      wallet.value = ctx.wallet || 'NGN';
      amount.value = '';
      root.querySelector('.modal__body').scrollTop = 0;
      refresh();
    },
  });
})();

/* Convert — amount + destination wallet → live quote with fees and a 5-minute timer.
   Steps: form → quote */
(() => {
  'use strict';
  const { $, api, fmt, toast, busy, showError, setStep, modals } = Reign;
  const root = document.getElementById('modal-convert');
  if (!root) return;

  const amount = $('#cv-amount', root);
  const to = $('#cv-to', root);
  const error = $('#cv-error', root);
  const getQuote = $('#cv-get-quote', root);
  const agree = $('#cv-agree', root);
  const confirm = $('#cv-confirm', root);
  const timer = $('#cv-timer', root);
  let from = 'NGN';
  let quote = null;
  let tick = null;
  let left = 0;

  const stopTimer = () => { clearInterval(tick); tick = null; };

  function syncConfirm() {
    confirm.disabled = !(agree.checked && quote && left > 0);
  }

  function startTimer(seconds) {
    stopTimer();
    left = seconds;
    const paint = () => {
      timer.textContent = left > 0 ? fmt.clock(left) : 'Expired';
      timer.classList.toggle('is-low', left <= 30);
      syncConfirm();
    };
    paint();
    tick = setInterval(() => {
      left -= 1;
      paint();
      if (left <= 0) stopTimer();
    }, 1000);
  }

  /** "1 USDT = 1,360.41 NGN" — always quote the higher-value currency as the base. */
  function rateText(a, b) {
    const r = api.rates;
    const [base, other] = r[a] >= r[b] ? [a, b] : [b, a];
    return `1 ${base} = ${fmt.number(r[base] / r[other], Reign.currencies[other].decimals)} ${other}`;
  }

  function renderQuote(q) {
    const m = (n) => fmt.money(n, q.to);
    $('#cv-sum-from', root).textContent = fmt.money(q.amount, q.from);
    $('#cv-sum-rate', root).textContent = rateText(q.from, q.to);
    $('#cv-sum-gross', root).textContent = m(q.gross);
    $('#cv-sum-platform', root).textContent = m(q.platform);
    $('#cv-sum-tax', root).textContent = m(q.tax);
    $('#cv-sum-provider', root).textContent = m(q.provider);
    $('#cv-sum-network', root).textContent = m(q.network);
    $('#cv-sum-total', root).textContent = m(q.total);
    $('#cv-sum-receive', root).textContent = m(q.receive);
  }

  $('form', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(error, '');
    const value = parseFloat(amount.value);
    const w = api.wallets.find((x) => x.code === from);
    let msg = '';
    if (!value || value <= 0) msg = 'Enter the amount you want to convert.';
    else if (value > w.balance) msg = `Insufficient balance. You have ${fmt.money(w.balance, from)} available.`;
    else if (!to.value) msg = 'Choose a destination wallet.';
    if (msg) { showError(error, msg); return; }

    busy(getQuote, true);
    try {
      quote = await api.getConversionQuote({ from, to: to.value, amount: value });
      renderQuote(quote);
      agree.checked = false;
      setStep(root, 'quote');
      startTimer(quote.expiresIn);
    } catch (err) {
      showError(error, 'Could not get a quote. Please try again.');
    } finally {
      busy(getQuote, false);
    }
  });

  agree.addEventListener('change', syncConfirm);

  $('#cv-back', root).addEventListener('click', () => {
    stopTimer();
    quote = null;
    setStep(root, 'form');
  });

  confirm.addEventListener('click', async () => {
    if (!quote || left <= 0) return;
    busy(confirm, true);
    try {
      await api.confirmConversion(quote);
      stopTimer();
      modals.close();
      toast(`Converted to ${fmt.money(quote.receive, quote.to)}`, 'ok');
    } catch (err) {
      toast('Conversion failed. Please try again.', 'error');
    } finally {
      busy(confirm, false);
      syncConfirm();
    }
  });

  modals.register('convert', {
    open(_, ctx) {
      from = ctx.wallet || 'NGN';
      quote = null;
      stopTimer();
      amount.value = '';
      showError(error, '');
      to.innerHTML =
        '<option value="">Select destination wallet</option>' +
        api.wallets.filter((w) => w.code !== from).map((w) => `<option value="${w.code}">${w.name}</option>`).join('');
      $('#cv-from-label', root).textContent = api.wallets.find((w) => w.code === from).name;
      setStep(root, 'form');
    },
    close() { stopTimer(); },
  });
})();

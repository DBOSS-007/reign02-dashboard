/* Fund Wallet — pick wallet, amount and payment method, then continue.
   Crypto wallets (USDT / BTC) hand off to the Crypto Deposit modal. */
(() => {
  'use strict';
  const { $, api, fmt, toast, busy, showError, modals } = Reign;
  const root = document.getElementById('modal-fund-wallet');
  if (!root) return;

  const wallet = $('#fund-wallet', root);
  const amount = $('#fund-amount', root);
  const amountGroup = $('#fund-amount-group', root);
  const method = $('#fund-method', root);
  const error = $('#fund-error', root);
  const submit = $('#fund-submit', root);

  const METHODS = {
    fiat: [['bank', 'Bank Transfer'], ['card', 'Card Payment']],
    crypto: [['crypto', 'Crypto Deposit']],
  };
  const isCrypto = (code) => code === 'USDT' || code === 'BTC';

  function syncMethods() {
    const list = isCrypto(wallet.value) ? METHODS.crypto : METHODS.fiat;
    method.innerHTML = list.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    amountGroup.hidden = method.value === 'crypto'; // address flow doesn't need an amount
    showError(error, '');
  }

  wallet.addEventListener('change', syncMethods);
  method.addEventListener('change', () => { amountGroup.hidden = method.value === 'crypto'; });

  $('form', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(error, '');

    if (method.value === 'crypto') {
      modals.open('crypto-deposit', { currency: wallet.value });
      return;
    }

    const value = parseFloat(amount.value);
    if (!value || value <= 0) {
      amount.classList.add('is-invalid');
      showError(error, 'Enter an amount greater than zero.');
      amount.focus();
      return;
    }
    amount.classList.remove('is-invalid');

    busy(submit, true);
    try {
      await api.startFunding({ wallet: wallet.value, amount: value, method: method.value });
      modals.close();
      toast(`Funding request for ${fmt.money(value, wallet.value)} started`, 'ok');
    } catch (err) {
      showError(error, 'Could not start funding. Please try again.');
    } finally {
      busy(submit, false);
    }
  });

  modals.register('fund-wallet', {
    open(_, ctx) {
      wallet.innerHTML = api.wallets.map((w) => `<option value="${w.code}">${w.name}</option>`).join('');
      wallet.value = ctx.wallet || 'NGN';
      amount.value = '';
      amount.classList.remove('is-invalid');
      syncMethods();
    },
  });
})();

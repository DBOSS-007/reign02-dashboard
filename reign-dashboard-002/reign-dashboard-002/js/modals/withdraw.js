/* Withdraw — move money from a wallet to a verified bank account. */
(() => {
  'use strict';
  const { $, api, fmt, toast, busy, showError, modals } = Reign;
  const root = document.getElementById('modal-withdraw');
  if (!root) return;

  const amount = $('#wd-amount', root);
  const bank = $('#wd-bank', root);
  const error = $('#wd-error', root);
  const submit = $('#wd-submit', root);
  const available = $('#wd-available', root);
  let accounts = [];
  let code = 'NGN';

  const walletInfo = () => api.wallets.find((w) => w.code === code);

  function renderBankDetails() {
    const a = accounts.find((x) => x.id === bank.value);
    $('#wd-bank-name', root).textContent = a ? a.bank : '-';
    $('#wd-acc-name', root).textContent = a ? a.name : '-';
    $('#wd-acc-number', root).textContent = a ? a.number : '-';
  }
  bank.addEventListener('change', renderBankDetails);

  $('form', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(error, '');
    const value = parseFloat(amount.value);
    const w = walletInfo();
    let msg = '';
    if (!value || value <= 0) msg = 'Enter the amount you want to withdraw.';
    else if (code === 'NGN' && value < api.MIN_WITHDRAWAL_NGN) msg = `The minimum withdrawal is ${fmt.money(api.MIN_WITHDRAWAL_NGN)}.`;
    else if (value > w.balance) msg = `Insufficient balance. You have ${fmt.money(w.balance, code)} available.`;
    else if (!bank.value) msg = 'Choose a bank account.';
    amount.classList.toggle('is-invalid', !!msg && bank.value !== '');
    if (msg) { showError(error, msg); return; }

    busy(submit, true);
    try {
      await api.requestWithdrawal({ wallet: code, amount: value, bankAccountId: bank.value });
      modals.close();
      toast(`Withdrawal of ${fmt.money(value, code)} requested`, 'ok');
    } catch (err) {
      showError(error, 'Could not submit your withdrawal. Please try again.');
    } finally {
      busy(submit, false);
    }
  });

  modals.register('withdraw', {
    async open(_, ctx) {
      code = ctx.wallet || 'NGN';
      $('#wd-wallet-name', root).textContent = walletInfo().name;
      available.textContent = `Available: ${fmt.money(walletInfo().balance, code)}`;
      amount.value = '';
      showError(error, '');
      bank.innerHTML = '<option value="">Loading bank accounts…</option>';
      submit.disabled = true;
      accounts = [];
      renderBankDetails();
      try {
        accounts = await api.getBankAccounts();
        bank.innerHTML = accounts.map((a) => `<option value="${a.id}">${a.bank} — ${a.number}</option>`).join('');
        renderBankDetails();
      } catch (err) {
        bank.innerHTML = '<option value="">Could not load accounts</option>';
        showError(error, 'We could not load your bank accounts.');
      }
      submit.disabled = !accounts.length;
    },
  });
})();

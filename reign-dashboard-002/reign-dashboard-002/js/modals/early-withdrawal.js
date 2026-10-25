/* Request Early Withdrawal — opened from a row in the investments table.
   Values arrive as data-* attributes on the trigger button:
     data-id, data-plan, data-roi, data-days, data-elapsed, data-principal, data-earned
   Penalty/payout math here is display only — enforce it on the server. */
(() => {
  'use strict';
  const { $, api, fmt, toast, busy, showError, modals } = Reign;
  const root = document.getElementById('modal-early-withdrawal');
  if (!root) return;

  const bank = $('#ew-bank', root);
  const reason = $('#ew-reason', root);
  const error = $('#ew-error', root);
  const submit = $('#ew-submit', root);
  const set = (id, text) => { $('#' + id, root).textContent = text; };
  let inv = null;

  const MIN_REASON = 10;

  $('form', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(error, '');
    let msg = '';
    if (!bank.value) msg = 'Choose the bank account for your payout.';
    else if (reason.value.trim().length < MIN_REASON) msg = 'Please tell us why you are requesting an early withdrawal.';
    reason.classList.toggle('is-invalid', reason.value.trim().length < MIN_REASON && !!bank.value);
    if (msg) { showError(error, msg); return; }

    busy(submit, true);
    try {
      await api.requestEarlyWithdrawal({ investmentId: inv.id, bankAccountId: bank.value, reason: reason.value.trim() });
      modals.close();
      toast('Early withdrawal request submitted for review', 'ok');
    } catch (err) {
      showError(error, 'Could not submit your request. Please try again.');
    } finally {
      busy(submit, false);
    }
  });

  modals.register('early-withdrawal', {
    async open(_, ctx) {
      const days = Number(ctx.days) || 0;
      const elapsed = Math.min(Number(ctx.elapsed) || 0, days);
      const roi = Number(ctx.roi) || 0;
      const principal = Number(ctx.principal) || 0;
      const expected = principal * (roi / 100);
      const earned = ctx.earned !== undefined ? Number(ctx.earned) : days ? expected * (elapsed / days) : 0;
      const penalty = earned * api.EARLY_WITHDRAWAL_PENALTY;
      inv = { id: ctx.id };

      set('ew-id', ctx.id || '-');
      set('ew-plan', ctx.plan || '-');
      set('ew-roi', `${roi}%`);
      set('ew-duration', `${days} Days`);
      set('ew-elapsed', `${elapsed} Days`);
      set('ew-remaining', `${days - elapsed} Days`);
      set('ew-principal', fmt.money(principal));
      set('ew-expected', fmt.money(expected));
      set('ew-earned', fmt.money(earned));
      set('ew-penalty', fmt.money(penalty));
      set('ew-payout', fmt.money(principal + earned - penalty));

      reason.value = '';
      reason.classList.remove('is-invalid');
      showError(error, '');
      root.querySelector('.modal__body').scrollTop = 0;

      bank.innerHTML = '<option value="">Loading bank accounts…</option>';
      submit.disabled = true;
      try {
        const accounts = await api.getBankAccounts();
        bank.innerHTML = accounts.map((a) => `<option value="${a.id}">${a.bank} — ${a.number}</option>`).join('');
        submit.disabled = !accounts.length;
      } catch (err) {
        bank.innerHTML = '<option value="">Could not load accounts</option>';
        showError(error, 'We could not load your bank accounts.');
      }
    },
  });
})();

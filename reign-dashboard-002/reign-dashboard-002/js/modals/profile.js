/* Profile — three tabs: Personal (editable form), Security (status + 2FA), Bank Accounts (add / default / delete). */
(() => {
  'use strict';
  const { $, $$, api, fmt, toast, busy, showError, modals } = Reign;
  const root = document.getElementById('modal-profile');
  if (!root) return;

  const tabs = $$('.m-tab', root);
  const footer = $('#pf-footer', root);
  const error = $('#pf-error', root);
  const save = $('#pf-save', root);

  const FIELDS = ['first', 'last', 'middle', 'email', 'phone', 'dob', 'gender', 'marital', 'postal', 'country', 'state', 'city', 'address'];
  const REQUIRED = ['first', 'last', 'email', 'phone', 'dob', 'gender', 'marital', 'country', 'state', 'city', 'address'];
  const el = (k) => $('#pf-' + k, root);

  /* ---------- Tabs ---------- */
  function showTab(name) {
    tabs.forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
    });
    $$('[data-panel]', root).forEach((p) => { p.hidden = p.dataset.panel !== name; });
    footer.hidden = name !== 'personal';
    $('.modal__body', root).scrollTop = 0;
    if (name === 'security') loadSecurity();
    if (name === 'banks') loadBanks();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showTab(t.dataset.tab));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      showTab(next.dataset.tab);
    });
  });

  /* ---------- Personal ---------- */
  function updateCompletion() {
    const done = REQUIRED.filter((k) => String(el(k).value || '').trim()).length;
    const pct = Math.round((done / REQUIRED.length) * 100);
    $('#pf-pct', root).textContent = pct + '%';
    $('#pf-bar', root).style.width = pct + '%';
  }
  $('#pf-form', root).addEventListener('input', updateCompletion);

  async function loadPersonal() {
    const data = await api.getProfile();
    FIELDS.forEach((k) => { el(k).value = data[k] ?? ''; el(k).classList.remove('is-invalid'); });
    updateCompletion();
  }

  function validate() {
    FIELDS.forEach((k) => el(k).classList.remove('is-invalid'));
    const missing = REQUIRED.filter((k) => !String(el(k).value || '').trim());
    if (missing.length) {
      missing.forEach((k) => el(k).classList.add('is-invalid'));
      el(missing[0]).focus();
      return 'Please fill in all required fields.';
    }
    const dob = new Date(el('dob').value);
    const eighteen = new Date(); eighteen.setFullYear(eighteen.getFullYear() - 18);
    if (isNaN(dob) || dob > eighteen) {
      el('dob').classList.add('is-invalid');
      el('dob').focus();
      return 'You must be at least 18 years old.';
    }
    return '';
  }

  $('#pf-form', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = validate();
    showError(error, msg);
    if (msg) return;
    busy(save, true);
    try {
      // first/last/email/phone are read-only (verified) — only send editable fields
      const body = {};
      ['middle', 'dob', 'gender', 'marital', 'postal', 'country', 'state', 'city', 'address'].forEach((k) => { body[k] = el(k).value.trim(); });
      await api.saveProfile(body);
      toast('Profile saved', 'ok');
    } catch (err) {
      showError(error, 'Could not save your profile. Please try again.');
    } finally {
      busy(save, false);
    }
  });

  /* ---------- Security ---------- */
  const badge = (on, yes = 'Verified', no = 'Not verified') =>
    `<span class="m-badge ${on ? 'm-badge--ok' : 'm-badge--off'}">${on ? yes : no}</span>`;
  let twoFactor = true;
  let armTimer = null;

  function paintTwoFactor() {
    $('#pf-2fa-badge', root).outerHTML = `<span class="m-badge ${twoFactor ? 'm-badge--ok' : 'm-badge--off'}" id="pf-2fa-badge">${twoFactor ? 'Enabled' : 'Disabled'}</span>`;
    const btn = $('#pf-2fa-btn', root);
    btn.textContent = twoFactor ? 'Disable 2FA' : 'Enable 2FA';
    btn.classList.toggle('m-btn--outline-danger', twoFactor);
    btn.classList.toggle('m-btn--ghost', !twoFactor);
    btn.classList.remove('is-armed');
  }

  async function loadSecurity() {
    ['pf-email-status', 'pf-phone-status', 'pf-id-status'].forEach((id) => { $('#' + id, root).innerHTML = '<span class="m-spin">Checking…</span>'; });
    try {
      const v = await api.getVerification();
      $('#pf-email-status', root).innerHTML = badge(v.email);
      $('#pf-phone-status', root).innerHTML = badge(v.phone);
      const id = v.identity;
      $('#pf-id-status', root).innerHTML = badge(id.status === 'verified');
      $('#pf-id-type', root).textContent = id.type || '-';
      $('#pf-id-number', root).textContent = id.numberMasked || '-';
      $('#pf-id-date', root).textContent = id.verifiedOn ? fmt.date(new Date(id.verifiedOn)) : '-';
      twoFactor = v.twoFactor;
      paintTwoFactor();
    } catch (err) {
      toast('Could not load security status.', 'error');
    }
  }

  // Turning 2FA off needs a second click so it can't happen by accident.
  $('#pf-2fa-btn', root).addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (twoFactor && !btn.classList.contains('is-armed')) {
      btn.classList.add('is-armed');
      btn.textContent = 'Click again to confirm';
      clearTimeout(armTimer);
      armTimer = setTimeout(paintTwoFactor, 4000);
      return;
    }
    clearTimeout(armTimer);
    busy(btn, true);
    try {
      const res = await api.setTwoFactor(!twoFactor);
      twoFactor = res.twoFactor;
      toast(twoFactor ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled', 'ok');
    } catch (err) {
      toast('Could not update two-factor authentication.', 'error');
    } finally {
      busy(btn, false);
      paintTwoFactor();
    }
  });

  /* ---------- Bank accounts ---------- */
  const list = $('#pf-banks', root);
  const addForm = $('#pf-bank-form', root);
  const bankSel = $('#pf-bank-select', root);
  const bankNum = $('#pf-bank-number', root);
  const bankName = $('#pf-bank-name', root);
  const bankSave = $('#pf-bank-save', root);
  const bankErr = $('#pf-bank-error', root);
  let resolveToken = 0;

  async function loadBanks() {
    list.innerHTML = '<li class="m-empty"><span class="m-spin">Loading bank accounts…</span></li>';
    try {
      const rows = await api.getBankAccounts();
      list.innerHTML = rows.length
        ? rows.map((a) => `
          <li class="m-bank" data-id="${a.id}">
            <div>
              <p class="m-bank__name">${a.bank}${a.isDefault ? ' <span class="m-badge m-badge--ok">DEFAULT</span>' : ''}</p>
              <p class="m-bank__meta">${a.number} · ${a.name}</p>
            </div>
            <div class="m-bank__actions">
              ${a.isDefault ? '' : '<button type="button" class="m-btn m-btn--ghost m-btn--sm" data-act="default">Set default</button>'}
              ${a.isDefault ? '' : '<button type="button" class="m-btn m-btn--outline-danger m-btn--sm" data-act="delete">Delete</button>'}
            </div>
          </li>`).join('')
        : '<li class="m-empty">No bank accounts yet. Add one to receive withdrawals.</li>';
    } catch (err) {
      list.innerHTML = '<li class="m-empty">Could not load your bank accounts.</li>';
    }
  }

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.closest('.m-bank').dataset.id;
    if (btn.dataset.act === 'delete' && !btn.classList.contains('is-armed')) {
      btn.classList.add('is-armed');
      btn.textContent = 'Confirm delete';
      setTimeout(() => { if (btn.isConnected) { btn.classList.remove('is-armed'); btn.textContent = 'Delete'; } }, 3500);
      return;
    }
    busy(btn, true);
    try {
      if (btn.dataset.act === 'default') { await api.setDefaultBank(id); toast('Default account updated', 'ok'); }
      else { await api.deleteBankAccount(id); toast('Bank account removed', 'ok'); }
      await loadBanks();
    } catch (err) {
      toast(err.message === 'default' ? 'Set another default account first.' : 'Something went wrong. Please try again.', 'error');
      busy(btn, false);
    }
  });

  function openAddForm(open) {
    addForm.hidden = !open;
    $('#pf-add-bank', root).hidden = open;
    showError(bankErr, '');
    if (open) {
      bankSel.innerHTML = '<option value="">Select bank</option>' + api.bankList.map((b) => `<option>${b}</option>`).join('');
      bankNum.value = '';
      bankName.value = '';
      bankSave.disabled = true;
      bankSel.focus();
    }
  }
  $('#pf-add-bank', root).addEventListener('click', () => openAddForm(true));
  $('#pf-bank-cancel', root).addEventListener('click', () => openAddForm(false));

  async function tryResolve() {
    bankSave.disabled = true;
    bankName.value = '';
    showError(bankErr, '');
    if (!bankSel.value || !/^\d{10}$/.test(bankNum.value)) return;
    const token = ++resolveToken;
    bankName.value = 'Verifying account…';
    try {
      const res = await api.resolveAccount({ bank: bankSel.value, number: bankNum.value });
      if (token !== resolveToken) return; // a newer lookup replaced this one
      bankName.value = res.name;
      bankSave.disabled = false;
    } catch (err) {
      if (token !== resolveToken) return;
      bankName.value = '';
      showError(bankErr, 'We could not verify that account. Check the bank and number.');
    }
  }
  bankSel.addEventListener('change', tryResolve);
  bankNum.addEventListener('input', () => {
    bankNum.value = bankNum.value.replace(/\D/g, '').slice(0, 10);
    tryResolve();
  });

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    busy(bankSave, true);
    try {
      await api.addBankAccount({ bank: bankSel.value, number: bankNum.value, name: bankName.value });
      toast('Bank account added', 'ok');
      openAddForm(false);
      await loadBanks();
    } catch (err) {
      showError(bankErr, err.message === 'duplicate' ? 'That account is already on your profile.' : 'Could not add the account. Please try again.');
    } finally {
      busy(bankSave, false);
    }
  });

  /* ---------- Register ---------- */
  modals.register('profile', {
    async open(_, ctx) {
      showError(error, '');
      openAddForm(false);
      showTab(ctx.tab || 'personal');
      try { await loadPersonal(); }
      catch (err) { showError(error, 'Could not load your profile.'); }
    },
    close() { clearTimeout(armTimer); resolveToken++; },
  });
})();

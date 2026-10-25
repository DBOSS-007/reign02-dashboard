/* Dashboard demo shell: renders wallet cards from Reign.api.wallets.
   Delete this file when you plug the modals into your real dashboard. */
(() => {
  'use strict';
  const { $, api, fmt } = Reign;
  const grid = $('#wallets');
  if (!grid) return;

  grid.innerHTML = api.wallets
    .map(
      (w) => `
      <article class="wallet">
        <div class="wallet__code">${w.code}</div>
        <div class="wallet__name">${w.name}</div>
        <p class="wallet__bal">${fmt.money(w.balance, w.code)}</p>
        <div class="wallet__actions">
          <button class="btn btn--gold" data-open-modal="fund-wallet" data-wallet="${w.code}">Fund</button>
          ${w.code === 'NGN' ? `<button class="btn" data-open-modal="withdraw" data-wallet="${w.code}">Withdraw</button>` : ''}
          <button class="btn" data-open-modal="convert" data-wallet="${w.code}">Convert</button>
        </div>
      </article>`
    )
    .join('');
})();

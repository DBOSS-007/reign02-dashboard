/* Plans — one card per plan. "Invest" hands off to the New Investment modal with that plan preselected. */
(() => {
  'use strict';
  const { $, api, fmt, modals } = Reign;
  const root = document.getElementById('modal-plans');
  if (!root) return;
  const grid = $('#pl-grid', root);

  function render() {
    grid.innerHTML = api.plans
      .map((p) => {
        const daily = p.roi / p.days;
        const onMin = p.min * (p.roi / 100);
        return `
        <article class="m-plan">
          <h3 class="m-plan__name">${p.name}</h3>
          <p class="m-plan__roi">${p.roi}%<small>ROI in ${p.days} days</small></p>
          <ul class="m-plan__rows">
            <li><span>Minimum</span><strong>${fmt.money(p.min)}</strong></li>
            <li><span>Maximum</span><strong>${fmt.money(p.max)}</strong></li>
            <li><span>Duration</span><strong>${p.days} days</strong></li>
            <li><span>Daily growth</span><strong>${daily.toFixed(2)}%</strong></li>
            <li><span>Profit on minimum</span><strong>${fmt.money(onMin)}</strong></li>
          </ul>
          <button type="button" class="m-btn m-btn--block" data-plan="${p.id}">Invest in ${p.name}</button>
        </article>`;
      })
      .join('');
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-plan]');
    if (btn) modals.open('new-investment', { plan: btn.dataset.plan, wallet: 'NGN' });
  });

  modals.register('plans', {
    open() {
      render();
      root.querySelector('.modal__body').scrollTop = 0;
    },
  });
})();

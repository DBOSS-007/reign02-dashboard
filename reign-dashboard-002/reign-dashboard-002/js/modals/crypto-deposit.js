/* Crypto Deposit — choose network → generate address → show address + status.
   Steps: select → generating → ready */
(() => {
  'use strict';
  const { $, api, setStep, busy, toast, modals } = Reign;
  const root = document.getElementById('modal-crypto-deposit');
  if (!root) return;

  const network = $('#cd-network', root);
  const generate = $('#cd-generate', root);
  const address = $('#cd-address', root);
  const copyBtn = $('#cd-copy', root);
  const status = $('#cd-status', root);
  const qrBox = $('#cd-qr', root);
  let currency = 'USDT';
  let pollTimer = null;

  const stopPolling = () => { clearInterval(pollTimer); pollTimer = null; };

  function setStatus(s) {
    status.textContent = s;
    status.classList.toggle('m-badge--ok', s === 'CONFIRMED');
  }

  /** Draws a QR if a QR library is on the page (e.g. qrcodejs → window.QRCode). Otherwise the box stays hidden. */
  function renderQr(text) {
    qrBox.innerHTML = '';
    if (typeof window.QRCode !== 'function') { qrBox.hidden = true; return; }
    qrBox.hidden = false;
    new window.QRCode(qrBox, { text, width: 168, height: 168 });
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(async () => {
      try {
        const s = await api.getDepositStatus();
        setStatus(s);
        if (s === 'CONFIRMED') { stopPolling(); toast('Deposit confirmed — wallet credited', 'ok'); }
      } catch (_) { /* keep trying */ }
    }, 10000);
  }

  generate.addEventListener('click', async () => {
    if (!network.value) {
      network.classList.add('is-invalid');
      network.focus();
      return;
    }
    network.classList.remove('is-invalid');
    setStep(root, 'generating');
    try {
      const res = await api.createDepositAddress({ currency, network: network.value });
      address.value = res.address;
      $('#cd-send-currency', root).textContent = currency;
      $('#cd-send-network', root).textContent = network.value;
      setStatus('PENDING');
      renderQr(res.address);
      setStep(root, 'ready');
      startPolling();
    } catch (err) {
      setStep(root, 'select');
      toast('Could not generate a deposit address. Please try again.', 'error');
    }
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(address.value);
    } catch (_) {
      address.select();
      document.execCommand('copy');
    }
    copyBtn.textContent = 'Copied';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1600);
  });

  modals.register('crypto-deposit', {
    open(_, ctx) {
      currency = ctx.currency || 'USDT';
      $('#cd-currency', root).textContent = currency;
      const list = api.networks[currency] || [];
      network.innerHTML =
        '<option value="">Select network</option>' +
        list.map((n) => `<option value="${n.id}">${n.label}</option>`).join('');
      if (list.length === 1) network.value = list[0].id;
      network.classList.remove('is-invalid');
      busy(generate, false);
      address.value = '';
      qrBox.innerHTML = '';
      setStep(root, 'select');
    },
    close() { stopPolling(); },
  });
})();

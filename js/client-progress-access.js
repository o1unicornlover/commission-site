/* Private progress access. Load this before network dependencies so a stalled
   script cannot leave the page on its initial loading message forever. */
(function initClientProgressAccess() {
  const onProgress = /(^|\/)progress\.html$/i.test(location.pathname) || location.pathname.endsWith('/progress.html');
  if (!onProgress) return;

  let bootTimer = null;
  let unlockBusy = false;
  let renderBusy = false;
  let lastCommission = null;
  const REQUEST_TIMEOUT_MS = 10000;

  const $ = id => document.getElementById(id);

  function area() {
    return $('progressArea');
  }

  function commissionId() {
    return new URLSearchParams(location.search).get('id');
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[char]);
  }

  function safeHref(value) {
    try {
      const url = new URL(String(value || ''), location.href);
      return /^https?:$/i.test(url.protocol) ? url.href : '#';
    } catch (_) {
      return '#';
    }
  }

  function readAccess() {
    try {
      return JSON.parse(sessionStorage.getItem('progressAccess') || '{}');
    } catch (_) {
      return {};
    }
  }

  function writeAccess(id, password) {
    sessionStorage.setItem('progressAccess', JSON.stringify({
      id: String(id),
      password: String(password)
    }));
  }

  function clearAccess() {
    sessionStorage.removeItem('progressAccess');
  }

  function draftKey() {
    return `clientProgressDraft:${commissionId() || 'unknown'}`;
  }

  function wireComposer(id) {
    const input = $('clientChatInput');
    const button = $('clientChatSend');
    if (!input || !button) return;
    try { input.value = localStorage.getItem(draftKey()) || ''; } catch (_) {}
    input.addEventListener('input', () => {
      try {
        if (input.value.trim()) localStorage.setItem(draftKey(), input.value);
        else localStorage.removeItem(draftKey());
      } catch (_) {}
    });
    button.addEventListener('click', () => sendClientMessage(id));
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      sendClientMessage(id);
    });
  }

  function hasAccessFor(commission) {
    const access = readAccess();
    return Boolean(
      commission &&
      String(access.id || '') === String(commission.id) &&
      String(access.password || '') === String(commission.password || '')
    );
  }

  function apiReady() {
    return (
      Boolean(window.supabaseClient) &&
      typeof window.getCommissionById === 'function' &&
      typeof window.getProgressUpdates === 'function' &&
      typeof window.getChatMessages === 'function' &&
      typeof window.createChatMessage === 'function'
    );
  }

  async function waitForApi(timeoutMs = 8000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (apiReady()) return true;
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    return false;
  }

  function withTimeout(request, message = 'The connection timed out.') {
    let timer;
    return Promise.race([
      Promise.resolve(request),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), REQUEST_TIMEOUT_MS);
      })
    ]).finally(() => clearTimeout(timer));
  }

  function renderMissingLink() {
    const target = area();
    if (!target) return;
    target.innerHTML = `
      <div class="progress-card client-access-card">
        <p class="eyebrow">Private client space</p>
        <h2>Progress link needed</h2>
        <p class="small">This link is missing its commission ID. Open the private link the artist sent you, or return to the queue.</p>
        <a class="btn primary" href="queue.html">Back to Queue</a>
      </div>`;
  }

  function renderLoadError(message = 'The private workspace could not connect. Try again in a moment.') {
    const target = area();
    if (!target) return;
    target.innerHTML = `
      <div class="progress-card client-access-card">
        <p class="eyebrow">Private client space</p>
        <h2>Progress is taking longer to load</h2>
        <p class="small">${escapeHTML(message)}</p>
        <div class="button-row">
          <button id="progressRetry" type="button" class="btn primary">Try Again</button>
          <a class="btn" href="queue.html">Back to Queue</a>
        </div>
      </div>`;
    $('progressRetry')?.addEventListener('click', () => location.reload());
  }

  function renderAccessPrompt(message = '') {
    const target = area();
    const id = commissionId();
    if (!target || !id) return;

    target.innerHTML = `
      <div class="progress-card client-access-card">
        <p class="eyebrow">Private client space</p>
        <h2>Enter your progress password</h2>
        <p class="small">Use the password the artist sent with this commission link.</p>
        <label class="field-label" for="progressPagePassword">Progress password</label>
        <input id="progressPagePassword" type="password" autocomplete="current-password" enterkeyhint="go" aria-describedby="progressAccessStatus">
        <div class="button-row">
          <button id="progressPageUnlock" type="button" class="btn primary">Open Progress</button>
          <a class="btn" href="queue.html">Back to Queue</a>
        </div>
        <p id="progressAccessStatus" class="small" role="status" aria-live="polite">${escapeHTML(message)}</p>
      </div>`;

    const input = $('progressPagePassword');
    const button = $('progressPageUnlock');
    button?.addEventListener('click', unlock);
    input?.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      unlock();
    });
    requestAnimationFrame(() => input?.focus());
  }

  function progressPercent(updates) {
    if (!Array.isArray(updates) || !updates.length) return 0;
    return Math.max(0, Math.min(100, Math.max(...updates.map(update => Number(update.progress_percent || 0)))));
  }

  function latestStatus(commission, updates) {
    if (Array.isArray(updates) && updates.length) {
      return updates[updates.length - 1]?.progress_stage || commission?.status || 'Waiting';
    }
    return commission?.status || 'Waiting';
  }

  function updatesHTML(updates) {
    if (!Array.isArray(updates) || !updates.length) {
      return '<p class="small">No progress updates yet.</p>';
    }

    return updates.map(update => `
      <article class="stage-card">
        <h3>${escapeHTML(update.title || update.progress_stage || 'Progress Update')} <span class="pill">${Number(update.progress_percent || 0)}%</span></h3>
        <p>${escapeHTML(update.description || '').replace(/\n/g, '<br>')}</p>
        ${update.image_url ? `<img src="${escapeHTML(update.image_url)}" alt="${escapeHTML(update.title || 'Progress image')}">` : ''}
        <p class="small">${update.created_at ? escapeHTML(new Date(update.created_at).toLocaleString()) : ''}</p>
      </article>`).join('');
  }

  function paymentStatusLabel(status) {
    const value = String(status || 'Not requested').trim();
    const labels = {
      'not requested': 'Not requested',
      'awaiting payment': 'Awaiting payment',
      'paid': 'Paid',
      'refunded': 'Refunded'
    };
    return labels[value.toLowerCase()] || value;
  }

  function formatPrice(price) {
    const raw = String(price || '').trim();
    if (!raw) return 'Price TBA';
    if (raw.startsWith('$')) return raw;
    return /^\d+(?:\.\d{1,2})?$/.test(raw.replace(/,/g, '')) ? `$${raw}` : raw;
  }

  async function paymentHTML(commission) {
    const status = String(commission?.payment_status || 'Not requested');
    const hasRequest = Boolean(
      String(commission?.price || '').trim() ||
      String(commission?.paypal_link || '').trim() ||
      status.toLowerCase() !== 'not requested'
    );

    if (!hasRequest) {
      return `
        <div class="payment-card muted-payment-card">
          <h2>Payment</h2>
          <p class="small">Payment has not been requested yet.</p>
        </div>`;
    }

    const normalized = status.toLowerCase();
    const isPaid = normalized === 'paid';
    const isRefunded = normalized === 'refunded';
    let paymentLink = safeHref(commission?.paypal_link);

    if (paymentLink === '#' && !isPaid && !isRefunded && typeof window.getSiteSettings === 'function') {
      try {
        const settings = await window.getSiteSettings();
        const username = String(settings?.paypal_username || '')
          .trim()
          .replace(/^https?:\/\/(www\.)?paypal\.me\//i, '')
          .replace(/^@/, '')
          .replace(/\s+/g, '');
        const amount = String(commission?.price || '').replace(/,/g, '').match(/\d+(?:\.\d{1,2})?/)?.[0] || '';
        if (username && amount) {
          paymentLink = `https://paypal.me/${encodeURIComponent(username)}/${encodeURIComponent(amount)}`;
        }
      } catch (error) {
        console.warn('Progress payment settings unavailable:', error);
      }
    }

    return `
      <div class="payment-card payment-${escapeHTML(normalized.replace(/\s+/g, '-'))}">
        <p class="eyebrow">Commission payment</p>
        <h2>${escapeHTML(formatPrice(commission?.price))}</h2>
        <p class="payment-status-pill">${escapeHTML(paymentStatusLabel(status))}</p>
        ${isPaid ? '<p class="small">Payment received. Thank you!</p>' : ''}
        ${isRefunded ? '<p class="small">This payment is marked as refunded.</p>' : ''}
        ${!isPaid && !isRefunded && paymentLink !== '#' ? `
          <div class="button-row payment-buttons">
            <a class="btn primary" href="${escapeHTML(paymentLink)}" target="_blank" rel="noopener">Pay with PayPal</a>
          </div>` : ''}
        ${!isPaid && !isRefunded && paymentLink === '#' ? '<p class="small">The payment link will appear here when it is ready.</p>' : ''}
      </div>`;
  }

  function chatMessagesHTML(messages) {
    if (!Array.isArray(messages) || !messages.length) {
      return '<p class="small">No messages yet. You can send the artist a message below.</p>';
    }

    return messages.map(message => {
      const sender = String(message.sender || '').toLowerCase();
      const fromClient = sender === 'client';
      return `
        <div class="chat-message ${fromClient ? 'client-message' : 'admin-message'}">
          <strong>${fromClient ? 'You' : 'Artist'}</strong>
          <p>${escapeHTML(message.message || '').replace(/\n/g, '<br>')}</p>
          <span class="small">${message.created_at ? escapeHTML(new Date(message.created_at).toLocaleString()) : ''}</span>
        </div>`;
    }).join('');
  }

  async function renderClientChatStandalone(id, options = {}) {
    const box = $('clientChatMessages');
    if (!box || String(id) !== String(commissionId())) return;

    const shouldFollow = box.scrollHeight - box.scrollTop - box.clientHeight < 100;
    try {
      const messages = await withTimeout(window.getChatMessages(id));
      const html = chatMessagesHTML(messages);
      if (box.dataset.lastHtml !== html) {
        box.innerHTML = html;
        box.dataset.lastHtml = html;
        if (shouldFollow || options.forceBottom) {
          requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
        }
      }
    } catch (error) {
      console.error('Client chat refresh failed:', error);
    }
  }

  async function sendClientMessage(id) {
    const input = $('clientChatInput');
    const button = $('clientChatSend');
    const status = $('clientChatSendStatus');
    const message = input?.value.trim() || '';
    if (!message || String(id) !== String(commissionId())) return;

    if (navigator.onLine === false) {
      if (status) status.textContent = 'You are offline. Your draft is still saved on this device.';
      return;
    }

    if (button) button.disabled = true;
    if (status) status.textContent = 'Sending…';

    try {
      const sent = await withTimeout(window.createChatMessage({
        commission_id: String(id),
        sender: 'client',
        message
      }));
      if (!sent) throw new Error('Message was not saved.');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (status) status.textContent = 'Sent.';
      await renderClientChatStandalone(id, { forceBottom: true });
    } catch (error) {
      console.error('Client message failed:', error);
      if (status) status.textContent = 'Message could not send. Your draft is still here.';
    } finally {
      if (button?.isConnected) button.disabled = false;
    }
  }

  async function renderWorkspace(commission, options = {}) {
    const target = area();
    if (!target || renderBusy) return;
    renderBusy = true;

    try {
      const [updates, payment] = await Promise.all([
        withTimeout(window.getProgressUpdates(commission.id)),
        withTimeout(paymentHTML(commission))
      ]);
      const progress = progressPercent(updates);
      const status = latestStatus(commission, updates);

      if (!options.sectionsOnly || !$('progressStageList') || !$('clientChatMessages')) {
        target.innerHTML = `
          <div class="progress-layout">
            <div class="progress-card">
              <p class="eyebrow">Private progress page</p>
              <h1 id="progressPageTitle" class="page-title">${escapeHTML(commission.display_name || commission.client_name || 'Private Client')} — ${escapeHTML(commission.commission_type || 'Commission')}</h1>
              <p id="progressPageMeta" class="small">Commission ID: ${escapeHTML(commission.id)} • Status: ${escapeHTML(status)}</p>
              <div id="progressPreviewBox">${commission.preview_image_url ? `<img class="preview progress-main-preview" src="${escapeHTML(commission.preview_image_url)}" alt="Commission preview">` : ''}</div>
              <div class="progress-bar"><div id="progressPageFill" class="progress-fill" style="width:${progress}%"></div></div>
              <p id="progressPagePercent" class="small">${progress}% complete</p>
              <button id="progressRefresh" class="btn" type="button">Refresh updates</button>
              <p id="progressRefreshStatus" class="small" role="status" aria-live="polite"></p>
              <div id="progressStageList" class="stage-list">${updatesHTML(updates)}</div>
            </div>
            <aside class="client-chat">
              <div id="clientPaymentArea">${payment}</div>
              <div class="payment-card client-chat-box">
                <h2>Messages</h2>
                <p class="small">Send questions, revision notes, or replies here.</p>
                <div id="clientChatMessages" class="chat-messages"></div>
                <textarea id="clientChatInput" placeholder="Type your message..." aria-label="Message to artist"></textarea>
                <button id="clientChatSend" class="btn primary" type="button">Send Message</button>
                <p id="clientChatSendStatus" class="small" role="status" aria-live="polite"></p>
              </div>
            </aside>
          </div>`;
        wireComposer(commission.id);
        $('progressRefresh')?.addEventListener('click', async () => {
          const button = $('progressRefresh');
          const status = $('progressRefreshStatus');
          if (button) button.disabled = true;
          if (status) status.textContent = 'Checking for updates…';
          const refreshed = await refreshProgressSectionsStandalone();
          if (status?.isConnected) status.textContent = refreshed ? 'Up to date.' : 'Could not refresh. Try again.';
          if (button?.isConnected) button.disabled = false;
        });
        const stageList = $('progressStageList');
        if (stageList) stageList.dataset.lastHtml = stageList.innerHTML;
        const paymentArea = $('clientPaymentArea');
        if (paymentArea) paymentArea.dataset.lastHtml = paymentArea.innerHTML;
      } else {
        const title = $('progressPageTitle');
        if (title) title.textContent = `${commission.display_name || commission.client_name || 'Private Client'} — ${commission.commission_type || 'Commission'}`;
        const meta = $('progressPageMeta');
        if (meta) meta.textContent = `Commission ID: ${commission.id} • Status: ${status}`;
        const fill = $('progressPageFill');
        if (fill) fill.style.width = `${progress}%`;
        const percent = $('progressPagePercent');
        if (percent) percent.textContent = `${progress}% complete`;

        const stageList = $('progressStageList');
        const stageHtml = updatesHTML(updates);
        if (stageList && stageList.dataset.lastHtml !== stageHtml) {
          stageList.innerHTML = stageHtml;
          stageList.dataset.lastHtml = stageHtml;
        }

        const paymentArea = $('clientPaymentArea');
        if (paymentArea && paymentArea.dataset.lastHtml !== payment) {
          paymentArea.innerHTML = payment;
          paymentArea.dataset.lastHtml = payment;
        }
      }

      lastCommission = commission;
      await renderClientChatStandalone(commission.id, { forceBottom: !options.sectionsOnly });
    } finally {
      renderBusy = false;
    }
  }

  async function loadAuthorizedCommission() {
    const id = commissionId();
    if (!id) return null;
    const commission = await withTimeout(window.getCommissionById(id));
    if (!commission || String(commission.status || '').toLowerCase() === 'archived') return null;
    return commission;
  }

  async function renderProgressPageStandalone() {
    const ready = await waitForApi();
    if (!ready) {
      renderLoadError('The progress tools did not finish loading. Try again to reconnect.');
      return;
    }

    const commission = await loadAuthorizedCommission();
    if (!commission || !hasAccessFor(commission)) {
      renderAccessPrompt(commission ? '' : 'This commission could not be found or is no longer active.');
      return;
    }

    await renderWorkspace(commission);
  }

  async function refreshProgressSectionsStandalone() {
    if (document.hidden || renderBusy) return false;
    const ready = await waitForApi(1500);
    if (!ready) return false;

    try {
      const commission = await loadAuthorizedCommission();
      if (!commission || !hasAccessFor(commission)) return false;
      await renderWorkspace(commission, { sectionsOnly: true });
      return true;
    } catch (error) {
      console.error('Progress refresh failed:', error);
      return false;
    }
  }

  async function unlock() {
    if (unlockBusy) return;
    const id = commissionId();
    const input = $('progressPagePassword');
    const button = $('progressPageUnlock');
    const status = $('progressAccessStatus');
    const password = input?.value.trim() || '';

    if (!id || !password) {
      if (status) status.textContent = 'Enter your progress password first.';
      return;
    }

    unlockBusy = true;
    if (button) button.disabled = true;
    if (status) status.textContent = 'Checking access…';

    try {
      const ready = await waitForApi();
      if (!ready) throw new Error('Progress API did not finish loading.');
      const commission = await withTimeout(window.getCommissionById(id));
      const archived = String(commission?.status || '').toLowerCase() === 'archived';

      if (!commission || archived || password !== String(commission.password || '')) {
        if (status) status.textContent = 'That password does not match this active commission.';
        return;
      }

      writeAccess(commission.id, password);
      if (status) status.textContent = 'Opening your progress…';
      await renderWorkspace(commission);
    } catch (error) {
      console.error('Progress access failed:', error);
      if (status) status.textContent = 'Progress could not connect. Check your connection and try again.';
    } finally {
      unlockBusy = false;
      if (button?.isConnected) button.disabled = false;
    }
  }

  async function boot(options = {}) {
    const target = area();
    if (!target) return;

    const id = commissionId();
    if (!id) {
      renderMissingLink();
      return;
    }

    // A direct private link can show its password form without any network
    // request. Only a returning client with saved access needs to load first.
    if (options.forcePrompt || String(readAccess().id || '') !== String(id)) {
      renderAccessPrompt();
      return;
    }

    target.innerHTML = '<div class="progress-card"><p class="small" role="status">Loading private progress…</p></div>';

    const ready = await waitForApi();
    if (!ready) {
      renderLoadError('The progress tools did not finish loading. Try again to reconnect.');
      return;
    }

    try {
      const commission = await loadAuthorizedCommission();
      if (!commission) {
        clearAccess();
        renderAccessPrompt('This commission could not be found or is no longer active.');
        return;
      }

      if (!hasAccessFor(commission)) {
        renderAccessPrompt();
        return;
      }

      await renderWorkspace(commission);
    } catch (error) {
      console.error('Progress boot failed:', error);
      renderLoadError();
    }
  }

  // On the private progress page, these page-specific implementations are the
  // canonical renderer. Existing autosync/realtime code can keep calling the
  // same public function names without rebuilding the whole page.
  window.renderProgressPage = renderProgressPageStandalone;
  window.refreshProgressSectionsOnly = refreshProgressSectionsStandalone;
  window.renderClientChat = renderClientChatStandalone;
  window.sendChatMessage = async function sendProgressChatMessage(id, sender) {
    if (String(sender || '').toLowerCase() !== 'client') return;
    await sendClientMessage(id);
  };

  function scheduleBoot() {
    clearTimeout(bootTimer);
    bootTimer = setTimeout(() => boot(), 120);
  }

  window.addEventListener('online', () => {
    refreshProgressSectionsStandalone().catch(() => {});
  });

  if (area()) {
    scheduleBoot();
  } else {
    document.addEventListener('DOMContentLoaded', scheduleBoot, { once: true });
  }

  // Keep the private workspace current without loading the legacy site bundle.
  setInterval(() => refreshProgressSectionsStandalone().catch(() => {}), 12000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshProgressSectionsStandalone().catch(() => {});
  });
})();

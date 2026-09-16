/* Private progress access + boot recovery.
   Keeps the existing Supabase progress/chat renderer, but makes copied client
   links usable directly and recovers if the legacy page initializer misses boot. */
(function initClientProgressAccess() {
  const onProgress = /(^|\/)progress\.html$/i.test(location.pathname) || location.pathname.endsWith('/progress.html');
  if (!onProgress) return;

  let bootTimer = null;
  let unlockBusy = false;

  function getArea() {
    return document.getElementById('progressArea');
  }

  function commissionId() {
    return new URLSearchParams(location.search).get('id');
  }

  function readAccess() {
    try {
      return JSON.parse(sessionStorage.getItem('progressAccess') || '{}');
    } catch (_) {
      return {};
    }
  }

  function hasAccessFor(id) {
    const access = readAccess();
    return Boolean(id && String(access.id || '') === String(id) && access.password);
  }

  function renderMissingLink() {
    const area = getArea();
    if (!area) return;
    area.innerHTML = `
      <div class="progress-card client-access-card">
        <p class="eyebrow">Private client space</p>
        <h2>Progress link needed</h2>
        <p class="small">This link is missing its commission ID. Open your client progress link again or return to the queue.</p>
        <a class="btn primary" href="queue.html">Back to Queue</a>
      </div>`;
  }

  function renderAccessPrompt(message = '') {
    const area = getArea();
    const id = commissionId();
    if (!area || !id) return;

    area.innerHTML = `
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
        <p id="progressAccessStatus" class="small" role="status" aria-live="polite">${message}</p>
      </div>`;

    const input = document.getElementById('progressPagePassword');
    const button = document.getElementById('progressPageUnlock');
    button?.addEventListener('click', unlock);
    input?.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      unlock();
    });
    requestAnimationFrame(() => input?.focus());
  }

  async function waitForProgressApi(timeoutMs = 5000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (typeof window.getCommissionById === 'function' && typeof window.renderProgressPage === 'function') return true;
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    return false;
  }

  async function unlock() {
    if (unlockBusy) return;
    const id = commissionId();
    const input = document.getElementById('progressPagePassword');
    const button = document.getElementById('progressPageUnlock');
    const status = document.getElementById('progressAccessStatus');
    const password = input?.value.trim() || '';
    if (!id || !password) {
      if (status) status.textContent = 'Enter your progress password first.';
      return;
    }

    unlockBusy = true;
    if (button) button.disabled = true;
    if (status) status.textContent = 'Checking access…';

    try {
      const ready = await waitForProgressApi();
      if (!ready) throw new Error('Progress tools did not finish loading.');
      const commission = await window.getCommissionById(id);
      const archived = String(commission?.status || '').toLowerCase() === 'archived';
      if (!commission || archived || password !== String(commission.password || '')) {
        if (status) status.textContent = 'That password does not match this active commission.';
        return;
      }

      sessionStorage.setItem('progressAccess', JSON.stringify({ id: String(commission.id), password }));
      if (status) status.textContent = 'Opening your progress…';
      await window.renderProgressPage();
    } catch (error) {
      console.error('Progress access failed:', error);
      if (status) status.textContent = 'Progress could not load yet. Check your connection and try again.';
    } finally {
      unlockBusy = false;
      if (button?.isConnected) button.disabled = false;
    }
  }

  async function boot() {
    const area = getArea();
    if (!area) return;
    const id = commissionId();
    if (!id) {
      renderMissingLink();
      return;
    }

    const ready = await waitForProgressApi();
    if (!ready) {
      renderAccessPrompt('Progress tools are taking longer than expected. You can still enter your password and retry.');
      return;
    }

    if (!hasAccessFor(id)) {
      renderAccessPrompt();
      return;
    }

    try {
      await window.renderProgressPage();
    } catch (error) {
      console.error('Progress boot recovery failed:', error);
      renderAccessPrompt('Progress could not load from the saved session. Enter your password to retry.');
    }
  }

  function scheduleBoot() {
    clearTimeout(bootTimer);
    // Let the existing initializer finish first; this module is the recovery/access owner.
    bootTimer = setTimeout(boot, 350);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleBoot, { once: true });
  } else {
    scheduleBoot();
  }
})();

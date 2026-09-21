/* Admin notification status: surfaces message-alert readiness without adding a new visual layer. */
(function initAdminNotificationStatus() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin || window.__adminNotificationStatusReady) return;
  window.__adminNotificationStatusReady = true;

  function prefs() {
    return window.adminAlertPreferences?.get?.() || {
      enabled: localStorage.getItem('adminMessageNotifications') === 'true',
      sound: localStorage.getItem('adminMessageSound') !== 'false',
      desktop: localStorage.getItem('adminDesktopNotifications') !== 'false',
      permission: ('Notification' in window) ? Notification.permission : 'unsupported'
    };
  }

  function ensurePanel() {
    const dash = document.getElementById('adminPage-dash');
    if (!dash) return null;
    let panel = document.getElementById('adminNotificationStatusPanel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'adminNotificationStatusPanel';
    panel.className = 'panel compact-panel';
    panel.innerHTML = `
      <div class="section-title">
        <div><p class="eyebrow">Client alerts</p><h3>Message notifications</h3></div>
        <span class="pill" id="adminAlertStatusPill">Checking…</span>
      </div>
      <p class="small" id="adminAlertStatusCopy">Checking this device’s message-alert settings…</p>
      <div class="button-row">
        <button type="button" class="btn" id="adminAlertStatusToggle">Turn alerts on</button>
        <button type="button" class="btn primary" id="adminAlertBrowserEnable" hidden>Enable browser notifications</button>
        <button type="button" class="btn" id="adminAlertStatusTest">Test chime</button>
      </div>
      <p class="small" id="adminAlertActionStatus" role="status" aria-live="polite"></p>`;
    const quick = dash.querySelector('.panel.compact-panel');
    if (quick) quick.insertAdjacentElement('afterend', panel);
    else dash.appendChild(panel);

    panel.querySelector('#adminAlertStatusToggle')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      const status = panel.querySelector('#adminAlertActionStatus');
      const current = prefs();
      if (button) button.disabled = true;
      if (status) status.textContent = current.enabled ? 'Turning alerts off…' : 'Turning alerts on…';
      try {
        if (window.adminAlertPreferences?.set) {
          await window.adminAlertPreferences.set({ enabled: !current.enabled });
        } else {
          document.getElementById('adminNotificationToggle')?.click();
        }
        if (status) status.textContent = prefs().enabled ? 'Message alerts are on for this device.' : 'Message alerts are off for this device.';
        render();
      } catch (error) {
        console.warn('Could not change admin alert preference', error);
        if (status) status.textContent = 'Alert settings could not be changed. Try again.';
      } finally {
        if (button?.isConnected) button.disabled = false;
      }
    });

    panel.querySelector('#adminAlertBrowserEnable')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      const status = panel.querySelector('#adminAlertActionStatus');
      if (button) button.disabled = true;
      if (status) status.textContent = 'Waiting for browser permission…';
      try {
        if (!('Notification' in window)) {
          if (status) status.textContent = 'This browser does not support browser notifications. Chime alerts can still be used.';
          return;
        }
        if (Notification.permission === 'denied') {
          if (status) status.textContent = 'Browser notifications are blocked in this browser’s site settings.';
          return;
        }
        if (window.adminAlertPreferences?.set) {
          await window.adminAlertPreferences.set({ enabled: true, desktop: true });
        } else if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        const next = prefs();
        if (status) {
          status.textContent = next.permission === 'granted'
            ? 'Browser notifications are enabled for new client messages.'
            : next.permission === 'denied'
              ? 'Browser notifications were blocked. Chime alerts can still be used.'
              : 'Browser notification permission was not enabled.';
        }
        render();
      } catch (error) {
        console.warn('Could not enable browser notifications', error);
        if (status) status.textContent = 'Browser notifications could not be enabled. Try again.';
      } finally {
        if (button?.isConnected) button.disabled = false;
      }
    });

    panel.querySelector('#adminAlertStatusTest')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      const status = panel.querySelector('#adminAlertActionStatus');
      if (button) button.disabled = true;
      if (status) status.textContent = 'Playing test chime…';
      try {
        const testChime = window.adminAlertPreferences?.testChime;
        if (typeof testChime !== 'function') {
          if (status) status.textContent = 'The chime is still loading. Try again in a moment.';
          return;
        }
        await Promise.resolve(testChime());
        if (status) status.textContent = 'Test chime played. If you did not hear it, check this device’s volume and browser audio settings.';
      } catch (error) {
        console.warn('Could not play admin notification chime', error);
        if (status) status.textContent = 'The test chime could not play. Check this device’s audio settings and try again.';
      } finally {
        if (button?.isConnected) button.disabled = false;
      }
    });
    return panel;
  }

  function render() {
    const panel = ensurePanel();
    if (!panel) return;
    const state = prefs();
    const pill = panel.querySelector('#adminAlertStatusPill');
    const copy = panel.querySelector('#adminAlertStatusCopy');
    const toggle = panel.querySelector('#adminAlertStatusToggle');
    const browserEnable = panel.querySelector('#adminAlertBrowserEnable');
    const test = panel.querySelector('#adminAlertStatusTest');
    if (toggle) {
      toggle.textContent = state.enabled ? 'Turn alerts off' : 'Turn alerts on';
      toggle.setAttribute('aria-pressed', String(Boolean(state.enabled)));
    }
    if (browserEnable) {
      browserEnable.hidden = !state.enabled || !navigator.onLine || state.permission !== 'default';
    }
    if (test) test.hidden = state.sound === false;

    if (!state.enabled) {
      if (pill) pill.textContent = 'Off';
      if (copy) copy.textContent = 'Message alerts are off on this device. Unread inbox badges still update while the Studio is open.';
      return;
    }
    if (!navigator.onLine) {
      if (pill) pill.textContent = 'Offline';
      if (copy) copy.textContent = 'Alert settings are saved, but new client messages cannot arrive until this device reconnects. The Studio will refresh unread messages when you are back online.';
      return;
    }
    if (state.desktop && state.permission === 'granted') {
      if (pill) pill.textContent = 'Ready';
      if (copy) copy.textContent = state.sound ? 'Browser notifications and the client-message chime are enabled.' : 'Browser notifications are enabled; the message chime is off.';
      return;
    }
    if (state.permission === 'denied') {
      if (pill) pill.textContent = 'Chime only';
      if (copy) copy.textContent = state.sound ? 'The message chime is enabled, but this browser has blocked notification pop-ups.' : 'Browser notification pop-ups are blocked and the message chime is off.';
      return;
    }
    if (state.permission === 'default') {
      if (pill) pill.textContent = state.sound ? 'Chime on' : 'Permission needed';
      if (copy) copy.textContent = state.sound ? 'The message chime is enabled. Enable browser notifications here if you also want pop-ups for new client messages.' : 'Enable browser notifications here to receive pop-ups for new client messages.';
      return;
    }
    if (pill) pill.textContent = state.sound ? 'Chime on' : 'Alerts on';
    if (copy) copy.textContent = state.sound ? 'The message chime is enabled. Browser notification pop-ups are not available on this device.' : 'Message alerts are enabled, but sound and browser pop-ups are not currently active.';
  }

  function start() {
    render();
    window.addEventListener('admin-alert-preferences-changed', render);
    window.addEventListener('admin-page-change', event => { if (event.detail?.page === 'dash') render(); });
    window.addEventListener('focus', render);
    window.addEventListener('online', render);
    window.addEventListener('offline', render);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

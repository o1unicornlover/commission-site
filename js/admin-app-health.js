/* Admin PWA health/status tools. Uses only existing style.css components. */
(function initAdminAppHealth() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin) return;

  function notificationState() {
    if (!("Notification" in window)) return 'Browser notifications unavailable';
    if (Notification.permission === 'granted') return 'Desktop notifications allowed';
    if (Notification.permission === 'denied') return 'Desktop notifications blocked';
    return 'Desktop notifications not enabled yet';
  }

  function pwaState() {
    const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone === true;
    return standalone ? 'Installed app' : 'Browser mode';
  }

  function connectionState() { return navigator.onLine ? 'Online' : 'Offline'; }

  function alertPreferences() {
    return window.adminAlertPreferences?.get?.() || {
      enabled: localStorage.getItem('adminMessageNotifications') === 'true',
      sound: localStorage.getItem('adminMessageSound') !== 'false',
      desktop: localStorage.getItem('adminDesktopNotifications') !== 'false'
    };
  }

  function preferenceLabel(name, enabled) {
    if (name === 'sound') return enabled ? '🔊 Chime on' : '🔇 Chime off';
    return enabled ? '🖥 Desktop alerts on' : '🖥 Desktop alerts off';
  }

  function permissionButtonLabel() {
    if (!("Notification" in window)) return 'Notifications unavailable';
    if (Notification.permission === 'granted') return 'Notifications enabled';
    if (Notification.permission === 'denied') return 'Notifications blocked';
    return 'Enable browser notifications';
  }

  async function requestNotificationPermission() {
    const status = document.getElementById('adminHealthPermissionStatus');
    if (!("Notification" in window)) {
      if (status) status.textContent = 'This browser does not support desktop notifications.';
      return;
    }
    if (Notification.permission === 'denied') {
      if (status) status.textContent = 'Notifications are blocked in browser or device settings.';
      updateStatus();
      return;
    }
    if (Notification.permission === 'granted') {
      if (status) status.textContent = 'Browser notifications are already enabled.';
      updateStatus();
      return;
    }
    if (status) status.textContent = 'Waiting for browser permission…';
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await window.adminAlertPreferences?.set?.({ desktop: true, enabled: true });
        if (status) status.textContent = 'Browser notifications enabled for this device.';
      } else if (status) {
        status.textContent = permission === 'denied' ? 'Notifications were blocked.' : 'Notification permission was not enabled.';
      }
    } catch (error) {
      console.warn('Notification permission request failed', error);
      if (status) status.textContent = 'Could not request notification permission in this browser.';
    }
    updateStatus();
  }

  function ensurePanel() {
    const dashboard = document.getElementById('adminPage-dash');
    if (!dashboard || document.getElementById('adminAppHealth')) return;
    const prefs = alertPreferences();
    const panel = document.createElement('section');
    panel.id = 'adminAppHealth';
    panel.className = 'panel compact-panel';
    panel.innerHTML = `
      <div class="section-title"><div><p class="eyebrow">Admin app</p><h3>App status</h3></div><span class="pill" id="adminHealthConnection">${connectionState()}</span></div>
      <div class="button-row" aria-label="Admin app status"><span class="pill" id="adminHealthInstall">${pwaState()}</span><span class="pill" id="adminHealthNotifications">${notificationState()}</span></div>
      <p class="small" id="adminHealthNote">Message alerts work best while this admin app is open. A future push-backend step is still needed for reliable alerts while the app is fully closed.</p>
      <div class="button-row" aria-label="Message alert preferences">
        <button type="button" class="btn" id="adminNotificationPermission">${permissionButtonLabel()}</button>
        <button type="button" class="btn" id="adminSoundPreference" aria-pressed="${prefs.sound ? 'true' : 'false'}">${preferenceLabel('sound', prefs.sound)}</button>
        <button type="button" class="btn" id="adminDesktopPreference" aria-pressed="${prefs.desktop ? 'true' : 'false'}">${preferenceLabel('desktop', prefs.desktop)}</button>
        <button type="button" class="btn" id="adminTestChime">Test chime</button>
      </div>
      <p id="adminHealthPermissionStatus" class="small" role="status" aria-live="polite"></p>
      <p class="small">Sound and desktop alerts are saved separately on this admin device. Unread inbox badges continue working even when either alert is muted.</p>
      <div class="button-row"><button type="button" class="btn" id="adminHealthInbox">Open Inbox</button><button type="button" class="btn" id="adminHealthRefresh">Refresh app data</button></div>`;
    const overview = document.getElementById('adminStudioOverview');
    if (overview) overview.insertAdjacentElement('beforebegin', panel); else dashboard.appendChild(panel);

    document.getElementById('adminNotificationPermission')?.addEventListener('click', requestNotificationPermission);
    document.getElementById('adminTestChime')?.addEventListener('click', playTestChime);
    document.getElementById('adminSoundPreference')?.addEventListener('click', async () => {
      const current = alertPreferences(); await window.adminAlertPreferences?.set?.({ sound: !current.sound, enabled: true }); updateStatus();
    });
    document.getElementById('adminDesktopPreference')?.addEventListener('click', async () => {
      const current = alertPreferences(); await window.adminAlertPreferences?.set?.({ desktop: !current.desktop, enabled: true }); updateStatus();
    });
    document.getElementById('adminHealthInbox')?.addEventListener('click', () => {
      const button = document.querySelector('[data-admin-page="inbox"]'); if (button) button.click(); else window.showAdminPage?.('inbox');
    });
    document.getElementById('adminHealthRefresh')?.addEventListener('click', async event => {
      const button = event.currentTarget, old = button.textContent; button.disabled = true; button.textContent = 'Refreshing…';
      try { await window.renderAdmin?.(); await window.renderAdminInbox?.(); updateStatus(); }
      finally { button.disabled = false; button.textContent = old; }
    });
    window.dispatchEvent(new CustomEvent('admin-app-health-ready'));
  }

  function playTestChime() {
    if (window.adminAlertPreferences?.testChime) { window.adminAlertPreferences.testChime(); return; }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return alert('Audio chimes are unavailable in this browser.');
    const ctx = new AudioContext(), now = ctx.currentTime;
    [659.25, 880].forEach((freq, index) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + index * 0.12); gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.12 + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.18);
      osc.connect(gain).connect(ctx.destination); osc.start(now + index * 0.12); osc.stop(now + index * 0.12 + 0.2);
    });
    setTimeout(() => ctx.close().catch(() => {}), 700);
  }

  function updateStatus() {
    const connection = document.getElementById('adminHealthConnection'), install = document.getElementById('adminHealthInstall'), notifications = document.getElementById('adminHealthNotifications');
    const sound = document.getElementById('adminSoundPreference'), desktop = document.getElementById('adminDesktopPreference'), permission = document.getElementById('adminNotificationPermission');
    const prefs = alertPreferences();
    if (connection) connection.textContent = connectionState(); if (install) install.textContent = pwaState(); if (notifications) notifications.textContent = notificationState();
    if (permission) { permission.textContent = permissionButtonLabel(); permission.disabled = !("Notification" in window) || Notification.permission !== 'default'; }
    if (sound) { sound.textContent = preferenceLabel('sound', prefs.sound); sound.setAttribute('aria-pressed', String(Boolean(prefs.sound))); }
    if (desktop) {
      desktop.textContent = preferenceLabel('desktop', prefs.desktop); desktop.setAttribute('aria-pressed', String(Boolean(prefs.desktop)));
      desktop.disabled = ("Notification" in window) && Notification.permission === 'denied' && !prefs.desktop; desktop.title = desktop.disabled ? 'Desktop notifications are blocked in this browser.' : '';
    }
  }

  function ensureAndUpdate() { ensurePanel(); updateStatus(); }
  window.addEventListener('online', updateStatus); window.addEventListener('offline', updateStatus); window.addEventListener('admin-alert-preferences-changed', updateStatus);
  window.addEventListener('admin-runtime-ready', ensureAndUpdate); window.addEventListener('admin-dashboard-core-refreshed', ensureAndUpdate);
  window.addEventListener('admin-page-change', event => { if (event.detail?.page === 'dash') ensureAndUpdate(); });
  document.addEventListener('visibilitychange', updateStatus); navigator.serviceWorker?.addEventListener('controllerchange', updateStatus);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureAndUpdate, { once: true }); else ensureAndUpdate();
})();
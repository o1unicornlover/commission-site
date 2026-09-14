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

  function connectionState() {
    return navigator.onLine ? 'Online' : 'Offline';
  }

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

  function ensurePanel() {
    const dashboard = document.getElementById('adminPage-dash');
    if (!dashboard || document.getElementById('adminAppHealth')) return;

    const prefs = alertPreferences();
    const panel = document.createElement('section');
    panel.id = 'adminAppHealth';
    panel.className = 'panel compact-panel';
    panel.innerHTML = `
      <div class="section-title">
        <div>
          <p class="eyebrow">Admin app</p>
          <h3>App status</h3>
        </div>
        <span class="pill" id="adminHealthConnection">${connectionState()}</span>
      </div>
      <div class="button-row" aria-label="Admin app status">
        <span class="pill" id="adminHealthInstall">${pwaState()}</span>
        <span class="pill" id="adminHealthNotifications">${notificationState()}</span>
      </div>
      <p class="small" id="adminHealthNote">Message alerts work best while this admin app is open. A future push-backend step is still needed for reliable alerts while the app is fully closed.</p>
      <div class="button-row" aria-label="Message alert preferences">
        <button type="button" class="btn" id="adminSoundPreference" aria-pressed="${prefs.sound ? 'true' : 'false'}">${preferenceLabel('sound', prefs.sound)}</button>
        <button type="button" class="btn" id="adminDesktopPreference" aria-pressed="${prefs.desktop ? 'true' : 'false'}">${preferenceLabel('desktop', prefs.desktop)}</button>
        <button type="button" class="btn" id="adminTestChime">Test chime</button>
      </div>
      <p class="small">Sound and desktop alerts are saved separately on this admin device. Unread inbox badges continue working even when either alert is muted.</p>
      <div class="button-row">
        <button type="button" class="btn" id="adminHealthInbox">Open Inbox</button>
        <button type="button" class="btn" id="adminHealthRefresh">Refresh app data</button>
      </div>`;

    const overview = document.getElementById('adminStudioOverview');
    if (overview) overview.insertAdjacentElement('beforebegin', panel);
    else dashboard.appendChild(panel);

    document.getElementById('adminTestChime')?.addEventListener('click', playTestChime);
    document.getElementById('adminSoundPreference')?.addEventListener('click', async () => {
      const current = alertPreferences();
      await window.adminAlertPreferences?.set?.({ sound: !current.sound, enabled: true });
      updateStatus();
    });
    document.getElementById('adminDesktopPreference')?.addEventListener('click', async () => {
      const current = alertPreferences();
      await window.adminAlertPreferences?.set?.({ desktop: !current.desktop, enabled: true });
      updateStatus();
    });
    document.getElementById('adminHealthInbox')?.addEventListener('click', () => {
      const button = document.querySelector('[data-admin-page="inbox"]');
      if (button) button.click();
      else window.showAdminPage?.('inbox');
    });
    document.getElementById('adminHealthRefresh')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      const old = button.textContent;
      button.disabled = true;
      button.textContent = 'Refreshing…';
      try {
        await window.renderAdmin?.();
        await window.renderAdminInbox?.();
        updateStatus();
      } finally {
        button.disabled = false;
        button.textContent = old;
      }
    });

    window.dispatchEvent(new CustomEvent('admin-app-health-ready'));
  }

  function playTestChime() {
    if (window.adminAlertPreferences?.testChime) {
      window.adminAlertPreferences.testChime();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return alert('Audio chimes are unavailable in this browser.');
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    [659.25, 880].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.12 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + index * 0.12);
      osc.stop(now + index * 0.12 + 0.2);
    });
    setTimeout(() => ctx.close().catch(() => {}), 700);
  }

  function updateStatus() {
    const connection = document.getElementById('adminHealthConnection');
    const install = document.getElementById('adminHealthInstall');
    const notifications = document.getElementById('adminHealthNotifications');
    const sound = document.getElementById('adminSoundPreference');
    const desktop = document.getElementById('adminDesktopPreference');
    const prefs = alertPreferences();
    if (connection) connection.textContent = connectionState();
    if (install) install.textContent = pwaState();
    if (notifications) notifications.textContent = notificationState();
    if (sound) {
      sound.textContent = preferenceLabel('sound', prefs.sound);
      sound.setAttribute('aria-pressed', String(Boolean(prefs.sound)));
    }
    if (desktop) {
      desktop.textContent = preferenceLabel('desktop', prefs.desktop);
      desktop.setAttribute('aria-pressed', String(Boolean(prefs.desktop)));
      desktop.disabled = ("Notification" in window) && Notification.permission === 'denied' && !prefs.desktop;
      desktop.title = desktop.disabled ? 'Desktop notifications are blocked in this browser.' : '';
    }
  }

  function ensureAndUpdate() {
    ensurePanel();
    updateStatus();
  }

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  window.addEventListener('admin-alert-preferences-changed', updateStatus);
  window.addEventListener('admin-runtime-ready', ensureAndUpdate);
  window.addEventListener('admin-dashboard-core-refreshed', ensureAndUpdate);
  window.addEventListener('admin-page-change', event => {
    if (event.detail?.page === 'dash') ensureAndUpdate();
  });
  document.addEventListener('visibilitychange', updateStatus);
  navigator.serviceWorker?.addEventListener('controllerchange', updateStatus);

  function start() {
    ensureAndUpdate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
/* Lightweight PWA update controls for the shared desktop/PWA admin dashboard. */
(function initAdminPwaUpdates() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin || !('serviceWorker' in navigator)) return;

  let checking = false;
  let repairing = false;

  function statusButton(id, text, resetText, delay = 2200) {
    const button = document.getElementById(id);
    if (!button) return;
    button.textContent = text;
    if (resetText) setTimeout(() => { button.textContent = resetText; }, delay);
  }

  function ensureButton() {
    const host = document.getElementById('adminAppHealth');
    if (!host) return;
    const rows = host.querySelectorAll('.button-row');
    const row = rows[rows.length - 1] || host;

    if (!document.getElementById('adminCheckUpdate')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn';
      button.id = 'adminCheckUpdate';
      button.textContent = 'Check for app update';
      button.addEventListener('click', checkForUpdate);
      row.appendChild(button);
    }

    if (!document.getElementById('adminRepairApp')) {
      const repair = document.createElement('button');
      repair.type = 'button';
      repair.className = 'btn';
      repair.id = 'adminRepairApp';
      repair.textContent = 'Repair cached app';
      repair.title = 'Clears only cached admin app files, then reloads the latest version. Your Supabase data and saved site settings are not deleted.';
      repair.addEventListener('click', repairCachedApp);
      row.appendChild(repair);
    }

    if (!document.getElementById('adminRepairNote')) {
      const note = document.createElement('p');
      note.id = 'adminRepairNote';
      note.className = 'small';
      note.textContent = 'If admin controls ever look stale or stop responding after an update, Repair cached app reloads only the admin shell. It does not delete commissions, messages, uploads, or site settings.';
      row.insertAdjacentElement('afterend', note);
    }
  }

  async function checkForUpdate() {
    if (checking || repairing) return;
    const button = document.getElementById('adminCheckUpdate');
    if (!navigator.onLine) {
      statusButton('adminCheckUpdate', 'Offline — try later', 'Check for app update');
      return;
    }

    checking = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'Checking…';
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        statusButton('adminCheckUpdate', 'App worker not ready', 'Check for app update');
        return;
      }

      await registration.update();
      if (registration.installing || registration.waiting) {
        if (button) button.textContent = 'Update found — reload';
        setTimeout(() => location.reload(), 500);
      } else {
        statusButton('adminCheckUpdate', 'App is up to date', 'Check for app update');
      }
    } catch (error) {
      console.warn('Admin PWA update check failed', error);
      statusButton('adminCheckUpdate', 'Update check failed', 'Check for app update');
    } finally {
      checking = false;
      if (button) button.disabled = false;
    }
  }

  async function repairCachedApp() {
    if (repairing || checking) return;
    const button = document.getElementById('adminRepairApp');
    if (!navigator.onLine) {
      statusButton('adminRepairApp', 'Online connection needed', 'Repair cached app');
      return;
    }

    repairing = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'Repairing…';
    }

    try {
      const keys = await caches.keys();
      const adminKeys = keys.filter(key => key.startsWith('commission-admin-'));
      await Promise.all(adminKeys.map(key => caches.delete(key)));

      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update?.();

      // Use a one-time query value so browser HTTP caches cannot hand the repair
      // reload an older admin.html. The service worker ignores the query for scope.
      const url = new URL(location.href);
      url.searchParams.set('app-repair', String(Date.now()));
      location.replace(url.toString());
    } catch (error) {
      console.warn('Admin app cache repair failed', error);
      statusButton('adminRepairApp', 'Repair failed', 'Repair cached app');
      repairing = false;
      if (button) button.disabled = false;
    }
  }

  const observer = new MutationObserver(ensureButton);

  function start() {
    ensureButton();
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
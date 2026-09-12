/* Lightweight PWA update controls for the shared desktop/PWA admin dashboard. */
(function initAdminPwaUpdates() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin || !('serviceWorker' in navigator)) return;

  let checking = false;

  function ensureButton() {
    const host = document.getElementById('adminAppHealth');
    if (!host || document.getElementById('adminCheckUpdate')) return;
    const rows = host.querySelectorAll('.button-row');
    const row = rows[rows.length - 1] || host;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.id = 'adminCheckUpdate';
    button.textContent = 'Check for app update';
    button.addEventListener('click', checkForUpdate);
    row.appendChild(button);
  }

  async function checkForUpdate() {
    if (checking) return;
    const button = document.getElementById('adminCheckUpdate');
    if (!navigator.onLine) {
      if (button) button.textContent = 'Offline — try later';
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
        if (button) button.textContent = 'App worker not ready';
        return;
      }

      await registration.update();
      if (registration.installing || registration.waiting) {
        if (button) button.textContent = 'Update found — reload';
        setTimeout(() => location.reload(), 500);
      } else if (button) {
        button.textContent = 'App is up to date';
        setTimeout(() => { button.textContent = 'Check for app update'; }, 2200);
      }
    } catch (error) {
      console.warn('Admin PWA update check failed', error);
      if (button) {
        button.textContent = 'Update check failed';
        setTimeout(() => { button.textContent = 'Check for app update'; }, 2200);
      }
    } finally {
      checking = false;
      if (button) button.disabled = false;
    }
  }

  const observer = new MutationObserver(ensureButton);
  document.addEventListener('DOMContentLoaded', () => {
    ensureButton();
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();

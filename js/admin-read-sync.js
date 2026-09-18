/* Keep admin unread badges consistent when read state changes in the inline inbox or another admin tab. */
(function initAdminReadSync() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin || window.__adminReadSyncReady) return;
  window.__adminReadSyncReady = true;

  const READ_KEY = 'adminConversationReadTimes';
  let refreshTimer = null;
  let refreshBusy = false;
  let refreshAgain = false;

  function inboxActive() {
    return document.getElementById('adminPage-inbox')?.classList.contains('active');
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshUnreadState, 80);
  }

  async function refreshUnreadState() {
    if (refreshBusy) {
      refreshAgain = true;
      return;
    }
    if (typeof window.renderAdminInbox !== 'function') return;

    refreshBusy = true;
    try {
      // renderAdminInbox owns the canonical unread calculation and updates the
      // sidebar label, document title, app badge, and inbox rows together.
      await window.renderAdminInbox(true);
      window.dispatchEvent(new CustomEvent('admin-unread-state-refreshed', {
        detail: { inboxActive: inboxActive() }
      }));
    } catch (error) {
      console.warn('Admin unread state refresh failed', error);
    } finally {
      refreshBusy = false;
      if (refreshAgain) {
        refreshAgain = false;
        scheduleRefresh();
      }
    }
  }

  window.addEventListener('admin-inbox-read-state-changed', scheduleRefresh);
  window.addEventListener('storage', event => {
    if (event.key === READ_KEY) scheduleRefresh();
  });

  // Installed PWAs and mobile browsers can restore a frozen page without
  // rerunning startup code. Reconcile unread state whenever the app becomes
  // usable again so badges and the title do not wait for the next poll.
  window.addEventListener('pageshow', event => {
    if (event.persisted) scheduleRefresh();
  });
  window.addEventListener('focus', scheduleRefresh);
  window.addEventListener('online', scheduleRefresh);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleRefresh();
  });
})();

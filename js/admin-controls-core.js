/* Core admin control wiring. Runs after lazy admin boot and does not depend on DOMContentLoaded. */
(function initAdminControlsCore() {
  if (window.__adminControlsCoreReady) return;
  window.__adminControlsCoreReady = true;

  function activateAdminPage(name) {
    if (!name) return;
    document.querySelectorAll('.admin-page').forEach(page => page.classList.remove('active'));
    const target = document.getElementById(`adminPage-${name}`);
    if (!target) return;
    target.classList.add('active');
    document.querySelectorAll('.admin-nav-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.adminPage === name);
    });
    try { window.updateAdminOverview?.(); } catch (error) { console.warn('Admin overview refresh failed', error); }
    if (name === 'dash') {
      queueMicrotask(() => window.refreshAdminDashboardCore?.());
      queueMicrotask(() => window.refreshAdminDashboard?.(true));
    }
    if (name === 'inbox') queueMicrotask(() => window.renderAdminInbox?.());
  }

  function activateSettingsTab(name) {
    if (!name) return;
    document.querySelectorAll('.settings-tab').forEach(button => {
      button.classList.toggle('active', button.dataset.settingsTab === name);
    });
    document.querySelectorAll('.settings-panel').forEach(panel => panel.classList.add('hidden'));
    document.getElementById(`settings-${name}`)?.classList.remove('hidden');
  }

  function handleCoreClick(event) {
    const pageButton = event.target.closest('[data-admin-page]');
    if (pageButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      activateAdminPage(pageButton.dataset.adminPage);
      return;
    }

    const jumpButton = event.target.closest('[data-admin-jump], [data-quick-page], [data-mobile-jump]');
    if (jumpButton) {
      const destination = jumpButton.dataset.adminJump || jumpButton.dataset.quickPage || jumpButton.dataset.mobileJump;
      if (!destination) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      activateAdminPage(destination);
      return;
    }

    const tabButton = event.target.closest('[data-settings-tab]');
    if (tabButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      activateSettingsTab(tabButton.dataset.settingsTab);
    }
  }

  // Capture phase intentionally wins over older duplicated inline/delegated navigation handlers.
  document.addEventListener('click', handleCoreClick, true);

  window.showAdminPage = activateAdminPage;
  window.showSettingsTab = activateSettingsTab;
  window.activateAdminPageCore = activateAdminPage;
  window.activateSettingsTabCore = activateSettingsTab;
})();
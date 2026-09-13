/* Admin navigation controls that initialize after lazy admin boot. */
(function initAdminControlsCore() {
  if (window.__adminControlsCoreReady) return;
  window.__adminControlsCoreReady = true;

  function loadAdminEnhancement(src, marker) {
    if (document.querySelector(`script[data-${marker}]`)) return;
    const script = document.createElement('script');
    script.src = `${src}?v=admin-core10`;
    script.async = false;
    script.dataset[marker] = 'true';
    script.onerror = () => {
      console.warn(`Admin enhancement failed to load: ${src}`);
      script.remove();
    };
    document.body.appendChild(script);
  }

  function showPage(name) {
    if (!name) return;
    document.querySelectorAll('.admin-page').forEach(page => page.classList.remove('active'));
    const target = document.getElementById(`adminPage-${name}`);
    if (!target) return;
    target.classList.add('active');
    document.querySelectorAll('.admin-nav-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.adminPage === name);
    });
    if (name === 'dash') {
      queueMicrotask(() => window.refreshAdminDashboardCore?.());
      queueMicrotask(() => window.refreshAdminDashboard?.(true));
    }
    if (name === 'inbox') queueMicrotask(() => window.renderAdminInbox?.(true));
    Promise.resolve(window.updateAdminOverview?.()).catch(() => {});
  }

  function showSettings(name) {
    if (!name) return;
    document.querySelectorAll('.settings-tab').forEach(button => {
      button.classList.toggle('active', button.dataset.settingsTab === name);
    });
    document.querySelectorAll('.settings-panel').forEach(panel => panel.classList.add('hidden'));
    document.getElementById(`settings-${name}`)?.classList.remove('hidden');
    if (name === 'appearance') queueMicrotask(() => window.refreshAdminCharacterCarousel?.());
  }

  document.addEventListener('click', event => {
    const pageButton = event.target.closest('[data-admin-page]');
    if (pageButton) {
      event.preventDefault();
      showPage(pageButton.dataset.adminPage);
      return;
    }
    const jumpButton = event.target.closest('[data-admin-jump], [data-quick-page], [data-mobile-jump]');
    if (jumpButton) {
      event.preventDefault();
      showPage(jumpButton.dataset.adminJump || jumpButton.dataset.quickPage || jumpButton.dataset.mobileJump);
      return;
    }
    const settingsButton = event.target.closest('[data-settings-tab]');
    if (settingsButton) {
      event.preventDefault();
      showSettings(settingsButton.dataset.settingsTab);
    }
  }, true);

  window.showAdminPage = showPage;
  window.showSettingsTab = showSettings;

  // Carousel management is deliberately separate from the retired Theme Studio.
  // It only edits carousel URLs/timing and never touches live palette values.
  loadAdminEnhancement('./js/admin-carousel-manager.js', 'adminCarouselManager');
})();

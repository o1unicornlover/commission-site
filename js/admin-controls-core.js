/* Canonical admin navigation controls for the lazy-loaded admin shell. */
(function initAdminControlsCore() {
  if (window.__adminControlsCoreReady) return;
  window.__adminControlsCoreReady = true;

  function loadAdminEnhancement(src, marker) {
    if (document.querySelector(`script[data-${marker}]`)) return;
    const script = document.createElement('script');
    script.src = `${src}?v=admin-core12`;
    script.async = false;
    script.dataset[marker] = 'true';
    script.onerror = () => {
      console.warn(`Admin enhancement failed to load: ${src}`);
      script.remove();
    };
    document.body.appendChild(script);
  }

  function retireInlineNavigationHandlers(root = document) {
    root.querySelectorAll('[data-admin-page][onclick], [data-admin-jump][onclick], [data-quick-page][onclick], [data-mobile-jump][onclick], [data-settings-tab][onclick]')
      .forEach(node => node.removeAttribute('onclick'));
  }

  function emitPageChange(name, source = 'navigation') {
    window.dispatchEvent(new CustomEvent('admin-page-change', {
      detail: { page: name, source }
    }));
  }

  function showPage(name, source = 'navigation') {
    if (!name) return false;
    const target = document.getElementById(`adminPage-${name}`);
    if (!target) return false;

    document.querySelectorAll('.admin-page').forEach(page => page.classList.remove('active'));
    target.classList.add('active');
    document.querySelectorAll('.admin-nav-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.adminPage === name);
    });

    emitPageChange(name, source);
    return true;
  }

  function showSettings(name) {
    if (!name) return false;
    const target = document.getElementById(`settings-${name}`);
    if (!target) return false;

    document.querySelectorAll('.settings-tab').forEach(button => {
      button.classList.toggle('active', button.dataset.settingsTab === name);
    });
    document.querySelectorAll('.settings-panel').forEach(panel => panel.classList.add('hidden'));
    target.classList.remove('hidden');

    window.dispatchEvent(new CustomEvent('admin-settings-change', { detail: { tab: name } }));
    return true;
  }

  document.addEventListener('click', event => {
    const pageButton = event.target.closest('[data-admin-page]');
    if (pageButton) {
      event.preventDefault();
      showPage(pageButton.dataset.adminPage, 'sidebar');
      return;
    }

    const jumpButton = event.target.closest('[data-admin-jump], [data-quick-page], [data-mobile-jump]');
    if (jumpButton) {
      const destination = jumpButton.dataset.adminJump || jumpButton.dataset.quickPage || jumpButton.dataset.mobileJump;
      if (!destination) return;
      event.preventDefault();
      showPage(destination, 'shortcut');
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

  window.addEventListener('admin-page-change', event => {
    const page = event.detail?.page;
    if (page === 'dash') {
      queueMicrotask(() => window.refreshAdminDashboardCore?.());
      queueMicrotask(() => window.refreshAdminDashboard?.(true));
    }
    if (page === 'inbox') queueMicrotask(() => window.renderAdminInbox?.(true));
    Promise.resolve(window.updateAdminOverview?.()).catch(() => {});
  });

  window.addEventListener('admin-settings-change', event => {
    if (event.detail?.tab === 'appearance') queueMicrotask(() => window.refreshAdminCharacterCarousel?.());
  });

  retireInlineNavigationHandlers();
  window.addEventListener('admin-runtime-ready', () => retireInlineNavigationHandlers(), { once: true });

  // Carousel management is deliberately separate from the retired Theme Studio.
  // It only edits carousel URLs/timing and never touches live palette values.
  loadAdminEnhancement('./js/admin-carousel-manager.js', 'adminCarouselManager');
})();

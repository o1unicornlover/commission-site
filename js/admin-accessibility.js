/* Admin accessibility + status announcements. Uses the existing visual system and does not add a theme layer. */
(function initAdminAccessibility() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin || window.__adminAccessibilityReady) return;
  window.__adminAccessibilityReady = true;

  let lastUnread = null;
  let lastPage = '';
  let queued = false;
  let observer = null;
  let titleObserver = null;

  const controlLabels = {
    clientName: 'Buyer display name', commissionType: 'Commission type', startingStage: 'Starting progress stage', privacy: 'Commission privacy',
    previewFile: 'Main commission board image', galleryFile: 'Gallery artwork image', settingTitle: 'Homepage title', settingSubtitle: 'Homepage subtitle',
    settingNote: 'Commission information note', defaultBannerFile: 'Default banner image', defaultDollFile: 'Default page doll image',
    backgroundFile: 'Website background image or pattern', navIconInput: 'Header icon or logo symbol', faviconFile: 'Favicon image',
    galleryBorderFile: 'Custom gallery image border or frame', galleryBorderEnabled: 'Enable custom gallery borders', socialLabel: 'Social link label',
    socialIcon: 'Social link icon', socialUrl: 'Social link URL or username', priceCategoryTitle: 'Pricing category title',
    priceCategoryNote: 'Pricing category note', priceCategorySelect: 'Pricing category for new item', priceItemName: 'Pricing item name',
    priceItemAmount: 'Pricing item amount', priceItemImage: 'Pricing item example image', newsDate: 'News date', newsText: 'News text',
    paymentPaypalUsername: 'PayPal username', paymentCurrency: 'Payment currency', tosTitle: 'Terms of Service section title', tosText: 'Terms of Service section text'
  };

  function ensureLiveRegion() {
    let region = document.getElementById('adminLiveRegion');
    if (region) return region;
    region = document.createElement('div');
    region.id = 'adminLiveRegion';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.style.position = 'fixed'; region.style.width = '1px'; region.style.height = '1px'; region.style.padding = '0';
    region.style.margin = '-1px'; region.style.overflow = 'hidden'; region.style.clip = 'rect(0, 0, 0, 0)';
    region.style.whiteSpace = 'nowrap'; region.style.border = '0';
    document.body.appendChild(region);
    return region;
  }

  function announce(message) {
    if (!message) return;
    const region = ensureLiveRegion();
    region.textContent = '';
    requestAnimationFrame(() => { region.textContent = message; });
  }

  function currentPage() { return document.querySelector('.admin-page.active'); }
  function pageName(page) {
    if (!page) return '';
    const heading = page.querySelector('h1, h2, h3');
    if (heading?.textContent?.trim()) return heading.textContent.trim();
    return String(page.id || '').replace(/^adminPage-/, '') || 'Admin';
  }

  function ensureAdminNavId(button) {
    if (button.id) return button.id;
    const key = String(button.dataset.adminPage || 'section').replace(/[^a-z0-9_-]/gi, '-');
    button.id = `admin-nav-${key}`;
    return button.id;
  }

  function ensureTabId(button) {
    if (button.id) return button.id;
    const key = String(button.dataset.settingsTab || 'setting').replace(/[^a-z0-9_-]/gi, '-');
    button.id = `settings-tab-${key}`;
    return button.id;
  }

  function syncNavigationState() {
    const active = currentPage();
    const activeKey = active?.id?.replace(/^adminPage-/, '') || '';
    document.querySelectorAll('[data-admin-page]').forEach(button => {
      const key = button.dataset.adminPage || '';
      const panel = document.getElementById(`adminPage-${key}`);
      const selected = key === activeKey;
      if (selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
      if (panel) {
        button.setAttribute('aria-controls', panel.id);
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-labelledby', ensureAdminNavId(button));
        panel.setAttribute('aria-hidden', selected ? 'false' : 'true');
      }
    });

    document.querySelectorAll('[data-settings-tab]').forEach(button => {
      const panel = document.getElementById(`settings-${button.dataset.settingsTab || ''}`);
      const selected = Boolean(panel && !panel.classList.contains('hidden'));
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.setAttribute('role', 'tab');
      button.tabIndex = selected ? 0 : -1;
      if (panel) {
        button.setAttribute('aria-controls', panel.id);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', button.id || ensureTabId(button));
        panel.setAttribute('aria-hidden', selected ? 'false' : 'true');
      }
    });
    document.querySelectorAll('.settings-menu').forEach(menu => menu.setAttribute('role', 'tablist'));

    const name = pageName(active);
    if (name && name !== lastPage) {
      if (lastPage) announce(`${name} section opened.`);
      lastPage = name;
    }
  }

  function wireSettingsKeyboardNavigation() {
    document.querySelectorAll('.settings-menu').forEach(menu => {
      if (menu.dataset.keyboardTabsReady === 'true') return;
      menu.dataset.keyboardTabsReady = 'true';
      menu.addEventListener('keydown', event => {
        const current = event.target.closest('[data-settings-tab]');
        if (!current || !menu.contains(current)) return;
        const tabs = [...menu.querySelectorAll('[data-settings-tab]:not([disabled])')];
        const index = tabs.indexOf(current);
        if (index < 0) return;
        let nextIndex = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        const next = tabs[nextIndex];
        next.focus();
        next.click();
      });
    });
  }

  function unreadFromTitle() {
    const match = document.title.match(/^\((\d+)\)/);
    return match ? Number(match[1]) : 0;
  }

  function syncUnreadAnnouncement() {
    const unread = unreadFromTitle();
    if (lastUnread === null) { lastUnread = unread; return; }
    if (unread === lastUnread) return;
    if (unread > lastUnread) {
      const added = unread - lastUnread;
      announce(`${added} new client message${added === 1 ? '' : 's'}. ${unread} unread total.`);
    } else if (unread === 0) announce('Inbox caught up. No unread client messages.');
    else announce(`${unread} unread client message${unread === 1 ? '' : 's'} remaining.`);
    lastUnread = unread;
  }

  function syncSemantics() {
    document.querySelectorAll('.admin-sidebar, .settings-menu').forEach(nav => {
      if (!nav.hasAttribute('aria-label')) nav.setAttribute('aria-label', nav.classList.contains('settings-menu') ? 'Site settings' : 'Admin sections');
    });

    Object.entries(controlLabels).forEach(([id, label]) => {
      const control = document.getElementById(id);
      if (control && !control.hasAttribute('aria-label') && !control.hasAttribute('aria-labelledby')) control.setAttribute('aria-label', label);
    });

    const inbox = document.getElementById('adminInboxList');
    if (inbox) {
      inbox.setAttribute('aria-label', 'Client conversations');
      inbox.setAttribute('aria-busy', inbox.textContent.includes('Loading conversations') ? 'true' : 'false');
    }
    const workspace = document.getElementById('adminInboxWorkspace');
    if (workspace && !workspace.hasAttribute('aria-label')) workspace.setAttribute('aria-label', 'Open client conversation');
    document.querySelectorAll('button[disabled]').forEach(button => button.setAttribute('aria-disabled', 'true'));
    document.querySelectorAll('button:not([disabled])[aria-disabled="true"]').forEach(button => button.removeAttribute('aria-disabled'));
  }

  function syncAll() {
    queued = false;
    ensureLiveRegion(); wireSettingsKeyboardNavigation(); syncNavigationState(); syncUnreadAnnouncement(); syncSemantics();
  }
  function queueSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(syncAll);
  }

  function startObserver() {
    if (!observer) {
      const root = document.getElementById('adminDashboard') || document.body;
      if (root) {
        observer = new MutationObserver(queueSync);
        observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'disabled'] });
      }
    }
    if (!titleObserver) {
      const title = document.querySelector('title');
      if (title) {
        titleObserver = new MutationObserver(queueSync);
        titleObserver.observe(title, { subtree: true, childList: true, characterData: true });
      }
    }
  }

  function initialize() {
    if (!document.body) return;
    syncAll();
    startObserver();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();

  window.addEventListener('online', () => announce('Back online. Admin data can sync again.'));
  window.addEventListener('offline', () => announce('You are offline. Cached admin tools remain available, but Supabase changes will not sync until the connection returns.'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) queueSync(); });
})();
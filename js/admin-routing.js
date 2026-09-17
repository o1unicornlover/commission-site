/* Admin app routing + commission message shortcuts. Keeps the single style.css visual system intact. */
(function initAdminRouting() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin || window.__adminRoutingReady) return;
  window.__adminRoutingReady = true;

  let routeTimer = null;
  let commissionListObserver = null;
  let titleObserver = null;
  let pendingCommissionRoute = '';
  let activePage = 'dash';
  const PENDING_ROUTE_KEY = 'adminPendingMessageRoute';
  const GENERIC_INBOX_ROUTE = 'inbox';
  const PAGE_HASHES = new Map([
    ['#home', 'dash'], ['#inbox', 'inbox'], ['#commissions', 'commissions'], ['#slots', 'slots'],
    ['#gallery', 'gallery'], ['#archives', 'archives'], ['#settings', 'settings']
  ]);
  const HASH_BY_PAGE = new Map(Array.from(PAGE_HASHES, ([hash, page]) => [page, hash]));
  const TITLE_BY_PAGE = new Map([
    ['dash', 'Home'], ['inbox', 'Inbox'], ['commissions', 'Commissions'], ['slots', 'Slots'],
    ['gallery', 'Gallery'], ['archives', 'Archives'], ['settings', 'Site Settings']
  ]);

  function normalizeCommissionId(value) {
    const id = String(value || '').trim();
    if (!id || id.length > 128 || /[\u0000-\u001f\u007f]/.test(id)) return '';
    return id;
  }

  function unreadTitlePrefix() {
    return document.title.match(/^\(\d+\)\s*/)?.[0] || '';
  }

  function syncDocumentTitle(page) {
    activePage = TITLE_BY_PAGE.has(String(page || '')) ? String(page) : activePage;
    const section = TITLE_BY_PAGE.get(activePage) || 'Admin';
    const nextTitle = `${unreadTitlePrefix()}${section} · Commission Studio`;
    if (document.title !== nextTitle) document.title = nextTitle;
  }

  function preserveWorkspaceTitleAcrossUnreadRefresh() {
    if (titleObserver || !document.querySelector('title')) return;
    titleObserver = new MutationObserver(() => {
      if (/^(?:\(\d+\)\s*)?Admin Dashboard$/.test(document.title)) syncDocumentTitle(activePage);
    });
    titleObserver.observe(document.querySelector('title'), { childList: true, characterData: true, subtree: true });
  }

  function decodeMessageHash() {
    if (!location.hash.startsWith('#message-')) return '';
    try { return normalizeCommissionId(decodeURIComponent(location.hash.slice('#message-'.length))); }
    catch { return normalizeCommissionId(location.hash.slice('#message-'.length)); }
  }

  function consumePreloginRoute() {
    const route = String(sessionStorage.getItem(PENDING_ROUTE_KEY) || '').trim();
    if (route) sessionStorage.removeItem(PENDING_ROUTE_KEY);
    if (route === GENERIC_INBOX_ROUTE) return route;
    return normalizeCommissionId(route);
  }

  function syncSectionHash(page) {
    syncDocumentTitle(page);
    const nextHash = HASH_BY_PAGE.get(String(page || ''));
    if (nextHash) {
      if (location.hash !== nextHash) history.replaceState(null, '', nextHash);
      return;
    }
    const currentHash = location.hash.toLowerCase();
    if (PAGE_HASHES.has(currentHash) || currentHash.startsWith('#message-')) history.replaceState(null, '', `${location.pathname}${location.search}`);
  }

  async function openInboxConversation(commissionId, options = {}) {
    const id = normalizeCommissionId(commissionId);
    syncDocumentTitle('inbox');
    window.showAdminPage?.('inbox', 'message-route');
    if (!id) return;
    clearTimeout(routeTimer);
    if (options.updateHash !== false) history.replaceState(null, '', `#message-${encodeURIComponent(id)}`);
    if (typeof window.openAdminInboxThread === 'function') {
      pendingCommissionRoute = '';
      await window.openAdminInboxThread(id);
      return;
    }
    let attempts = 0;
    const tryOpen = () => {
      attempts += 1;
      if (typeof window.openAdminInboxThread === 'function') {
        pendingCommissionRoute = '';
        window.openAdminInboxThread(id);
        return;
      }
      const escapedId = window.CSS?.escape ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&');
      const card = document.querySelector(`[data-inbox-commission="${escapedId}"]`);
      const openButton = card?.querySelector('[data-open-inbox-commission]');
      if (openButton) {
        pendingCommissionRoute = '';
        openButton.click();
        return;
      }
      if (attempts < 25) routeTimer = setTimeout(tryOpen, 120);
      else pendingCommissionRoute = id;
    };
    tryOpen();
  }

  function flushPendingCommissionRoute() {
    if (!pendingCommissionRoute) return;
    const id = pendingCommissionRoute;
    pendingCommissionRoute = '';
    openInboxConversation(id);
  }

  window.openAdminInboxConversation = openInboxConversation;

  function addCommissionQuickLinks() {
    const list = document.getElementById('adminList');
    if (!list) return;
    list.querySelectorAll('[data-commission-id]').forEach(card => {
      if (card.querySelector('[data-quick-open-inbox]')) return;
      const id = normalizeCommissionId(card.getAttribute('data-commission-id'));
      if (!id) return;
      const actionRow = card.querySelector('.button-row');
      if (!actionRow) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn';
      button.dataset.quickOpenInbox = id;
      button.textContent = 'Open Messages';
      button.addEventListener('click', event => { event.stopPropagation(); openInboxConversation(id); });
      actionRow.appendChild(button);
    });
  }

  function observeCommissionList() {
    const list = document.getElementById('adminList');
    if (!list || commissionListObserver) return;
    commissionListObserver = new MutationObserver(addCommissionQuickLinks);
    commissionListObserver.observe(list, { childList: true, subtree: true });
  }

  function routeFromHash() {
    const id = decodeMessageHash();
    if (id) {
      syncDocumentTitle('inbox');
      pendingCommissionRoute = id;
      setTimeout(() => openInboxConversation(id, { updateHash: false }), 700);
      return;
    }
    const page = PAGE_HASHES.get(location.hash.toLowerCase());
    if (page) {
      syncDocumentTitle(page);
      setTimeout(() => window.showAdminPage?.(page, 'pwa-route'), 100);
    } else syncDocumentTitle('dash');
  }

  function startRouting() {
    preserveWorkspaceTitleAcrossUnreadRefresh();
    addCommissionQuickLinks();
    observeCommissionList();
    const preloginRoute = consumePreloginRoute();
    if (preloginRoute === GENERIC_INBOX_ROUTE) {
      syncDocumentTitle('inbox');
      history.replaceState(null, '', '#inbox');
      setTimeout(() => window.showAdminPage?.('inbox', 'notification-route'), 100);
    } else if (preloginRoute) {
      syncDocumentTitle('inbox');
      pendingCommissionRoute = preloginRoute;
      setTimeout(() => openInboxConversation(preloginRoute), 100);
    } else routeFromHash();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startRouting, { once: true });
  else startRouting();

  window.addEventListener('admin-runtime-ready', () => {
    preserveWorkspaceTitleAcrossUnreadRefresh();
    addCommissionQuickLinks();
    observeCommissionList();
    flushPendingCommissionRoute();
    if (!pendingCommissionRoute) routeFromHash();
  });
  window.addEventListener('admin-page-change', event => {
    const page = event.detail?.page;
    syncDocumentTitle(page);
    if (page === 'commissions') queueMicrotask(addCommissionQuickLinks);
    if (page === 'inbox') queueMicrotask(flushPendingCommissionRoute);
    if (!pendingCommissionRoute && event.detail?.source !== 'message-route') syncSectionHash(page);
  });
  window.addEventListener('hashchange', routeFromHash);

  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type !== 'open-inbox-commission') return;
    const id = normalizeCommissionId(event.data?.commissionId);
    if (id) {
      pendingCommissionRoute = id;
      openInboxConversation(id);
    } else {
      syncDocumentTitle('inbox');
      window.showAdminPage?.('inbox', 'notification-route');
      if (location.hash !== '#inbox') history.replaceState(null, '', '#inbox');
    }
  });
})();
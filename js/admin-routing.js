/* Admin app routing + commission message shortcuts. Keeps the single style.css visual system intact. */
(function initAdminRouting() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin || window.__adminRoutingReady) return;
  window.__adminRoutingReady = true;

  let routeTimer = null;
  let commissionListObserver = null;
  let pendingCommissionRoute = '';
  const PENDING_ROUTE_KEY = 'adminPendingMessageRoute';
  const PAGE_HASHES = new Map([
    ['#home', 'overview'], ['#inbox', 'inbox'], ['#commissions', 'commissions'], ['#slots', 'slots'],
    ['#gallery', 'gallery'], ['#archives', 'archives'], ['#settings', 'settings']
  ]);
  const HASH_BY_PAGE = new Map(Array.from(PAGE_HASHES, ([hash, page]) => [page, hash]));
  const TITLE_BY_PAGE = new Map([
    ['overview', 'Home'], ['inbox', 'Inbox'], ['commissions', 'Commissions'], ['slots', 'Slots'],
    ['gallery', 'Gallery'], ['archives', 'Archives'], ['settings', 'Site Settings']
  ]);

  function unreadTitlePrefix() {
    return document.title.match(/^\(\d+\)\s*/)?.[0] || '';
  }

  function syncDocumentTitle(page) {
    const section = TITLE_BY_PAGE.get(String(page || '')) || 'Admin';
    document.title = `${unreadTitlePrefix()}${section} · Commission Studio`;
  }

  function decodeMessageHash() {
    if (!location.hash.startsWith('#message-')) return '';
    try { return decodeURIComponent(location.hash.slice('#message-'.length)); }
    catch { return location.hash.slice('#message-'.length); }
  }

  function consumePreloginRoute() {
    const id = String(sessionStorage.getItem(PENDING_ROUTE_KEY) || '').trim();
    if (id) sessionStorage.removeItem(PENDING_ROUTE_KEY);
    return id;
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
    const id = String(commissionId || '').trim();
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
      const id = card.getAttribute('data-commission-id');
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
    } else syncDocumentTitle('overview');
  }

  function startRouting() {
    addCommissionQuickLinks();
    observeCommissionList();
    const preloginId = consumePreloginRoute();
    if (preloginId) {
      syncDocumentTitle('inbox');
      pendingCommissionRoute = preloginId;
      setTimeout(() => openInboxConversation(preloginId), 100);
    } else routeFromHash();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startRouting, { once: true });
  else startRouting();

  window.addEventListener('admin-runtime-ready', () => {
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
    const id = String(event.data?.commissionId || '').trim();
    if (id) {
      pendingCommissionRoute = id;
      openInboxConversation(id);
    } else {
      syncDocumentTitle('inbox');
      window.showAdminPage?.('inbox', 'notification-route');
    }
  });
})();
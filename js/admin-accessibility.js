/* Admin accessibility + status announcements. Uses the existing visual system and does not add a theme layer. */
(function initAdminAccessibility() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin) return;

  let lastUnread = null;
  let lastPage = '';
  let queued = false;

  function ensureLiveRegion() {
    let region = document.getElementById('adminLiveRegion');
    if (region) return region;

    region = document.createElement('div');
    region.id = 'adminLiveRegion';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.style.position = 'fixed';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.padding = '0';
    region.style.margin = '-1px';
    region.style.overflow = 'hidden';
    region.style.clip = 'rect(0, 0, 0, 0)';
    region.style.whiteSpace = 'nowrap';
    region.style.border = '0';
    document.body.appendChild(region);
    return region;
  }

  function announce(message) {
    if (!message) return;
    const region = ensureLiveRegion();
    region.textContent = '';
    requestAnimationFrame(() => { region.textContent = message; });
  }

  function currentPage() {
    return document.querySelector('.admin-page.active');
  }

  function pageName(page) {
    if (!page) return '';
    const heading = page.querySelector('h1, h2, h3');
    if (heading?.textContent?.trim()) return heading.textContent.trim();
    return String(page.id || '').replace(/^adminPage-/, '') || 'Admin';
  }

  function syncNavigationState() {
    const active = currentPage();
    const activeKey = active?.id?.replace(/^adminPage-/, '') || '';
    document.querySelectorAll('[data-admin-page]').forEach(button => {
      const selected = button.dataset.adminPage === activeKey;
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });

    const name = pageName(active);
    if (name && name !== lastPage) {
      if (lastPage) announce(`${name} section opened.`);
      lastPage = name;
    }
  }

  function unreadFromTitle() {
    const match = document.title.match(/^\((\d+)\)/);
    return match ? Number(match[1]) : 0;
  }

  function syncUnreadAnnouncement() {
    const unread = unreadFromTitle();
    if (lastUnread === null) {
      lastUnread = unread;
      return;
    }
    if (unread === lastUnread) return;

    if (unread > lastUnread) {
      const added = unread - lastUnread;
      announce(`${added} new client message${added === 1 ? '' : 's'}. ${unread} unread total.`);
    } else if (unread === 0) {
      announce('Inbox caught up. No unread client messages.');
    } else {
      announce(`${unread} unread client message${unread === 1 ? '' : 's'} remaining.`);
    }
    lastUnread = unread;
  }

  function syncSemantics() {
    document.querySelectorAll('.admin-sidebar, .settings-menu').forEach(nav => {
      if (!nav.hasAttribute('aria-label')) {
        nav.setAttribute('aria-label', nav.classList.contains('settings-menu') ? 'Site settings' : 'Admin sections');
      }
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
    ensureLiveRegion();
    syncNavigationState();
    syncUnreadAnnouncement();
    syncSemantics();
  }

  function queueSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(syncAll);
  }

  const observer = new MutationObserver(queueSync);

  document.addEventListener('DOMContentLoaded', () => {
    syncAll();
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'disabled']
    });
  });

  window.addEventListener('online', () => announce('Back online. Admin data can sync again.'));
  window.addEventListener('offline', () => announce('You are offline. Cached admin tools remain available, but Supabase changes will not sync until the connection returns.'));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) queueSync();
  });
})();

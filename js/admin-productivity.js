/* Admin productivity helpers. Uses existing style.css components only. */
(function initAdminProductivity() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin) return;

  const LAST_PAGE_KEY = 'adminLastPage';
  let lastAppliedQuery = '';

  function clickPage(page) {
    const button = document.querySelector(`[data-admin-page="${CSS.escape(page)}"]`);
    if (button) button.click();
    else window.showAdminPage?.(page);
  }

  function installPageMemory() {
    if (window.__adminPageMemoryInstalled) return;
    const original = window.showAdminPage;
    if (typeof original !== 'function') return;
    window.__adminPageMemoryInstalled = true;
    window.showAdminPage = function rememberedAdminPage(page, ...args) {
      if (page) localStorage.setItem(LAST_PAGE_KEY, String(page));
      return original.call(this, page, ...args);
    };
  }

  function restoreLastPage() {
    if (location.hash.startsWith('#message-')) return;
    const page = localStorage.getItem(LAST_PAGE_KEY);
    if (!page || page === 'dash') return;
    setTimeout(() => clickPage(page), 450);
  }

  function injectQuickNav() {
    const dashboard = document.getElementById('adminDashboard');
    const content = document.querySelector('.admin-content');
    if (!dashboard || !content || document.getElementById('adminQuickNav')) return;

    const bar = document.createElement('div');
    bar.id = 'adminQuickNav';
    bar.className = 'button-row';
    bar.setAttribute('aria-label', 'Admin quick navigation');
    bar.innerHTML = `
      <button type="button" class="btn" data-quick-page="dash">⌂ Dashboard</button>
      <button type="button" class="btn" data-quick-page="inbox">✉ Inbox</button>
      <button type="button" class="btn" data-quick-page="commissions">✦ Commissions</button>
      <button type="button" class="btn" data-quick-page="settings">⚙ Settings</button>
    `;
    bar.querySelectorAll('[data-quick-page]').forEach(button => {
      button.addEventListener('click', () => clickPage(button.dataset.quickPage));
    });
    content.prepend(bar);
  }

  function matchesQuery(node, query) {
    if (!query) return true;
    return String(node?.textContent || '').toLowerCase().includes(query);
  }

  function filterCommissionCards(query) {
    const list = document.getElementById('adminList');
    if (!list) return;
    list.querySelectorAll('[data-commission-id], .admin-commission-card, .commission-admin-card, article').forEach(card => {
      if (!card.closest('#adminList')) return;
      card.hidden = !matchesQuery(card, query);
    });
  }

  function filterInboxCards(query) {
    const list = document.getElementById('adminInboxList');
    if (!list) return;
    list.querySelectorAll('[data-inbox-commission]').forEach(card => {
      card.hidden = !matchesQuery(card, query);
    });
  }

  function applySearch(query) {
    const clean = String(query || '').trim().toLowerCase();
    lastAppliedQuery = clean;
    filterCommissionCards(clean);
    filterInboxCards(clean);
  }

  function injectSearch() {
    const dashboard = document.getElementById('adminDashboard');
    if (!dashboard || document.getElementById('adminGlobalSearch')) return;

    const target = document.getElementById('adminQuickNav') || document.querySelector('.admin-content');
    if (!target) return;
    const wrap = document.createElement('div');
    wrap.className = 'form-grid';
    wrap.id = 'adminSearchBar';
    wrap.innerHTML = `
      <input id="adminGlobalSearch" type="search" autocomplete="off" placeholder="Search clients, commission types, statuses, or messages…" aria-label="Search admin data">
      <button type="button" class="btn" id="adminSearchClear">Clear search</button>
    `;
    if (target.id === 'adminQuickNav') target.insertAdjacentElement('afterend', wrap);
    else target.prepend(wrap);

    const input = document.getElementById('adminGlobalSearch');
    input?.addEventListener('input', () => applySearch(input.value));
    document.getElementById('adminSearchClear')?.addEventListener('click', () => {
      if (input) input.value = '';
      applySearch('');
      input?.focus();
    });
  }

  function installShortcuts() {
    if (window.__adminProductivityShortcutsInstalled) return;
    window.__adminProductivityShortcutsInstalled = true;
    document.addEventListener('keydown', event => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const editing = tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('adminGlobalSearch')?.focus();
        return;
      }
      if (!editing && event.key === '/') {
        event.preventDefault();
        document.getElementById('adminGlobalSearch')?.focus();
        return;
      }
      if (!editing && event.key.toLowerCase() === 'i') clickPage('inbox');
      if (!editing && event.key.toLowerCase() === 'c') clickPage('commissions');
      if (!editing && event.key.toLowerCase() === 'd') clickPage('dash');
    });
  }

  function addSearchHints() {
    const input = document.getElementById('adminGlobalSearch');
    if (input && !input.dataset.hintReady) {
      input.dataset.hintReady = '1';
      input.title = 'Shortcut: Ctrl/⌘ + K or /';
    }
  }

  function observeDynamicLists() {
    const observer = new MutationObserver(() => {
      injectQuickNav();
      injectSearch();
      addSearchHints();
      if (lastAppliedQuery) applySearch(lastAppliedQuery);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    installPageMemory();
    injectQuickNav();
    injectSearch();
    addSearchHints();
    installShortcuts();
    observeDynamicLists();
    restoreLastPage();
  });
})();

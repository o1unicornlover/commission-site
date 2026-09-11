/* Admin inbox quality-of-life tools. Uses the existing style.css components only. */
(function initAdminInboxTools() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin) return;

  const DRAFT_KEY = 'adminInboxReplyDrafts';
  let activeFilter = 'all';
  let observer = null;
  let decorateQueued = false;

  function loadDrafts() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function inboxCards() {
    return Array.from(document.querySelectorAll('#adminInboxList [data-inbox-commission]'));
  }

  function cardId(card) {
    return String(card?.dataset?.inboxCommission || '');
  }

  function cardHasUnread(card) {
    return /\bunread\b/i.test(String(card?.textContent || ''));
  }

  function cardHasDraft(card, drafts = loadDrafts()) {
    return Boolean(String(drafts[cardId(card)] || '').trim());
  }

  function ensureDraftBadge(card, drafts) {
    if (!card) return;
    const hasDraft = cardHasDraft(card, drafts);
    let badge = card.querySelector('[data-admin-draft-badge]');
    if (!hasDraft) {
      badge?.remove();
      return;
    }
    if (badge) return;

    badge = document.createElement('span');
    badge.className = 'pill';
    badge.dataset.adminDraftBadge = 'true';
    badge.textContent = 'Draft saved';
    const title = card.querySelector('.section-title');
    const buttonRow = card.querySelector('.button-row');
    if (title) title.appendChild(badge);
    else if (buttonRow) buttonRow.insertAdjacentElement('beforebegin', badge);
    else card.prepend(badge);
  }

  function shouldShow(card, drafts) {
    if (activeFilter === 'unread') return cardHasUnread(card);
    if (activeFilter === 'drafts') return cardHasDraft(card, drafts);
    return true;
  }

  function updateFilterButtons(counts) {
    document.querySelectorAll('[data-inbox-filter]').forEach(button => {
      const filter = button.dataset.inboxFilter;
      const base = filter === 'unread' ? 'Unread' : filter === 'drafts' ? 'Drafts' : 'All';
      const count = filter === 'unread' ? counts.unread : filter === 'drafts' ? counts.drafts : counts.all;
      button.textContent = `${base} (${count})`;
      button.classList.toggle('primary', filter === activeFilter);
      button.setAttribute('aria-pressed', String(filter === activeFilter));
    });
  }

  function ensureFilterBar() {
    const page = document.getElementById('adminPage-inbox');
    const list = document.getElementById('adminInboxList');
    if (!page || !list || document.getElementById('adminInboxFilters')) return;

    const bar = document.createElement('div');
    bar.id = 'adminInboxFilters';
    bar.className = 'button-row';
    bar.setAttribute('aria-label', 'Filter inbox conversations');
    bar.innerHTML = `
      <button type="button" class="btn primary" data-inbox-filter="all" aria-pressed="true">All</button>
      <button type="button" class="btn" data-inbox-filter="unread" aria-pressed="false">Unread</button>
      <button type="button" class="btn" data-inbox-filter="drafts" aria-pressed="false">Drafts</button>`;
    list.insertAdjacentElement('beforebegin', bar);

    bar.querySelectorAll('[data-inbox-filter]').forEach(button => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.inboxFilter || 'all';
        decorateInbox();
      });
    });
  }

  function ensureEmptyState(visibleCount) {
    const list = document.getElementById('adminInboxList');
    if (!list) return;
    let empty = document.getElementById('adminInboxFilterEmpty');
    if (visibleCount > 0 || activeFilter === 'all') {
      empty?.remove();
      return;
    }
    if (!empty) {
      empty = document.createElement('article');
      empty.id = 'adminInboxFilterEmpty';
      empty.className = 'info-card';
      list.insertAdjacentElement('afterend', empty);
    }
    empty.innerHTML = activeFilter === 'drafts'
      ? '<h3>No saved drafts</h3><p class="small">Replies you start and leave unfinished will appear here.</p>'
      : '<h3>Inbox caught up</h3><p class="small">There are no unread client conversations right now.</p>';
  }

  function decorateInbox() {
    ensureFilterBar();
    const cards = inboxCards();
    const drafts = loadDrafts();
    let unread = 0;
    let draftCount = 0;
    let visible = 0;

    cards.forEach(card => {
      if (cardHasUnread(card)) unread += 1;
      if (cardHasDraft(card, drafts)) draftCount += 1;
      ensureDraftBadge(card, drafts);
      const show = shouldShow(card, drafts);
      card.hidden = !show;
      if (show) visible += 1;
    });

    updateFilterButtons({ all: cards.length, unread, drafts: draftCount });
    ensureEmptyState(visible);
  }

  function queueDecorate() {
    if (decorateQueued) return;
    decorateQueued = true;
    requestAnimationFrame(() => {
      decorateQueued = false;
      decorateInbox();
    });
  }

  function observeInbox() {
    if (observer) return;
    observer = new MutationObserver(queueDecorate);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      decorateInbox();
      observeInbox();
    }, 1100);
  });

  window.addEventListener('storage', event => {
    if (event.key === DRAFT_KEY) queueDecorate();
  });
  window.addEventListener('admin-inbox-read-state-changed', queueDecorate);
})();

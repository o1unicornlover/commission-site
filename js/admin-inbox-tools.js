/* Admin inbox quality-of-life tools. Uses the existing style.css components only. */
(function initAdminInboxTools() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin) return;

  const DRAFT_KEY = 'adminInboxReplyDrafts';
  const REPLY_CACHE_MS = 15000;
  let activeFilter = 'all';
  let observer = null;
  let decorateQueued = false;
  let replyStateCache = new Map();
  let replyStateFetchedAt = 0;
  let replyStatePromise = null;
  let initialized = false;

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

  function cardNeedsReply(card) {
    return replyStateCache.get(cardId(card)) === true;
  }

  function inboxIsActive() {
    return document.getElementById('adminPage-inbox')?.classList.contains('active');
  }

  function messageTime(row) {
    const time = new Date(row?.created_at || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function latestMessage(messages) {
    return (Array.isArray(messages) ? messages : []).reduce((latest, message) => {
      if (!latest) return message;
      return messageTime(message) >= messageTime(latest) ? message : latest;
    }, null);
  }

  async function refreshReplyStates(force = false) {
    const cards = inboxCards();
    if (!cards.length || !window.getChatMessages) return replyStateCache;
    const fresh = Date.now() - replyStateFetchedAt < REPLY_CACHE_MS;
    if (!force && fresh) return replyStateCache;
    if (replyStatePromise) return replyStatePromise;

    replyStatePromise = Promise.all(cards.map(async card => {
      const id = cardId(card);
      if (!id) return;
      try {
        const messages = await window.getChatMessages(id) || [];
        const latest = latestMessage(messages);
        replyStateCache.set(id, String(latest?.sender || '').toLowerCase() === 'client');
      } catch (error) {
        console.warn('Could not determine inbox reply state', id, error);
      }
    })).then(() => {
      replyStateFetchedAt = Date.now();
      return replyStateCache;
    }).finally(() => {
      replyStatePromise = null;
    });

    return replyStatePromise;
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

  function ensureReplyBadge(card) {
    if (!card) return;
    const needsReply = cardNeedsReply(card);
    let badge = card.querySelector('[data-admin-reply-badge]');
    if (!needsReply) {
      badge?.remove();
      return;
    }
    if (badge) return;

    badge = document.createElement('span');
    badge.className = 'pill';
    badge.dataset.adminReplyBadge = 'true';
    badge.textContent = 'Needs reply';
    const title = card.querySelector('.section-title');
    const buttonRow = card.querySelector('.button-row');
    if (title) title.appendChild(badge);
    else if (buttonRow) buttonRow.insertAdjacentElement('beforebegin', badge);
    else card.prepend(badge);
  }

  function shouldShow(card, drafts) {
    if (activeFilter === 'unread') return cardHasUnread(card);
    if (activeFilter === 'reply') return cardNeedsReply(card);
    if (activeFilter === 'drafts') return cardHasDraft(card, drafts);
    return true;
  }

  function updateFilterButtons(counts) {
    document.querySelectorAll('[data-inbox-filter]').forEach(button => {
      const filter = button.dataset.inboxFilter;
      const base = filter === 'unread' ? 'Unread' : filter === 'reply' ? 'Needs reply' : filter === 'drafts' ? 'Drafts' : 'All';
      const count = filter === 'unread' ? counts.unread : filter === 'reply' ? counts.reply : filter === 'drafts' ? counts.drafts : counts.all;
      const nextLabel = `${base} (${count})`;
      if (button.textContent !== nextLabel) button.textContent = nextLabel;
      button.classList.toggle('primary', filter === activeFilter);
      const pressed = String(filter === activeFilter);
      if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
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
      <button type="button" class="btn" data-inbox-filter="reply" aria-pressed="false">Needs reply</button>
      <button type="button" class="btn" data-inbox-filter="drafts" aria-pressed="false">Drafts</button>`;
    list.insertAdjacentElement('beforebegin', bar);

    bar.querySelectorAll('[data-inbox-filter]').forEach(button => {
      button.addEventListener('click', async () => {
        activeFilter = button.dataset.inboxFilter || 'all';
        if (activeFilter === 'reply') await refreshReplyStates(true);
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
    const nextHtml = activeFilter === 'drafts'
      ? '<h3>No saved drafts</h3><p class="small">Replies you start and leave unfinished will appear here.</p>'
      : activeFilter === 'reply'
        ? '<h3>No clients waiting</h3><p class="small">Every visible conversation has an artist reply as its latest message.</p>'
        : '<h3>Inbox caught up</h3><p class="small">There are no unread client conversations right now.</p>';
    if (!empty) {
      empty = document.createElement('article');
      empty.id = 'adminInboxFilterEmpty';
      empty.className = 'info-card';
      list.insertAdjacentElement('afterend', empty);
    }
    if (empty.innerHTML !== nextHtml) empty.innerHTML = nextHtml;
  }

  function decorateInbox() {
    ensureFilterBar();
    const cards = inboxCards();
    const drafts = loadDrafts();
    let unread = 0;
    let reply = 0;
    let draftCount = 0;
    let visible = 0;

    cards.forEach(card => {
      if (cardHasUnread(card)) unread += 1;
      if (cardNeedsReply(card)) reply += 1;
      if (cardHasDraft(card, drafts)) draftCount += 1;
      ensureDraftBadge(card, drafts);
      ensureReplyBadge(card);
      const show = shouldShow(card, drafts);
      if (card.hidden === show) card.hidden = !show;
      if (show) visible += 1;
    });

    updateFilterButtons({ all: cards.length, unread, reply, drafts: draftCount });
    ensureEmptyState(visible);
  }

  function queueDecorate() {
    if (decorateQueued) return;
    decorateQueued = true;
    requestAnimationFrame(async () => {
      decorateQueued = false;
      if (activeFilter === 'reply' && inboxIsActive()) await refreshReplyStates();
      decorateInbox();
    });
  }

  function observeInbox() {
    if (observer) return;
    const list = document.getElementById('adminInboxList');
    if (!list) return;
    observer = new MutationObserver(() => {
      replyStateFetchedAt = 0;
      queueDecorate();
    });
    observer.observe(list, { childList: true });
  }

  async function bootInboxTools() {
    if (initialized) return;
    initialized = true;
    decorateInbox();
    observeInbox();
    if (inboxIsActive()) {
      await refreshReplyStates();
      decorateInbox();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(bootInboxTools, 250), { once: true });
  } else {
    setTimeout(bootInboxTools, 0);
  }

  window.addEventListener('storage', event => {
    if (event.key === DRAFT_KEY) queueDecorate();
  });
  window.addEventListener('admin-inbox-read-state-changed', queueDecorate);
  window.addEventListener('focus', async () => {
    if (!inboxIsActive()) return;
    replyStateFetchedAt = 0;
    await refreshReplyStates();
    decorateInbox();
  });
})();
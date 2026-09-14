/* Inline admin inbox workspace: read and reply without leaving Inbox. Uses existing chat APIs and style.css only. */
(function initAdminInboxWorkspace() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin) return;

  const READ_KEY = 'adminConversationReadTimes';
  const DRAFT_KEY = 'adminInboxReplyDrafts';
  let activeCommissionId = '';
  let threadChannel = null;
  let initialized = false;

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function messageTime(row) {
    const time = new Date(row?.created_at || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function latestMessage(rows = []) {
    return rows.reduce((latest, row) => {
      if (!latest) return row;
      return messageTime(row) >= messageTime(latest) ? row : latest;
    }, null);
  }

  function loadDrafts() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function draftFor(commissionId) {
    return String(loadDrafts()[String(commissionId)] || '');
  }

  function saveDraft(commissionId, value) {
    if (!commissionId) return;
    const drafts = loadDrafts();
    const clean = String(value || '');
    if (clean) drafts[String(commissionId)] = clean;
    else delete drafts[String(commissionId)];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  }

  function updateDraftStatus() {
    const input = document.getElementById('adminInboxReply');
    const status = document.getElementById('adminInboxReplyStatus');
    if (!input || !status || status.dataset.sendState === 'busy') return;
    const count = input.value.length;
    status.textContent = count ? `Draft saved • ${count.toLocaleString()} character${count === 1 ? '' : 's'}` : '';
  }

  function saveReadTime(commissionId, messages) {
    const latestClient = latestMessage((messages || []).filter(message => String(message.sender || '').toLowerCase() === 'client'));
    if (!latestClient) return false;
    let readTimes = {};
    try { readTimes = JSON.parse(localStorage.getItem(READ_KEY) || '{}') || {}; }
    catch { readTimes = {}; }
    readTimes[String(commissionId)] = messageTime(latestClient) || Date.now();
    localStorage.setItem(READ_KEY, JSON.stringify(readTimes));
    return true;
  }

  async function markThreadRead(commissionId, messages) {
    if (!commissionId) return;
    const rows = messages || await window.getChatMessages?.(commissionId) || [];
    if (!saveReadTime(commissionId, rows)) return;
    window.dispatchEvent(new CustomEvent('admin-inbox-read-state-changed', { detail: { commissionId: String(commissionId) } }));
  }

  function ensureWorkspace() {
    const inboxPage = document.getElementById('adminPage-inbox');
    const list = document.getElementById('adminInboxList');
    if (!inboxPage || !list) return null;
    let workspace = document.getElementById('adminInboxWorkspace');
    if (workspace) return workspace;

    workspace = document.createElement('section');
    workspace.id = 'adminInboxWorkspace';
    workspace.className = 'panel compact-panel hidden';
    workspace.innerHTML = `
      <div class="section-title">
        <div>
          <p class="eyebrow">Conversation</p>
          <h3 id="adminInboxThreadTitle">Client messages</h3>
        </div>
        <div class="button-row">
          <button type="button" class="btn" id="adminInboxOpenCommission">Open commission</button>
          <button type="button" class="btn" id="adminInboxCloseThread">Close</button>
        </div>
      </div>
      <p class="small" id="adminInboxThreadMeta"></p>
      <div id="adminInboxThreadMessages" class="chat-messages" aria-live="polite"></div>
      <label class="small" for="adminInboxReply">Reply as artist</label>
      <textarea id="adminInboxReply" placeholder="Type a reply to this client…"></textarea>
      <div class="button-row">
        <button type="button" class="btn primary" id="adminInboxSendReply">Send reply</button>
        <span class="small" id="adminInboxReplyStatus" aria-live="polite"></span>
      </div>`;
    list.insertAdjacentElement('afterend', workspace);

    document.getElementById('adminInboxCloseThread')?.addEventListener('click', closeThread);
    document.getElementById('adminInboxOpenCommission')?.addEventListener('click', openFullCommission);
    document.getElementById('adminInboxSendReply')?.addEventListener('click', sendReply);
    document.getElementById('adminInboxReply')?.addEventListener('input', event => {
      if (!activeCommissionId) return;
      saveDraft(activeCommissionId, event.target.value);
      updateDraftStatus();
    });
    document.getElementById('adminInboxReply')?.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        sendReply();
      }
    });
    return workspace;
  }

  async function commissionFor(id) {
    try { return await window.getCommissionById?.(id); }
    catch { return null; }
  }

  function commissionName(c) {
    return c?.display_name || c?.client_name || 'Private Client';
  }

  function renderMessages(messages) {
    const box = document.getElementById('adminInboxThreadMessages');
    if (!box) return;
    const rows = Array.isArray(messages) ? messages : [];
    box.innerHTML = rows.map(message => {
      const admin = String(message.sender || '').toLowerCase() === 'admin';
      const when = message.created_at ? new Date(message.created_at).toLocaleString() : '';
      return `
        <div class="chat-message ${admin ? 'admin' : 'client'}">
          <strong>${admin ? 'You' : 'Client'}</strong>
          <p>${esc(message.message || '').replace(/\n/g, '<br>')}</p>
          ${when ? `<small>${esc(when)}</small>` : ''}
        </div>`;
    }).join('') || '<p class="small">No messages in this conversation yet.</p>';
    box.scrollTop = box.scrollHeight;
  }

  async function refreshThread({ markRead = true } = {}) {
    if (!activeCommissionId) return;
    const messages = await window.getChatMessages?.(activeCommissionId) || [];
    renderMessages(messages);
    const inboxVisible = document.getElementById('adminPage-inbox')?.classList.contains('active');
    if (markRead && inboxVisible && document.visibilityState === 'visible') {
      await markThreadRead(activeCommissionId, messages);
    }
  }

  async function openThread(commissionId) {
    if (!commissionId) return;
    const previousId = activeCommissionId;
    const input = document.getElementById('adminInboxReply');
    if (previousId && input && previousId !== String(commissionId)) saveDraft(previousId, input.value);

    activeCommissionId = String(commissionId);
    const workspace = ensureWorkspace();
    if (!workspace) return;

    workspace.classList.remove('hidden');
    const c = await commissionFor(activeCommissionId);
    const title = document.getElementById('adminInboxThreadTitle');
    const meta = document.getElementById('adminInboxThreadMeta');
    if (title) title.textContent = commissionName(c);
    if (meta) meta.textContent = c
      ? `${c.commission_type || 'Commission'} • ${c.status || 'Active'} • ${c.id}`
      : `Commission ${activeCommissionId}`;

    const reply = document.getElementById('adminInboxReply');
    const status = document.getElementById('adminInboxReplyStatus');
    if (reply) reply.value = draftFor(activeCommissionId);
    if (status) {
      status.dataset.sendState = '';
      status.textContent = '';
    }
    updateDraftStatus();
    await refreshThread();
    history.replaceState(null, '', `#message-${encodeURIComponent(activeCommissionId)}`);
    workspace.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => document.getElementById('adminInboxReply')?.focus({ preventScroll: true }), 180);
  }

  function closeThread() {
    const input = document.getElementById('adminInboxReply');
    if (activeCommissionId && input) saveDraft(activeCommissionId, input.value);
    activeCommissionId = '';
    document.getElementById('adminInboxWorkspace')?.classList.add('hidden');
    if (location.hash.startsWith('#message-')) history.replaceState(null, '', `${location.pathname}${location.search}`);
  }

  async function sendReply() {
    if (!activeCommissionId) return;
    const input = document.getElementById('adminInboxReply');
    const status = document.getElementById('adminInboxReplyStatus');
    const message = input?.value.trim() || '';
    if (!message) {
      if (status) status.textContent = 'Type a message first.';
      input?.focus();
      return;
    }

    const button = document.getElementById('adminInboxSendReply');
    if (button) button.disabled = true;
    if (input) input.disabled = true;
    if (status) {
      status.dataset.sendState = 'busy';
      status.textContent = 'Sending…';
    }
    const sent = await window.createChatMessage?.({
      commission_id: activeCommissionId,
      sender: 'admin',
      message
    });
    if (button) button.disabled = false;
    if (input) input.disabled = false;
    if (!sent) {
      if (status) {
        status.dataset.sendState = '';
        status.textContent = 'Message could not be sent. Your draft is still saved.';
      }
      saveDraft(activeCommissionId, input?.value || message);
      input?.focus();
      return;
    }

    saveDraft(activeCommissionId, '');
    if (input) input.value = '';
    if (status) {
      status.dataset.sendState = '';
      status.textContent = 'Sent.';
    }
    await refreshThread();
    input?.focus();
    setTimeout(() => { if (status?.textContent === 'Sent.') status.textContent = ''; }, 1800);
  }

  async function openFullCommission() {
    if (!activeCommissionId) return;
    const idToOpen = activeCommissionId;
    const input = document.getElementById('adminInboxReply');
    if (input) saveDraft(idToOpen, input.value);
    await markThreadRead(idToOpen);
    window.showAdminPage?.('commissions');
    if (window.expandedAdminIds?.add) window.expandedAdminIds.add(idToOpen);
    await window.renderAdmin?.();
    setTimeout(() => {
      const id = CSS.escape(idToOpen);
      const node = document.querySelector(`[data-commission-id="${id}"]`) || document.getElementById(`commission-${idToOpen}`);
      node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }

  function interceptInboxOpen() {
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-open-inbox-commission]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openThread(button.dataset.openInboxCommission);
    }, true);
  }

  function subscribeThread() {
    if (!window.supabaseClient || threadChannel) return;
    threadChannel = supabaseClient
      .channel(`admin-inline-thread-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        if (!activeCommissionId || String(payload?.new?.commission_id || '') !== activeCommissionId) return;
        const shouldRead = document.visibilityState === 'visible' && document.getElementById('adminPage-inbox')?.classList.contains('active');
        refreshThread({ markRead: shouldRead });
      })
      .subscribe();
  }

  function openHashThread() {
    if (!location.hash.startsWith('#message-')) return;
    const id = decodeURIComponent(location.hash.slice('#message-'.length));
    if (!id) return;
    window.showAdminPage?.('inbox');
    setTimeout(() => openThread(id), 120);
  }

  function markVisibleThreadRead() {
    if (!activeCommissionId || document.visibilityState !== 'visible') return;
    if (!document.getElementById('adminPage-inbox')?.classList.contains('active')) return;
    refreshThread({ markRead: true });
  }

  function bootInboxWorkspace() {
    if (initialized) return;
    initialized = true;
    interceptInboxOpen();
    document.addEventListener('visibilitychange', markVisibleThreadRead);
    window.addEventListener('hashchange', openHashThread);
    ensureWorkspace();
    subscribeThread();
    openHashThread();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(bootInboxWorkspace, 250), { once: true });
  } else {
    setTimeout(bootInboxWorkspace, 0);
  }

  navigator.serviceWorker?.addEventListener?.('message', event => {
    if (event.data?.type !== 'open-inbox-commission') return;
    const id = String(event.data.commissionId || '');
    if (!id) return;
    window.showAdminPage?.('inbox');
    setTimeout(() => openThread(id), 120);
  });

  window.openAdminInboxThread = openThread;
})();
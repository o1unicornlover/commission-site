/* Inline admin inbox workspace: read and reply without leaving Inbox. Uses existing chat APIs and style.css only. */
(function initAdminInboxWorkspace() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin) return;

  const READ_KEY = 'adminConversationReadTimes';
  const DRAFT_KEY = 'adminInboxReplyDrafts';
  let activeCommissionId = '';
  let threadChannel = null;
  let initialized = false;
  let refreshRequestId = 0;

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

  function renderThreadNotice(message) {
    const box = document.getElementById('adminInboxThreadMessages');
    if (!box) return;
    box.innerHTML = `<p class="small">${esc(message)}</p>`;
    box.scrollTop = 0;
  }

  function nearBottom(box) {
    return !box || box.scrollHeight - box.scrollTop - box.clientHeight < 90;
  }

  function renderMessages(messages, { forceBottom = false } = {}) {
    const box = document.getElementById('adminInboxThreadMessages');
    if (!box) return;
    const followLatest = forceBottom || nearBottom(box);
    const previousTop = box.scrollTop;
    const rows = Array.isArray(messages) ? [...messages].sort((a, b) => messageTime(a) - messageTime(b)) : [];
    const html = rows.map(message => {
      const admin = String(message.sender || '').toLowerCase() === 'admin';
      const when = message.created_at ? new Date(message.created_at).toLocaleString() : '';
      return `
        <div class="chat-message ${admin ? 'admin' : 'client'}">
          <strong>${admin ? 'You' : 'Client'}</strong>
          <p>${esc(message.message || '').replace(/\n/g, '<br>')}</p>
          ${when ? `<small>${esc(when)}</small>` : ''}
        </div>`;
    }).join('') || '<p class="small">No messages in this conversation yet.</p>';
    if (box.dataset.lastHtml !== html) {
      box.innerHTML = html;
      box.dataset.lastHtml = html;
    }
    requestAnimationFrame(() => {
      if (!box.isConnected) return;
      if (followLatest) box.scrollTop = box.scrollHeight;
      else box.scrollTop = Math.min(previousTop, Math.max(0, box.scrollHeight - box.clientHeight));
    });
  }

  async function refreshThread({ markRead = true, forceBottom = false } = {}) {
    const commissionId = activeCommissionId;
    if (!commissionId) return false;
    const requestId = ++refreshRequestId;
    const alreadyRendered = !!document.querySelector('#adminInboxThreadMessages .chat-message');
    let messages = [];
    try {
      messages = await window.getChatMessages?.(commissionId) || [];
    } catch (error) {
      console.warn('Admin Inbox refresh failed', error);
      if (activeCommissionId === commissionId && requestId === refreshRequestId && !alreadyRendered) {
        renderThreadNotice('Conversation could not be refreshed. Close and reopen this thread to try again.');
      }
      return false;
    }
    if (activeCommissionId !== commissionId || requestId !== refreshRequestId) return false;
    renderMessages(messages, { forceBottom });
    const inboxVisible = document.getElementById('adminPage-inbox')?.classList.contains('active');
    if (markRead && inboxVisible && document.visibilityState === 'visible') {
      await markThreadRead(commissionId, messages);
    }
    return true;
  }

  async function openThread(commissionId) {
    if (!commissionId) return;
    const nextCommissionId = String(commissionId);
    const previousId = activeCommissionId;
    const input = document.getElementById('adminInboxReply');
    if (previousId && input && previousId !== nextCommissionId) saveDraft(previousId, input.value);

    activeCommissionId = nextCommissionId;
    const workspace = ensureWorkspace();
    if (!workspace) return;

    workspace.classList.remove('hidden');
    if (previousId !== nextCommissionId) renderThreadNotice('Loading conversation…');
    const c = await commissionFor(nextCommissionId);
    if (activeCommissionId !== nextCommissionId) return;
    const title = document.getElementById('adminInboxThreadTitle');
    const meta = document.getElementById('adminInboxThreadMeta');
    if (title) title.textContent = commissionName(c);
    if (meta) meta.textContent = c
      ? `${c.commission_type || 'Commission'} • ${c.status || 'Active'} • ${c.id}`
      : `Commission ${nextCommissionId}`;

    const reply = document.getElementById('adminInboxReply');
    const sendButton = document.getElementById('adminInboxSendReply');
    const status = document.getElementById('adminInboxReplyStatus');
    if (reply) {
      reply.disabled = false;
      reply.value = draftFor(nextCommissionId);
    }
    if (sendButton) sendButton.disabled = false;
    if (status) {
      status.dataset.sendState = '';
      status.textContent = '';
    }
    updateDraftStatus();
    await refreshThread({ forceBottom: previousId !== nextCommissionId });
    if (activeCommissionId !== nextCommissionId) return;
    history.replaceState(null, '', `#message-${encodeURIComponent(nextCommissionId)}`);
    workspace.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => {
      if (activeCommissionId === nextCommissionId) document.getElementById('adminInboxReply')?.focus({ preventScroll: true });
    }, 180);
  }

  function closeThread() {
    const input = document.getElementById('adminInboxReply');
    if (activeCommissionId && input) saveDraft(activeCommissionId, input.value);
    activeCommissionId = '';
    refreshRequestId += 1;
    document.getElementById('adminInboxWorkspace')?.classList.add('hidden');
    if (location.hash.startsWith('#message-')) history.replaceState(null, '', `${location.pathname}${location.search}`);
  }

  async function sendReply() {
    const commissionId = activeCommissionId;
    if (!commissionId) return;
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

    let sent = null;
    try {
      sent = await window.createChatMessage?.({
        commission_id: commissionId,
        sender: 'admin',
        message
      });
    } catch (error) {
      console.warn('Admin Inbox reply failed', error);
    }

    if (activeCommissionId !== commissionId) return;
    if (button) button.disabled = false;
    if (input) input.disabled = false;
    if (!sent) {
      if (status) {
        status.dataset.sendState = '';
        status.textContent = 'Message could not be sent. Your draft is still saved.';
      }
      saveDraft(commissionId, input?.value || message);
      input?.focus();
      return;
    }

    saveDraft(commissionId, '');
    if (input) input.value = '';
    if (status) {
      status.dataset.sendState = '';
      status.textContent = 'Sent.';
    }
    await refreshThread({ forceBottom: true });
    if (activeCommissionId !== commissionId) return;
    input?.focus();
    setTimeout(() => { if (activeCommissionId === commissionId && status?.textContent === 'Sent.') status.textContent = ''; }, 1800);
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
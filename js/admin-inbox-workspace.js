/* Inline admin inbox workspace: read and reply without leaving Inbox. Uses existing chat APIs and style.css only. */
(function initAdminInboxWorkspace() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith('/admin.html');
  if (!onAdmin) return;

  let activeCommissionId = '';
  let threadChannel = null;

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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

  async function refreshThread() {
    if (!activeCommissionId) return;
    const messages = await window.getChatMessages?.(activeCommissionId) || [];
    renderMessages(messages);
  }

  async function openThread(commissionId) {
    if (!commissionId) return;
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

    const status = document.getElementById('adminInboxReplyStatus');
    if (status) status.textContent = '';
    await refreshThread();
    history.replaceState(null, '', `#message-${encodeURIComponent(activeCommissionId)}`);
    workspace.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeThread() {
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
      return;
    }

    const button = document.getElementById('adminInboxSendReply');
    if (button) button.disabled = true;
    if (status) status.textContent = 'Sending…';
    const sent = await window.createChatMessage?.({
      commission_id: activeCommissionId,
      sender: 'admin',
      message
    });
    if (button) button.disabled = false;
    if (!sent) {
      if (status) status.textContent = 'Message could not be sent.';
      return;
    }

    if (input) input.value = '';
    if (status) status.textContent = 'Sent.';
    await refreshThread();
    setTimeout(() => { if (status?.textContent === 'Sent.') status.textContent = ''; }, 1800);
  }

  async function openFullCommission() {
    if (!activeCommissionId) return;
    window.showAdminPage?.('commissions');
    if (window.expandedAdminIds?.add) window.expandedAdminIds.add(activeCommissionId);
    await window.renderAdmin?.();
    setTimeout(() => {
      const id = CSS.escape(activeCommissionId);
      const node = document.querySelector(`[data-commission-id="${id}"]`) || document.getElementById(`commission-${activeCommissionId}`);
      node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }

  function interceptInboxOpen() {
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-open-inbox-commission]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const id = button.dataset.openInboxCommission;
      const markRead = button.closest('[data-inbox-commission]')?.querySelector('[data-mark-inbox-read]');
      markRead?.click();
      openThread(id);
    }, true);
  }

  function subscribeThread() {
    if (!window.supabaseClient || threadChannel) return;
    threadChannel = supabaseClient
      .channel(`admin-inline-thread-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        if (activeCommissionId && String(payload?.new?.commission_id || '') === activeCommissionId) refreshThread();
      })
      .subscribe();
  }

  function openHashThread() {
    if (!location.hash.startsWith('#message-')) return;
    const id = decodeURIComponent(location.hash.slice('#message-'.length));
    if (!id) return;
    window.showAdminPage?.('inbox');
    setTimeout(() => openThread(id), 250);
  }

  document.addEventListener('DOMContentLoaded', () => {
    interceptInboxOpen();
    setTimeout(() => {
      ensureWorkspace();
      subscribeThread();
      openHashThread();
    }, 1000);
  });

  navigator.serviceWorker?.addEventListener?.('message', event => {
    if (event.data?.type !== 'open-inbox-commission') return;
    const id = String(event.data.commissionId || '');
    if (!id) return;
    window.showAdminPage?.('inbox');
    setTimeout(() => openThread(id), 120);
  });

  window.openAdminInboxThread = openThread;
})();

/* Request inbox: review public commission requests before they enter the queue. */
(function initAdminRequests() {
  if (window.__adminRequestsReady) return;
  window.__adminRequestsReady = true;
  const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  const isRequest = c => String(c.request_status || "").toLowerCase() === "pending" || /^request\s*[—-]/i.test(String(c.status || ""));
  function ensurePanel() {
    const nav = document.querySelector(".admin-sidebar");
    const content = document.querySelector(".admin-content");
    if (!nav || !content) return null;
    if (!nav.querySelector('[data-admin-page="requests"]')) {
      const button = document.createElement("button");
      button.type = "button"; button.className = "admin-nav-btn"; button.dataset.adminPage = "requests"; button.textContent = "Requests";
      nav.insertBefore(button, nav.querySelector('[data-admin-page="commissions"]') || null);
    }
    let panel = document.getElementById("adminPage-requests");
    if (!panel) {
      panel = document.createElement("section"); panel.id = "adminPage-requests"; panel.className = "admin-page";
      panel.innerHTML = `<div class="section-title"><div><p class="eyebrow">New work</p><h2>Commission Requests</h2><p class="small">Review requests here. They do not appear in the public queue until you accept them.</p></div><button type="button" class="btn" id="refreshRequests">Refresh</button></div><div id="requestInboxList" class="admin-list"></div>`;
      content.insertBefore(panel, document.getElementById("adminPage-commissions"));
      panel.addEventListener("click", handleClick);
      panel.addEventListener("input", event => { if (event.target.matches("[data-request-field]")) event.target.closest(".request-review")?.querySelector("[data-request-preview]") && updatePreview(event.target.closest(".request-review")); });
      document.getElementById("refreshRequests")?.addEventListener("click", render);
    }
    return panel;
  }
  function updatePreview(card) {
    const amount = card.querySelector('[data-request-field="quote_amount"]')?.value.trim() || "[amount]";
    const message = card.querySelector('[data-request-field="quote_message"]')?.value.trim() || "Thanks for your request! I reviewed the details and would love to work on it. Your quote is [amount]. Reply here if you have questions, and I’ll send your private progress link after you accept.";
    const box = card.querySelector("[data-request-preview]"); if (box) box.textContent = message.replace("[amount]", amount);
  }
  function messageFor(c, amount, access) {
    return `Hi ${c.display_name || c.client_name || "there"}! I reviewed your commission request. I can take it on for ${amount || "the quoted amount"}. Your private progress page is: ${location.href.replace(/admin\.html.*$/, "progress.html")}?id=${c.id}. Your access code is ${access}. Reply here if you have any questions before we start.`;
  }
  async function render() {
    const panel = ensurePanel(); const list = document.getElementById("requestInboxList"); if (!panel || !list || typeof getCommissions !== "function") return;
    list.innerHTML = `<p class="small">Loading requests…</p>`;
    const all = await getCommissions({ includeArchived: true });
    const requests = all.filter(isRequest);
    if (!requests.length) { list.innerHTML = `<article class="info-card"><strong>No pending requests</strong><p class="small">New form submissions will appear here.</p></article>`; return; }
    list.innerHTML = requests.map(c => `<article class="info-card request-review" data-request-id="${esc(c.id)}">
      <div class="section-title"><div><strong>#${esc(c.id)} — ${esc(c.display_name || c.client_name || "Anonymous")}</strong><p class="small">${esc(c.commission_type || "Commission")} · ${esc(c.created_at ? new Date(c.created_at).toLocaleString() : "")}</p></div><span class="pill">Pending</span></div>
      <p><strong>Contact:</strong> ${esc(c.request_contact || "Not provided")}</p><p><strong>Budget:</strong> ${esc(c.requested_budget || "Not provided")}</p><p><strong>Details:</strong><br>${esc(c.request_details || "").replace(/\n/g,"<br>")}</p>${c.reference_url ? `<p><a href="${esc(c.reference_url)}" target="_blank" rel="noopener">Open references ↗</a></p>` : ""}
      <div class="form-grid"><label>Quote amount<input data-request-field="quote_amount" value="${esc(c.quote_amount || "")}" placeholder="$85"></label><label>Message to include<textarea data-request-field="quote_message" rows="3">${esc(c.quote_message || "")}</textarea></label></div>
      <p class="small" data-request-preview>${esc(c.quote_message || "Thanks for your request! I reviewed the details and would love to work on it. Your quote is [amount]. Reply here if you have questions, and I’ll send your private progress link after you accept.")}</p>
      <div class="button-row"><button type="button" class="btn primary" data-request-action="accept">Accept + create progress page</button><button type="button" class="btn danger" data-request-action="decline">Decline</button><button type="button" class="btn" data-request-action="copy">Copy contact message</button></div>
    </article>`).join("");
  }
  async function handleClick(event) {
    const action = event.target.closest("[data-request-action]")?.dataset.requestAction; if (!action) return;
    const card = event.target.closest("[data-request-id]"); const id = card?.dataset.requestId; if (!id) return;
    const c = (await getCommissions({ includeArchived: true })).find(row => String(row.id) === String(id)); if (!c) return;
    const amount = card.querySelector('[data-request-field="quote_amount"]')?.value.trim() || "";
    const note = card.querySelector('[data-request-field="quote_message"]')?.value.trim() || "";
    if (action === "copy") { const text = messageFor(c, amount, c.client_access_code || "[access code]"); await navigator.clipboard?.writeText(text); alert("Contact message copied."); return; }
    if (action === "decline") { if (!confirm("Decline this request?")) return; await updateCommission(id, { status: "Declined", request_status: "declined", quote_amount: amount, quote_message: note }); await render(); return; }
    const access = c.client_access_code || c.password || code();
    const updated = await updateCommission(id, { status: "Waiting / Not started", request_status: "accepted", quote_amount: amount, price: amount, quote_message: note, password: access, client_access_code: access });
    if (!updated) return alert("Could not accept this request.");
    await navigator.clipboard?.writeText(messageFor(updated, amount, access));
    alert("Accepted. The public queue now shows this commission, and the contact message was copied.");
    await render(); window.renderAdmin?.();
  }
  function start() { ensurePanel(); window.addEventListener("admin-page-change", event => { if (event.detail?.page === "requests") render(); }); render(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();

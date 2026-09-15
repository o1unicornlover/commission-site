/* Admin-only PWA helpers: installability, unified inbox, unread state, client-message notifications, and chime. */
(function initAdminApp() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith("/admin.html");
  if (!onAdmin) return;

  let audioCtx = null;
  let notificationChannel = null;
  let notificationsEnabled = localStorage.getItem("adminMessageNotifications") === "true";
  let soundEnabled = localStorage.getItem("adminMessageSound") !== "false";
  let desktopNotificationsEnabled = localStorage.getItem("adminDesktopNotifications") !== "false";
  let inboxRefreshTimer = null;
  let inboxRefreshBusy = false;
  let inboxRowsCache = [];
  let inboxRowsCachedAt = 0;
  let inboxRowsPromise = null;
  const READ_KEY = "adminConversationReadTimes";
  const INBOX_CACHE_MS = 15000;
  const INBOX_POLL_MS = 30000;

  function getReadTimes() {
    try { return JSON.parse(localStorage.getItem(READ_KEY) || "{}"); }
    catch { return {}; }
  }

  function saveReadTimes(value) { localStorage.setItem(READ_KEY, JSON.stringify(value || {})); }
  function saveAlertPreferences() {
    localStorage.setItem("adminMessageNotifications", String(notificationsEnabled));
    localStorage.setItem("adminMessageSound", String(soundEnabled));
    localStorage.setItem("adminDesktopNotifications", String(desktopNotificationsEnabled));
    window.dispatchEvent(new CustomEvent("admin-alert-preferences-changed", { detail: getAlertPreferences() }));
  }
  function getAlertPreferences() { return { enabled: notificationsEnabled, sound: soundEnabled, desktop: desktopNotificationsEnabled, permission: ("Notification" in window) ? Notification.permission : "unsupported" }; }
  function messageTime(row) { const t = new Date(row?.created_at || 0).getTime(); return Number.isFinite(t) ? t : 0; }
  function latestMessage(rows = []) { return rows.reduce((latest, row) => !latest || messageTime(row) >= messageTime(latest) ? row : latest, null); }

  function addManifest() {
    if (!document.querySelector('link[rel="manifest"]')) { const link = document.createElement("link"); link.rel = "manifest"; link.href = "./admin-manifest.webmanifest"; document.head.appendChild(link); }
    if (!document.querySelector('meta[name="theme-color"]')) { const meta = document.createElement("meta"); meta.name = "theme-color"; meta.content = "#ff4da8"; document.head.appendChild(meta); }
  }
  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    const desiredScope = new URL("./admin.html", location.href).href;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => {
        const workerUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || "";
        const isAdminWorker = /\/admin-sw\.js(?:$|[?#])/.test(workerUrl);
        if (isAdminWorker && registration.scope !== desiredScope) return registration.unregister();
        return Promise.resolve(false);
      }));
      await navigator.serviceWorker.register("./admin-sw.js", { scope: "./admin.html" });
    } catch (error) { console.warn("Admin service worker registration failed", error); }
  }
  function ensureAudio() { if (!audioCtx) { const AudioContext = window.AudioContext || window.webkitAudioContext; if (AudioContext) audioCtx = new AudioContext(); } if (audioCtx?.state === "suspended") audioCtx.resume().catch(() => {}); }
  function chime(force = false) {
    if (!force && (!notificationsEnabled || !soundEnabled)) return;
    ensureAudio(); if (!audioCtx) return; const now = audioCtx.currentTime;
    [659.25, 880].forEach((freq, index) => { const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = "sine"; osc.frequency.value = freq; gain.gain.setValueAtTime(0.0001, now + index * 0.12); gain.gain.exponentialRampToValueAtTime(0.13, now + index * 0.12 + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.18); osc.connect(gain).connect(audioCtx.destination); osc.start(now + index * 0.12); osc.stop(now + index * 0.12 + 0.2); });
  }
  function invalidateInboxRows() { inboxRowsCachedAt = 0; }
  async function getInboxRows(force = false) {
    if (!window.getCommissions || !window.getChatMessages) return [];
    const now = Date.now(); if (!force && inboxRowsCachedAt && (now - inboxRowsCachedAt) < INBOX_CACHE_MS) return inboxRowsCache; if (inboxRowsPromise) return inboxRowsPromise;
    inboxRowsPromise = (async () => { const commissions = await window.getCommissions({ includeArchived: true }); const readTimes = getReadTimes(); const rows = await Promise.all((commissions || []).map(async commission => { const messages = await window.getChatMessages(commission.id); const clientMessages = (messages || []).filter(m => m.sender === "client"); const latest = latestMessage(clientMessages); const lastRead = Number(readTimes[String(commission.id)] || 0); const unreadCount = clientMessages.filter(m => messageTime(m) > lastRead).length; return { commission, messages, latest, unreadCount }; })); inboxRowsCache = rows.filter(row => row.latest).sort((a,b) => messageTime(b.latest)-messageTime(a.latest)); inboxRowsCachedAt = Date.now(); return inboxRowsCache; })();
    try { return await inboxRowsPromise; } finally { inboxRowsPromise = null; }
  }
  async function syncBadge(rows = null, force = false) { let unread = 0; try { const source = rows || await getInboxRows(force); unread = source.reduce((sum,row)=>sum+row.unreadCount,0); } catch(error){ console.warn("Unread count refresh failed",error); } const btn=document.getElementById("adminNotificationToggle"); if(btn) btn.textContent=notificationsEnabled?`🔔 Messages${unread?` (${unread})`:""}`:"🔕 Enable message alerts"; const inboxButton=document.querySelector('[data-admin-page="inbox"]'); if(inboxButton) inboxButton.textContent=unread?`Inbox (${unread})`:"Inbox"; document.title=unread?`(${unread}) Admin Dashboard`:"Admin Dashboard"; if(navigator.setAppBadge){ if(unread) navigator.setAppBadge(unread).catch(()=>{}); else navigator.clearAppBadge?.().catch(()=>{}); } }
  function escapeText(value){ return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;"); }
  function displayName(c){ return c?.display_name||c?.client_name||"Private Client"; }
  async function markConversationRead(commissionId){ const messages=await window.getChatMessages?.(commissionId)||[]; const latestClient=latestMessage(messages.filter(m=>m.sender==="client")); if(latestClient){ const times=getReadTimes(); times[String(commissionId)]=messageTime(latestClient)||Date.now(); saveReadTimes(times); } invalidateInboxRows(); await syncBadge(null,true); }
  async function openCommissionFromInbox(commissionId){ await markConversationRead(commissionId); window.showAdminPage?.("commissions"); if(window.expandedAdminIds?.add) window.expandedAdminIds.add(String(commissionId)); await window.renderAdmin?.(); setTimeout(()=>{ const node=document.querySelector(`[data-commission-id="${CSS.escape(String(commissionId))}"]`)||document.getElementById(`commission-${commissionId}`); node?.scrollIntoView({behavior:"smooth",block:"start"}); },120); }
  async function renderAdminInbox(force=false){ const box=document.getElementById("adminInboxList"); if(!box)return; box.innerHTML='<p class="small">Loading conversations…</p>'; const rows=await getInboxRows(force); if(!rows.length){ box.innerHTML='<article class="info-card"><h3>No client messages yet</h3><p class="small">New client replies will appear here automatically.</p></article>'; await syncBadge(rows); return; } box.innerHTML=rows.map(({commission:c,latest,unreadCount})=>{ const status=String(c.status||"Active"); const when=latest?.created_at?new Date(latest.created_at).toLocaleString():""; return `<article class="info-card" data-inbox-commission="${escapeText(c.id)}"><div class="section-title"><div><p class="eyebrow">${unreadCount?`${unreadCount} unread`:"Up to date"}</p><h3>${escapeText(displayName(c))}</h3></div><span class="pill">${escapeText(c.commission_type||"Commission")}</span></div><p>${escapeText(latest?.message||"")}</p><p class="small">${escapeText(status)}${when?` • ${escapeText(when)}`:""}</p><div class="button-row"><button type="button" class="btn ${unreadCount?"primary":""}" data-open-inbox-commission="${escapeText(c.id)}">Open conversation</button>${unreadCount?`<button type="button" class="btn" data-mark-inbox-read="${escapeText(c.id)}">Mark read</button>`:""}</div></article>`; }).join(""); box.querySelectorAll("[data-open-inbox-commission]").forEach(button=>button.addEventListener("click",()=>openCommissionFromInbox(button.dataset.openInboxCommission))); box.querySelectorAll("[data-mark-inbox-read]").forEach(button=>button.addEventListener("click",async()=>{ await markConversationRead(button.dataset.markInboxRead); await renderAdminInbox(true); })); await syncBadge(rows); }
  function injectInbox(){ const sidebar=document.querySelector(".admin-sidebar"); const content=document.querySelector(".admin-content"); if(!sidebar||!content||document.getElementById("adminPage-inbox"))return; const button=document.createElement("button"); button.type="button"; button.className="admin-nav-btn"; button.dataset.adminPage="inbox"; button.textContent="Inbox"; const commissionsButton=sidebar.querySelector('[data-admin-page="commissions"]'); commissionsButton?.insertAdjacentElement("afterend",button); const page=document.createElement("section"); page.id="adminPage-inbox"; page.className="admin-page"; page.innerHTML=`<div class="section-title"><div><p class="eyebrow">Client messages</p><h2>Inbox</h2></div><button type="button" class="btn" id="refreshAdminInbox">Refresh</button></div><p class="small">Every client conversation in one place. Unread state is kept on this admin device and new messages update in real time.</p><div id="adminInboxList" class="admin-list"></div>`; const commissionsPage=document.getElementById("adminPage-commissions"); commissionsPage?.insertAdjacentElement("afterend",page); document.getElementById("refreshAdminInbox")?.addEventListener("click",()=>renderAdminInbox(true)); }
  async function showMessageNotification(row){ if(row?.sender!=="client")return; invalidateInboxRows(); const inboxActive=document.getElementById("adminPage-inbox")?.classList.contains("active"); if(inboxActive) await renderAdminInbox(true); else await syncBadge(null,true); if(!notificationsEnabled)return; if(soundEnabled)chime(); const body=String(row?.message||"New client message").slice(0,150); if(desktopNotificationsEnabled&&"Notification" in window&&Notification.permission==="granted"){ try{ const registration=await navigator.serviceWorker?.ready; if(registration?.showNotification) await registration.showNotification("New client message",{body,icon:"./admin-icon.svg",badge:"./admin-icon.svg",tag:`chat-${row?.commission_id||"message"}`,data:{commissionId:row?.commission_id||""}}); else new Notification("New client message",{body,icon:"./admin-icon.svg"}); }catch(error){console.warn("Message notification failed",error);} } }
  async function enableNotifications(){ ensureAudio(); notificationsEnabled=true; if(!("Notification" in window)){ desktopNotificationsEnabled=false; saveAlertPreferences(); await syncBadge(); return alert("Chime alerts are enabled. This browser does not support desktop notifications."); } let permission=Notification.permission; if(desktopNotificationsEnabled&&permission==="default") permission=await Notification.requestPermission(); if(permission==="denied")desktopNotificationsEnabled=false; saveAlertPreferences(); await syncBadge(); if(soundEnabled)chime(); }
  async function setAlertPreferences(next={}){ if(typeof next.enabled==="boolean")notificationsEnabled=next.enabled; if(typeof next.sound==="boolean")soundEnabled=next.sound; if(typeof next.desktop==="boolean")desktopNotificationsEnabled=next.desktop; if(notificationsEnabled&&desktopNotificationsEnabled&&"Notification" in window&&Notification.permission==="default"){ const permission=await Notification.requestPermission(); if(permission==="denied")desktopNotificationsEnabled=false; } if(notificationsEnabled&&soundEnabled)ensureAudio(); saveAlertPreferences(); await syncBadge(); return getAlertPreferences(); }
  function injectControls(){ if(document.getElementById("adminNotificationToggle"))return; const header=document.querySelector(".admin-header nav")||document.querySelector(".admin-header"); if(!header)return; const button=document.createElement("button"); button.type="button"; button.id="adminNotificationToggle"; button.className="btn"; button.style.padding="8px 12px"; button.addEventListener("click",async()=>{ if(!notificationsEnabled)await enableNotifications(); else{notificationsEnabled=false;saveAlertPreferences();await syncBadge();} }); header.appendChild(button); }
  function subscribeToClientMessages(){ if(!window.supabaseClient||notificationChannel)return false; notificationChannel=supabaseClient.channel(`admin-message-alerts-${Date.now()}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages"},payload=>{showMessageNotification(payload?.new||{});}).subscribe(status=>console.log("Admin message alerts:",status)); return true; }
  function armAfterUserGesture(){ const once=()=>{ if(notificationsEnabled&&soundEnabled)ensureAudio(); window.removeEventListener("pointerdown",once); window.removeEventListener("keydown",once); }; window.addEventListener("pointerdown",once,{once:true}); window.addEventListener("keydown",once,{once:true}); }
  async function refreshInboxFallback(){ if(document.hidden||inboxRefreshBusy)return; inboxRefreshBusy=true; try{ const inboxActive=document.getElementById("adminPage-inbox")?.classList.contains("active"); if(inboxActive)await renderAdminInbox(true); else await syncBadge(null,true); }finally{inboxRefreshBusy=false;} }
  function startInboxPolling(){ clearInterval(inboxRefreshTimer); inboxRefreshTimer=setInterval(refreshInboxFallback,INBOX_POLL_MS); }
  async function activateMessageDataLayer(){ subscribeToClientMessages(); await syncBadge(null,true); startInboxPolling(); }

  window.adminAlertPreferences={get:getAlertPreferences,set:setAlertPreferences,testChime:()=>chime(true)}; window.renderAdminInbox=renderAdminInbox;
  window.addEventListener("admin-page-change",event=>{if(event.detail?.page==="inbox")renderAdminInbox(true).catch(error=>console.warn("Inbox render failed",error));});
  window.addEventListener("admin-runtime-ready",()=>{ activateMessageDataLayer().catch(error=>console.warn("Admin message data layer activation failed",error)); });
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshInboxFallback();});
  document.addEventListener("DOMContentLoaded",()=>{ addManifest(); registerServiceWorker(); injectControls(); injectInbox(); armAfterUserGesture(); setTimeout(()=>{ activateMessageDataLayer().catch(error=>console.warn("Admin message data layer activation failed",error)); },900); });
})();
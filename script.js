const ADMIN_PASSWORD = "admin123"; // Concept only. Real security needs a backend.
let selectedCommissionId = null;
let isAdmin = false;
let expandedAdminIds = new Set();

const PROGRESS_STAGE_GROUPS = [
  {
    group: "General",
    stages: [
      { key: "accepted", label: "Payment Received / Accepted", percent: 5 },
      { key: "references", label: "References Checked", percent: 10 },
      { key: "waiting", label: "Waiting / In Queue", percent: 10 },
      { key: "review", label: "Client Review", percent: 95 },
      { key: "complete", label: "Complete / Delivered", percent: 100 }
    ]
  },
  {
    group: "2D Art",
    stages: [
      { key: "2d-sketch", label: "2D — Sketch", percent: 20 },
      { key: "2d-lineart", label: "2D — Lineart", percent: 40 },
      { key: "2d-flats", label: "2D — Flat Colors", percent: 60 },
      { key: "2d-coloring", label: "2D — Coloring", percent: 70 },
      { key: "2d-rendering", label: "2D — Rendering", percent: 85 },
      { key: "2d-final", label: "2D — Final Polish", percent: 95 }
    ]
  },
  {
    group: "3D Sculpt / Model",
    stages: [
      { key: "3d-blocking", label: "3D — Blocking", percent: 20 },
      { key: "3d-base", label: "3D — Base Sculpt", percent: 35 },
      { key: "3d-refine", label: "3D — Refining Shapes", percent: 50 },
      { key: "3d-hair-clothes", label: "3D — Hair / Clothes", percent: 65 },
      { key: "3d-details", label: "3D — Details", percent: 75 },
      { key: "3d-retopo", label: "3D — Retopology", percent: 80 },
      { key: "3d-uv", label: "3D — UVs", percent: 84 },
      { key: "3d-texture", label: "3D — Texturing", percent: 90 },
      { key: "3d-render", label: "3D — Render / Final Preview", percent: 95 }
    ]
  },
  {
    group: "Animation",
    stages: [
      { key: "anim-storyboard", label: "Animation — Storyboard / Plan", percent: 15 },
      { key: "anim-rough", label: "Animation — Rough Motion", percent: 35 },
      { key: "anim-cleanup", label: "Animation — Cleanup", percent: 55 },
      { key: "anim-color", label: "Animation — Color / Texture", percent: 70 },
      { key: "anim-render", label: "Animation — Rendering", percent: 90 },
      { key: "anim-final", label: "Animation — Final Export", percent: 98 }
    ]
  }
];
const PROGRESS_STAGES = PROGRESS_STAGE_GROUPS.flatMap(group => group.stages);

const defaultCommissions = [
  {
    id: "CM-001",
    clientName: "Luna",
    type: "3D Sculpt",
    status: "Blocking",
    privacy: "public",
    previewImage: "",
    password: "mango-42-fox",
    archived: false,
    stages: [
      { stageKey: "accepted", title: "Payment Received / Accepted", desc: "Commission accepted and added to the queue.", image: "", done: true, percent: 5 },
      { stageKey: "blocking", title: "Blocking", desc: "Base proportions and pose are being sculpted.", image: "", done: true, percent: 20 },
      { stageKey: "refinement", title: "Refinement", desc: "Anatomy, clothes, and hair details come next.", image: "", done: false, percent: 50 }
    ]
  },
  {
    id: "CM-002",
    clientName: "Private Client",
    type: "Fullbody Art",
    status: "Waiting",
    privacy: "private",
    previewImage: "",
    password: "star-18-milk",
    archived: false,
    stages: [
      { stageKey: "accepted", title: "Payment Received / Accepted", desc: "Commission accepted and waiting to start.", image: "", done: true, percent: 5 }
    ]
  }
];

function loadCommissions() {
  const saved = localStorage.getItem("commissions");
  if (!saved) {
    localStorage.setItem("commissions", JSON.stringify(defaultCommissions));
    return defaultCommissions;
  }
  return JSON.parse(saved);
}
function saveCommissions(commissions) { localStorage.setItem("commissions", JSON.stringify(commissions)); }
function loadGallery() { return JSON.parse(localStorage.getItem("galleryItems") || "[]"); }
function saveGallery(items) { localStorage.setItem("galleryItems", JSON.stringify(items)); }

const defaultSlotSettings = [
  { id: "2d", title: "2D Art", desc: "Character art, outfit design, rendered illustrations.", price: "", current: 0, max: 4, closed: false },
  { id: "3d", title: "3D Model", desc: "Character models, sculpts, figure-style models, and 3D previews.", price: "", current: 0, max: 2, closed: false },
  { id: "anim", title: "Animation", desc: "Short loops, character animation, simple motion tests.", price: "", current: 0, max: 2, closed: true }
];

function normalizeSlotTitle(title) {
  const clean = String(title || "").trim();
  const lower = clean.toLowerCase();
  if (["2d fullbody", "fullbody art", "fullbody", "2d illustration"].includes(lower)) return "2D Art";
  if (["3d sculpt", "3d sculpting", "sculpt"].includes(lower)) return "3D Model";
  return clean || "Commission Type";
}
function normalizeSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return JSON.parse(JSON.stringify(defaultSlotSettings));
  return slots.map((slot, index) => {
    const fallback = defaultSlotSettings[index] || defaultSlotSettings[0];
    const max = Math.max(1, Number(slot.max ?? fallback.max ?? 1));
    return {
      id: slot.id || fallback.id || `slot-${index}`,
      title: normalizeSlotTitle(slot.title || fallback.title || "Commission Type"),
      desc: slot.desc || fallback.desc || "Description goes here.",
      price: "",
      current: Math.max(0, Math.min(max, Number(slot.current ?? 0))),
      max,
      closed: Boolean(slot.closed)
    };
  });
}
function loadSlots() {
  try {
    const saved = localStorage.getItem("slotSettings");
    const slots = saved ? normalizeSlots(JSON.parse(saved)) : normalizeSlots(defaultSlotSettings);
    localStorage.setItem("slotSettings", JSON.stringify(slots));
    return slots;
  } catch (error) {
    localStorage.setItem("slotSettings", JSON.stringify(defaultSlotSettings));
    return normalizeSlots(defaultSlotSettings);
  }
}
function saveSlots(slots) { localStorage.setItem("slotSettings", JSON.stringify(normalizeSlots(slots))); }
function resetSlotsToDefault() {
  if (!confirm("Reset commission slots to the default 2D / 3D / Animation setup?")) return;
  saveSlots(defaultSlotSettings);
  renderSlotAdmin();
  renderCommissionInfo();
}
function slotLabel(slot) { return slot.closed ? "Closed" : `${slot.current}/${slot.max} slots`; }
function renderCommissionInfo() {
  const grid = document.getElementById("commissionInfoGrid");
  if (!grid) return;
  const slots = loadSlots();
  grid.innerHTML = slots.map(slot => `
    <article class="info-card slot-home-row">
      <div>
        <h3>${slot.title}</h3>
        <p>${slot.desc}</p>
      </div>
      <span class="pill ${slot.closed ? "closed-pill" : ""}">${slotLabel(slot)}</span>
    </article>
  `).join("") || `<p class="small">No commission slot info yet.</p>`;
}
function changeSlotCurrent(id, delta) {
  const slots = loadSlots();
  const slot = slots.find(s => s.id === id);
  if (!slot) return;
  slot.current = Math.max(0, Math.min(slot.max, Number(slot.current || 0) + delta));
  slot.closed = false;
  saveSlots(slots);
  renderSlotAdmin(); renderCommissionInfo();
}
function changeSlotMax(id, delta) {
  const slots = loadSlots();
  const slot = slots.find(s => s.id === id);
  if (!slot) return;
  slot.max = Math.max(1, Number(slot.max || 1) + delta);
  slot.current = Math.min(Number(slot.current || 0), slot.max);
  saveSlots(slots);
  renderSlotAdmin(); renderCommissionInfo();
}
function toggleSlotClosed(id) {
  const slots = loadSlots();
  const slot = slots.find(s => s.id === id);
  if (!slot) return;
  slot.closed = !slot.closed;
  if (!slot.closed) slot.current = 0;
  saveSlots(slots);
  renderSlotAdmin(); renderCommissionInfo();
}
function renderSlotAdmin() {
  const box = document.getElementById("slotAdminList");
  if (!box) return;
  box.innerHTML = `<button type="button" class="btn" onclick="resetSlotsToDefault()">Reset default slots</button>` + loadSlots().map(slot => `
    <article class="slot-admin-row">
      <div>
        <strong>${slot.title}</strong>
        <p class="small">Public display: ${slotLabel(slot)}</p>
      </div>
      <div class="slot-controls">
        <span class="small">Used</span>
        <button type="button" class="btn" onclick="changeSlotCurrent('${slot.id}', -1)">−</button>
        <span class="pill">${slot.current}</span>
        <button type="button" class="btn" onclick="changeSlotCurrent('${slot.id}', 1)">+</button>
        <span class="small">Max</span>
        <button type="button" class="btn" onclick="changeSlotMax('${slot.id}', -1)">−</button>
        <span class="pill">${slot.max}</span>
        <button type="button" class="btn" onclick="changeSlotMax('${slot.id}', 1)">+</button>
        <button type="button" class="btn ${slot.closed ? "primary" : "danger"}" onclick="toggleSlotClosed('${slot.id}')">${slot.closed ? "Open" : "Close"}</button>
      </div>
    </article>
  `).join("");
}


function fileToDataURL(file) {
  return new Promise((resolve) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function randomPassword() {
  const words = ["mango", "fox", "star", "pearl", "moon", "lace", "berry", "pixel", "cloud", "milk", "rose", "sketch"];
  return `${words[Math.floor(Math.random()*words.length)]}-${Math.floor(10+Math.random()*90)}-${words[Math.floor(Math.random()*words.length)]}`;
}
function getStage(key) { return PROGRESS_STAGES.find(s => s.key === key) || PROGRESS_STAGES[0]; }
function stageOptions(selected="accepted", includeNone=false) {
  const none = includeNone ? `<option value="custom" ${selected === "custom" ? "selected" : ""}>Optional — no progress change</option>` : "";
  return none + PROGRESS_STAGE_GROUPS.map(group => `
    <optgroup label="${group.group}">
      ${group.stages.map(s => `<option value="${s.key}" ${s.key === selected ? "selected" : ""}>${s.label} — ${s.percent}%</option>`).join("")}
    </optgroup>
  `).join("");
}
function chatKey(id) { return `chat-${id}`; }
function loadChat(id) { return JSON.parse(localStorage.getItem(chatKey(id)) || "[]"); }
function saveChat(id, messages) { localStorage.setItem(chatKey(id), JSON.stringify(messages)); }
function getCommissionProgress(c) {
  if (!c.stages?.length) return 0;
  return Math.max(...c.stages.map(s => Number(s.percent || getStage(s.stageKey).percent || 0)));
}
function placeholderHTML(text = "Private Commission") { return `<div class="preview placeholder">${text}</div>`; }
function imageHTML(c) {
  if (c.privacy === "private" || !c.previewImage) return placeholderHTML(c.privacy === "private" ? "Private Preview" : "No Image Yet");
  return `<img class="preview" src="${c.previewImage}" alt="${c.clientName} character preview" onerror="this.outerHTML='<div class=&quot;preview placeholder&quot;>Image Error</div>'">`;
}

function renderQueue() {
  const grid = document.getElementById("queueGrid");
  if (!grid) return;
  const commissions = loadCommissions().filter(c => !c.archived);
  const counter = document.getElementById("queueCount");
  if (counter) counter.textContent = `${commissions.length} active`;
  grid.innerHTML = commissions.map(c => `
    <article class="commission-card">
      ${imageHTML(c)}
      <h3>${c.clientName}</h3>
      <p><strong>${c.type}</strong></p>
      <p class="small">Status: ${c.status}</p>
      <p class="small">Progress: ${getCommissionProgress(c)}%</p>
      <button class="btn primary" onclick="openPasswordModal('${c.id}')">Access Progress</button>
    </article>
  `).join("") || `<p class="small">No active commissions yet.</p>`;
}

function renderGallery() {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;
  const items = loadGallery();
  grid.innerHTML = items.map(item => `
    <button class="gallery-image-btn" onclick="openGalleryPreview('${item.id}')">
      <img src="${item.image}" alt="Gallery artwork">
    </button>
  `).join("") || `<p class="small">No gallery art uploaded yet.</p>`;
}
function openGalleryPreview(id) {
  const item = loadGallery().find(x => x.id === id);
  if (!item) return;
  const modal = document.getElementById("galleryModal");
  const img = document.getElementById("galleryModalImage");
  if (!modal || !img) return;
  img.src = item.image;
  modal.classList.remove("hidden");
}
function closeGalleryPreview() {
  const modal = document.getElementById("galleryModal");
  if (modal) modal.classList.add("hidden");
}

function openPasswordModal(id) {
  selectedCommissionId = id;
  document.getElementById("clientPassword").value = "";
  document.getElementById("passwordError").textContent = "";
  document.getElementById("passwordModal").classList.remove("hidden");
}
function closeModal() { document.getElementById("passwordModal").classList.add("hidden"); }
function checkPassword() {
  const commission = loadCommissions().find(c => c.id === selectedCommissionId && !c.archived);
  const pass = document.getElementById("clientPassword").value.trim();
  if (!commission || pass !== commission.password) {
    document.getElementById("passwordError").textContent = "Wrong password or commission was archived.";
    return;
  }
  sessionStorage.setItem("progressAccess", JSON.stringify({ id: commission.id, password: pass }));
  window.location.href = `progress.html?id=${encodeURIComponent(commission.id)}`;
}

function renderProgressPage() {
  const area = document.getElementById("progressArea");
  if (!area) return;
  const id = new URLSearchParams(window.location.search).get("id");
  const access = JSON.parse(sessionStorage.getItem("progressAccess") || "{}");
  const c = loadCommissions().find(item => item.id === id && !item.archived);
  if (!c || access.id !== c.id || access.password !== c.password) {
    area.innerHTML = `<div class="progress-card"><h1 class="page-title">Progress Locked</h1><p class="small">Please go back to the queue and enter the correct password.</p><a class="btn primary" href="queue.html">Back to Queue</a></div>`;
    return;
  }
  const progress = getCommissionProgress(c);
  area.innerHTML = `
    <div class="progress-layout">
      <div class="progress-card">
        <p class="eyebrow">Private progress page</p>
        <h1 class="page-title">${c.clientName} — ${c.type}</h1>
        <p class="small">Commission ID: ${c.id} • Status: ${c.status}</p>
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
        <p class="small">${progress}% complete</p>
        <div class="stage-list">
          ${c.stages.map(stage => `
            <article class="stage-card">
              <h3>${stage.done ? "✓" : "○"} ${stage.title} <span class="pill">${stage.percent ?? getStage(stage.stageKey).percent}%</span></h3>
              <p>${stage.desc}</p>
              ${stage.image ? `<img src="${stage.image}" alt="${stage.title} WIP">` : ""}
            </article>
          `).join("")}
        </div>
      </div>
      <aside class="client-chat">
        <h2>Chat</h2>
        <p class="small">Concept only: messages save in browser storage, not live across devices yet.</p>
        <div id="clientChatMessages" class="chat-messages"></div>
        <textarea id="clientChatInput" placeholder="Send a note or revision request..."></textarea>
        <button class="btn primary" onclick="sendChatMessage('${c.id}', 'client')">Send Message</button>
      </aside>
    </div>`;
  renderClientChat(c.id);
}


function adminLogin() {
  if (document.getElementById("adminPassword").value !== ADMIN_PASSWORD) return alert("Wrong admin password.");
  isAdmin = true;
  sessionStorage.setItem("adminOpen", "true");
  document.getElementById("adminLogin").classList.add("hidden");
  document.getElementById("adminDashboard").classList.remove("hidden");
  renderAdmin(); renderAdminGallery(); renderSlotAdmin(); renderCommissionInfo(); updateAdminOverview();
}

async function addCommission() {
  const commissions = loadCommissions();
  const selectedStartingStage = document.getElementById("startingStage").value;
  const firstStage = selectedStartingStage === "custom" ? null : getStage(selectedStartingStage);
  const file = document.getElementById("previewFile")?.files?.[0];
  const previewImage = await fileToDataURL(file);
  const newCommission = {
    id: `CM-${String(Date.now()).slice(-5)}`,
    clientName: document.getElementById("clientName").value || "Anonymous",
    type: document.getElementById("commissionType").value || "Commission",
    status: firstStage ? firstStage.label : "Waiting / Not started",
    privacy: document.getElementById("privacy").value,
    previewImage,
    password: randomPassword(),
    archived: false,
    stages: firstStage ? [{ stageKey: firstStage.key, title: firstStage.label, desc: "Commission added to the tracker.", image: "", done: firstStage.percent <= 10, percent: firstStage.percent }] : []
  };
  commissions.push(newCommission); saveCommissions(commissions);
  alert(`Created! Send this to the client:\nID: ${newCommission.id}\nPassword: ${newCommission.password}`);
  ["clientName","commissionType","previewFile"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  renderAdmin(); renderQueue();
}

async function addUpdate(id) {
  const commissions = loadCommissions();
  const c = commissions.find(item => item.id === id && !item.archived);
  if (!c) return;
  const selected = document.getElementById(`updateStage-${id}`).value;
  const customTitle = document.getElementById(`updateTitle-${id}`).value.trim();
  const desc = document.getElementById(`updateDesc-${id}`).value || "New progress update added.";
  const done = document.getElementById(`updateDone-${id}`).checked;
  const file = document.getElementById(`updateImage-${id}`)?.files?.[0];
  const image = await fileToDataURL(file);
  const currentProgress = getCommissionProgress(c);
  let title = customTitle || "Progress Update";
  let percent = currentProgress;
  let stageKey = "custom";

  if (selected !== "custom") {
    const stage = getStage(selected);
    stageKey = stage.key;
    percent = stage.percent;
    c.status = stage.label;
  } else if (customTitle) {
    c.status = customTitle;
  }

  c.stages.push({ stageKey, title, desc, image, done, percent });
  expandedAdminIds.add(id);
  saveCommissions(commissions);
  renderAdmin();
  alert(`Update added. Client progress is now ${getCommissionProgress(c)}%.`);
}

function sendChatMessage(id, sender) {
  const inputId = sender === "admin" ? `adminChatInput-${id}` : "clientChatInput";
  const input = document.getElementById(inputId);
  if (!input || !input.value.trim()) return;
  const messages = loadChat(id);
  messages.push({ sender, text: input.value.trim(), time: new Date().toLocaleString() });
  saveChat(id, messages);
  input.value = "";
  renderClientChat(id);
  renderAdminChat(id);
}
function renderClientChat(id) {
  const box = document.getElementById("clientChatMessages");
  if (!box) return;
  const messages = loadChat(id);
  box.innerHTML = messages.map(m => `<div class="chat-message ${m.sender}"><strong>${m.sender === "admin" ? "Artist" : "Client"}</strong><p>${m.text}</p><span>${m.time}</span></div>`).join("") || `<p class="small">No messages yet.</p>`;
}
function renderAdminChat(id) {
  const box = document.getElementById(`adminChatMessages-${id}`);
  if (!box) return;
  const messages = loadChat(id);
  box.innerHTML = messages.map(m => `<div class="chat-message ${m.sender}"><strong>${m.sender === "admin" ? "You" : "Client"}</strong><p>${m.text}</p><span>${m.time}</span></div>`).join("") || `<p class="small">No messages yet.</p>`;
}

function markStageDone(id, index) {
  const commissions = loadCommissions();
  const c = commissions.find(item => item.id === id && !item.archived);
  if (!c || !c.stages[index]) return;
  c.stages[index].done = !c.stages[index].done;
  expandedAdminIds.add(id);
  saveCommissions(commissions);
  renderAdmin();
}
async function replacePreview(id) {
  const commissions = loadCommissions();
  const c = commissions.find(item => item.id === id && !item.archived);
  const file = document.getElementById(`previewReplace-${id}`)?.files?.[0];
  if (!c || !file) return alert("Choose an image first.");
  c.previewImage = await fileToDataURL(file); c.privacy = "public";
  saveCommissions(commissions); renderAdmin();
}
function toggleAdminCommission(id) {
  const el = document.getElementById(`adminDetails-${id}`);
  if (!el) return;
  const willOpen = el.classList.contains("hidden");
  if (willOpen) expandedAdminIds.add(id);
  else expandedAdminIds.delete(id);
  el.classList.toggle("hidden", !willOpen);
}
function archiveCommission(id) {
  if (!confirm("Are you sure you want to archive this commission? It will disappear from the queue and the password will stop working.")) return;
  const commissions = loadCommissions();
  const c = commissions.find(item => item.id === id);
  if (c) { c.archived = true; c.password = "ARCHIVED"; }
  saveCommissions(commissions); renderAdmin(); renderQueue();
}
function unarchiveCommission(id) {
  const commissions = loadCommissions();
  const c = commissions.find(item => item.id === id);
  if (c) { c.archived = false; c.password = randomPassword(); }
  saveCommissions(commissions); renderAdmin();
}
async function addGalleryItem() {
  const file = document.getElementById("galleryFile")?.files?.[0];
  if (!file) return alert("Choose an image first.");
  const image = await fileToDataURL(file);
  const items = loadGallery();
  items.unshift({ id: `G-${Date.now()}`, image });
  saveGallery(items);
  document.getElementById("galleryFile").value = "";
  renderAdminGallery(); renderGallery();
}
function deleteGalleryItem(id) {
  saveGallery(loadGallery().filter(item => item.id !== id));
  renderAdminGallery(); renderGallery();
}
function renderAdminGallery() {
  const grid = document.getElementById("adminGalleryGrid");
  if (!grid) return;
  grid.innerHTML = loadGallery().map(item => `
    <div class="admin-gallery-item"><img src="${item.image}" alt="Gallery art"><button class="btn danger" onclick="deleteGalleryItem('${item.id}')">Delete</button></div>
  `).join("") || `<p class="small">No gallery uploads yet.</p>`;
}
function renderAdmin() {
  if (!isAdmin) return;
  const list = document.getElementById("adminList");
  const archiveList = document.getElementById("archiveList");
  if (!list) return;
  const all = loadCommissions();
  const active = all.filter(c => !c.archived);
  const archived = all.filter(c => c.archived);
  list.innerHTML = active.map(c => `
    <article class="admin-accordion">
      <button class="admin-summary" onclick="toggleAdminCommission('${c.id}')">
        <span><strong>${c.id} — ${c.clientName}</strong><br><small>${c.type} • ${c.status} • ${getCommissionProgress(c)}%</small></span>
        <span class="pill">Open</span>
      </button>
      <div id="adminDetails-${c.id}" class="admin-details ${expandedAdminIds.has(c.id) ? "" : "hidden"}">
        <p class="small">Password: <code>${c.password}</code></p>
        <div class="button-row"><input id="previewReplace-${c.id}" type="file" accept="image/*"><button type="button" class="btn" onclick="replacePreview('${c.id}')">Replace board image</button></div>
        <div class="update-box">
          <h4>Add progress update</h4>
          <div class="update-form">
            <input id="updateTitle-${c.id}" placeholder="Custom update title, e.g. Blocking out the pose">
            <select id="updateStage-${c.id}" title="Optional: choose a progress preset. Custom title stays separate.">${stageOptions("custom", true)}</select>
            <p class="small">Optional dropdown: use it only when you want to change the progress percentage/status. Your update title stays custom.</p>
            <textarea id="updateDesc-${c.id}" placeholder="Description for the client"></textarea>
            <input id="updateImage-${c.id}" type="file" accept="image/*">
            <label class="small"><input id="updateDone-${c.id}" type="checkbox" checked> Mark this stage as finished</label>
            <button class="btn primary" onclick="addUpdate('${c.id}')">Add Update</button>
          </div>
        </div>
        <div class="update-box"><h4>Current updates</h4>${c.stages.map((s,i)=>`<p class="small">${s.done?"✓":"○"} ${s.title} — ${s.percent ?? getStage(s.stageKey).percent}% <button class="text-btn" onclick="markStageDone('${c.id}', ${i})">toggle done</button></p>`).join("")}</div>
        <div class="update-box"><h4>Client chat</h4><div id="adminChatMessages-${c.id}" class="chat-messages small-chat"></div><textarea id="adminChatInput-${c.id}" placeholder="Reply to this client..."></textarea><button class="btn primary" onclick="sendChatMessage('${c.id}', 'admin')">Send Reply</button></div>
        <button class="btn danger" onclick="archiveCommission('${c.id}')">Finish / Archive</button>
      </div>
    </article>
  `).join("") || `<p class="small">No active commissions.</p>`;
  active.forEach(c => renderAdminChat(c.id));
  if (archiveList) archiveList.innerHTML = archived.map(c => `
    <article class="archive-row"><span>${c.id} — ${c.clientName} • ${c.type}</span><button type="button" class="btn" onclick="unarchiveCommission('${c.id}')">Restore</button></article>
  `).join("") || `<p class="small">No archived commissions.</p>`;
}

if (document.getElementById("startingStage")) document.getElementById("startingStage").innerHTML = stageOptions("custom", true);
if (sessionStorage.getItem("adminOpen") === "true" && document.getElementById("adminDashboard")) {
  isAdmin = true;
  document.getElementById("adminLogin").classList.add("hidden");
  document.getElementById("adminDashboard").classList.remove("hidden");
  renderAdmin(); renderAdminGallery(); renderSlotAdmin(); renderCommissionInfo();
}
renderQueue(); renderGallery(); renderProgressPage(); renderCommissionInfo();

// ---------- Site customization / UI theme settings ----------
const defaultSiteSettings = {
  title: "Welcome!",
  subtitle: "Digital artist & 3D modeler bringing your ideas to life.",
  commissionNote: "Contact me first through social media. Once accepted, your private progress page will be created.",
  holidayEnabled: false,
  manualTheme: "default",
  defaultBanner: "",
  defaultDoll: "",
  backgroundImage: "",
  navIcon: "✧",
  favicon: "",
  socials: [
    { id: "S-1", icon: "💬", label: "Discord", url: "discord.gg/yourlink" },
    { id: "S-2", icon: "📷", label: "Instagram", url: "@yourname" },
    { id: "S-3", icon: "✉", label: "Email", url: "your@email.com" }
  ],
  news: [
    { id: "N-1", date: "05/20", text: "3D commissions opening soon!" },
    { id: "N-2", date: "05/18", text: "New art added to gallery ♡" },
    { id: "N-3", date: "05/15", text: "Working on exciting projects!" }
  ],
  tosSections: [
    { id: "T-1", title: "Payment", text: "Add your payment rules, payment timing, and accepted platforms here." },
    { id: "T-2", title: "Cancellations & Refunds", text: "Add your cancellation and refund policy here." },
    { id: "T-3", title: "Revisions", text: "Add how many revision rounds are included and what counts as a major change." },
    { id: "T-4", title: "Usage Rights", text: "Add rules for personal use, commercial use, reposting, credit, and edits." },
    { id: "T-5", title: "Timeline", text: "Add your estimated turnaround time and what can delay a commission." },
    { id: "T-6", title: "Contact", text: "Add where clients should message you if they need changes or have questions." }
  ],
  themes: {
    february: { banner: "", doll: "", particles: true },
    october: { banner: "", doll: "", particles: false },
    december: { banner: "", doll: "", particles: true }
  }
};
function deepMergeSettings(saved) {
  const base = JSON.parse(JSON.stringify(defaultSiteSettings));
  if (!saved || typeof saved !== "object") return base;
  return {
    ...base,
    ...saved,
    themes: { ...base.themes, ...(saved.themes || {}) },
    socials: Array.isArray(saved.socials) ? saved.socials : base.socials,
    news: Array.isArray(saved.news) ? saved.news : base.news,
    tosSections: Array.isArray(saved.tosSections) ? saved.tosSections : base.tosSections
  };
}
function loadSiteSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("siteSettings") || "null");
    const settings = deepMergeSettings(saved);
    localStorage.setItem("siteSettings", JSON.stringify(settings));
    return settings;
  } catch {
    localStorage.setItem("siteSettings", JSON.stringify(defaultSiteSettings));
    return deepMergeSettings(defaultSiteSettings);
  }
}
function saveSiteSettings(settings) {
  localStorage.setItem("siteSettings", JSON.stringify(deepMergeSettings(settings)));
}
function getActiveTheme(settings = loadSiteSettings()) {
  if (!settings.holidayEnabled) return settings.manualTheme || "default";
  const month = new Date().getMonth() + 1;
  if (month === 2) return "february";
  if (month === 10) return "october";
  if (month === 12) return "december";
  return "default";
}
function themeLabel(theme) {
  return ({ default: "Default", february: "February", october: "Halloween", december: "Christmas" })[theme] || "Default";
}
function setFavicon(dataUrl) {
  let link = document.querySelector("link[rel='icon']");
  if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
  link.href = dataUrl;
}
function applySiteSettings() {
  const settings = loadSiteSettings();
  const active = getActiveTheme(settings);
  document.body.dataset.theme = active;
  if (settings.backgroundImage) document.body.style.setProperty("--custom-bg-image", `url('${settings.backgroundImage}')`);
  else document.body.style.removeProperty("--custom-bg-image");
  const brand = document.querySelector(".brand");
  if (brand) {
    const label = brand.textContent.replace(/^.*?\s/, "") || "YourName";
    brand.innerHTML = `<span class="brand-icon">${settings.navIcon || "✧"}</span> ${label}`;
  }
  if (settings.favicon) setFavicon(settings.favicon);

  const title = document.getElementById("homeTitle");
  const sub = document.getElementById("homeSubtitle");
  const note = document.getElementById("commissionInfoNote");
  if (title) title.textContent = settings.title;
  if (sub) sub.textContent = settings.subtitle;
  if (note) note.textContent = settings.commissionNote;

  const theme = active === "default" ? {} : (settings.themes[active] || {});
  const banner = theme.banner || settings.defaultBanner;
  const doll = theme.doll || settings.defaultDoll;
  const hero = document.getElementById("homeHero");
  if (hero) {
    if (banner) hero.style.backgroundImage = `linear-gradient(90deg, rgba(7,6,10,.62), rgba(7,6,10,.25)), url('${banner}')`;
    else hero.style.backgroundImage = "";
  }
  const dollEl = document.getElementById("pageDoll");
  const dollFallback = document.getElementById("pageDollFallback");
  if (dollEl) {
    if (doll) { dollEl.src = doll; dollEl.classList.remove("hidden"); if (dollFallback) dollFallback.classList.add("hidden"); }
    else { dollEl.classList.add("hidden"); if (dollFallback) dollFallback.classList.remove("hidden"); }
  }
  let particles = document.getElementById("themeParticles");
  if (!particles) {
    particles = document.createElement("div");
    particles.id = "themeParticles";
    particles.className = "theme-particles hidden";
    document.body.appendChild(particles);
  }
  const show = active !== "default" && settings.themes[active]?.particles;
  particles.classList.toggle("hidden", !show);
  particles.innerHTML = show ? Array.from({ length: 60 }, (_, i) => `<span style="--i:${i};--delay:${(i%12)*.34}s;--left:${(i*23)%100}%;--size:${5 + (i%5)}px;--dur:${7 + (i%6)}s;"></span>`).join("") : "";
  renderSocialLinks();
  renderFeaturedGallery();
  renderHomeQueuePreview();
  renderLatestNews();
  renderPricingPage();
  renderTosPage();
}
function renderSocialIcon(icon) {
  const value = String(icon || "♡").trim();
  if (value.startsWith("fa-") || value.includes(" fa-")) return `<i class="${value}" aria-hidden="true"></i>`;
  return `<span>${value}</span>`;
}
function safeLink(url) {
  const value = String(url || "").trim();
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("mailto:")) return value;
  return "#";
}
function renderSocialLinks() {
  const box = document.getElementById("socialLinks");
  if (!box) return;
  const settings = loadSiteSettings();
  box.innerHTML = settings.socials.map(link => `<a class="social-link" href="${safeLink(link.url)}" title="${link.url}"><span class="social-icon">${renderSocialIcon(link.icon)}</span><em>${link.label}</em><small>${link.url}</small></a>`).join("") || `<p class="small">No social links yet.</p>`;
}
function renderFeaturedGallery() {
  const box = document.getElementById("featuredGallery");
  if (!box) return;
  const items = loadGallery().slice(0, 6);
  box.innerHTML = items.map(item => `<img src="${item.image}" alt="Featured art">`).join("") || Array.from({length:6},()=>`<div class="featured-placeholder">Art</div>`).join("");
}

function renderHomeQueuePreview() {
  const box = document.getElementById("homeQueuePreview");
  if (!box) return;
  const active = loadCommissions().filter(c => !c.archived).slice(0, 4);
  box.innerHTML = active.map((c, i) => `
    <div class="home-table-row">
      <span>${i + 1}</span>
      <strong>${c.clientName}</strong>
      <em>${c.status}</em>
      <b>${getCommissionProgress(c)}%</b>
    </div>
  `).join("") || `<p class="small">No active commissions yet.</p>`;
}
function renderLatestNews() {
  const box = document.getElementById("latestNews");
  if (!box) return;
  const settings = loadSiteSettings();
  box.innerHTML = (settings.news || []).slice(0, 4).map(item => `
    <div class="news-row"><strong>${item.date}</strong><span>${item.text}</span></div>
  `).join("") || `<p class="small">No news yet.</p>`;
}


function renderPricingPage() {
  const grid = document.getElementById("pricingGrid");
  if (!grid) return;
  const slots = loadSlots();
  grid.innerHTML = slots.map(slot => `
    <article class="info-card pricing-card">
      <div class="mini-title"><span class="icon-badge">♡</span><div><h3>${slot.title}</h3><p>${slotLabel(slot)}</p></div></div>
      <p>${slot.desc}</p>
      <p class="small">Add pricing details, examples, options, and rules for this commission type later.</p>
    </article>
  `).join("");
}
function renderTosPage() {
  const grid = document.getElementById("tosGrid");
  if (!grid) return;
  const settings = loadSiteSettings();
  grid.innerHTML = (settings.tosSections || []).map(section => `
    <article class="info-card">
      <h3>${section.title}</h3>
      <p>${section.text}</p>
    </article>
  `).join("") || `<p class="small">No TOS sections yet.</p>`;
}
function renderTosAdmin() {
  const box = document.getElementById("tosAdminList");
  if (!box) return;
  const settings = loadSiteSettings();
  box.innerHTML = (settings.tosSections || []).map(section => `
    <div class="social-admin-row">
      <div><strong>${section.title}</strong><small>${section.text}</small></div>
      <button class="btn danger" onclick="deleteTosSection('${section.id}')">Delete</button>
    </div>
  `).join("") || `<p class="small">No TOS sections yet.</p>`;
}
function addTosSection() {
  const title = document.getElementById("tosTitle")?.value.trim();
  const text = document.getElementById("tosText")?.value.trim();
  if (!title || !text) return alert("Add a title and text first.");
  const settings = loadSiteSettings();
  settings.tosSections = settings.tosSections || [];
  settings.tosSections.push({ id: `T-${Date.now()}`, title, text });
  saveSiteSettings(settings);
  ["tosTitle","tosText"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  renderTosAdmin(); renderTosPage();
}
function deleteTosSection(id) {
  const settings = loadSiteSettings();
  settings.tosSections = (settings.tosSections || []).filter(section => section.id !== id);
  saveSiteSettings(settings); renderTosAdmin(); renderTosPage();
}

function showSettingsTab(name) {
  document.querySelectorAll(".settings-tab").forEach(btn => btn.classList.remove("active"));
  const buttons = Array.from(document.querySelectorAll(".settings-tab"));
  const clicked = buttons.find(btn => btn.textContent.toLowerCase().includes(name === "holiday" ? "theme" : name));
  if (clicked) clicked.classList.add("active");
  document.querySelectorAll(".settings-panel").forEach(panel => panel.classList.add("hidden"));
  const panel = document.getElementById(`settings-${name}`);
  if (panel) panel.classList.remove("hidden");
}
function loadSettingsAdmin() {
  const settings = loadSiteSettings();
  const setVal = (id, value) => { const el = document.getElementById(id); if (el) el.value = value; };
  const setCheck = (id, value) => { const el = document.getElementById(id); if (el) el.checked = Boolean(value); };
  setVal("settingTitle", settings.title);
  setVal("settingSubtitle", settings.subtitle);
  setVal("settingNote", settings.commissionNote);
  setCheck("holidayEnabled", settings.holidayEnabled);
  setVal("manualTheme", settings.manualTheme || "default");
  setVal("navIconInput", settings.navIcon || "✧");
  renderSocialAdmin();
  renderNewsAdmin();
  renderTosAdmin();
  loadThemeEditor();
}
function saveTextSettings() {
  const settings = loadSiteSettings();
  settings.title = document.getElementById("settingTitle")?.value || settings.title;
  settings.subtitle = document.getElementById("settingSubtitle")?.value || settings.subtitle;
  settings.commissionNote = document.getElementById("settingNote")?.value || settings.commissionNote;
  saveSiteSettings(settings); applySiteSettings(); alert("Homepage text saved.");
}
async function saveDefaultAppearance() {
  const settings = loadSiteSettings();
  const banner = await fileToDataURL(document.getElementById("defaultBannerFile")?.files?.[0]);
  const doll = await fileToDataURL(document.getElementById("defaultDollFile")?.files?.[0]);
  const bg = await fileToDataURL(document.getElementById("backgroundFile")?.files?.[0]);
  const fav = await fileToDataURL(document.getElementById("faviconFile")?.files?.[0]);
  const navIcon = document.getElementById("navIconInput")?.value.trim();
  if (banner) settings.defaultBanner = banner;
  if (doll) settings.defaultDoll = doll;
  if (bg) settings.backgroundImage = bg;
  if (fav) settings.favicon = fav;
  if (navIcon) settings.navIcon = navIcon;
  saveSiteSettings(settings); applySiteSettings(); alert("Default appearance saved.");
}
function clearDefaultImages() {
  const settings = loadSiteSettings();
  settings.defaultBanner = ""; settings.defaultDoll = ""; settings.backgroundImage = ""; settings.favicon = "";
  saveSiteSettings(settings); applySiteSettings(); alert("Default images cleared.");
}
function loadThemeEditor() {
  const settings = loadSiteSettings();
  const theme = document.getElementById("themeEditSelect")?.value || "february";
  const part = document.getElementById("holidayParticles");
  if (part) part.checked = Boolean(settings.themes[theme]?.particles);
}
async function saveHolidaySettings() {
  const settings = loadSiteSettings();
  settings.holidayEnabled = Boolean(document.getElementById("holidayEnabled")?.checked);
  settings.manualTheme = document.getElementById("manualTheme")?.value || "default";
  const theme = document.getElementById("themeEditSelect")?.value || "february";
  settings.themes[theme] = settings.themes[theme] || { banner: "", doll: "", particles: false };
  const banner = await fileToDataURL(document.getElementById("holidayBannerFile")?.files?.[0]);
  const doll = await fileToDataURL(document.getElementById("holidayDollFile")?.files?.[0]);
  if (banner) settings.themes[theme].banner = banner;
  if (doll) settings.themes[theme].doll = doll;
  settings.themes[theme].particles = Boolean(document.getElementById("holidayParticles")?.checked);
  saveSiteSettings(settings); applySiteSettings(); alert(`${themeLabel(theme)} theme saved.`);
}
function renderSocialAdmin() {
  const box = document.getElementById("socialAdminList");
  if (!box) return;
  const settings = loadSiteSettings();
  box.innerHTML = settings.socials.map(link => `<div class="social-admin-row"><span>${link.icon || '♡'} <strong>${link.label}</strong><small>${link.url}</small></span><button class="btn danger" onclick="deleteSocialLink('${link.id}')">Delete</button></div>`).join("") || `<p class="small">No links yet.</p>`;
}
function addSocialLink() {
  const settings = loadSiteSettings();
  const label = document.getElementById("socialLabel")?.value.trim();
  const icon = document.getElementById("socialIcon")?.value.trim() || "♡";
  const url = document.getElementById("socialUrl")?.value.trim();
  if (!label || !url) return alert("Add a label and link/username first.");
  settings.socials.push({ id: `S-${Date.now()}`, label, icon, url });
  saveSiteSettings(settings);
  ["socialLabel","socialIcon","socialUrl"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  renderSocialAdmin(); applySiteSettings();
}
function deleteSocialLink(id) {
  const settings = loadSiteSettings();
  settings.socials = settings.socials.filter(link => link.id !== id);
  saveSiteSettings(settings); renderSocialAdmin(); applySiteSettings();
}

function renderNewsAdmin() {
  const box = document.getElementById("newsAdminList");
  if (!box) return;
  const settings = loadSiteSettings();
  box.innerHTML = (settings.news || []).map(item => `<div class="social-admin-row"><span><strong>${item.date}</strong><small>${item.text}</small></span><button class="btn danger" onclick="deleteNewsItem('${item.id}')">Delete</button></div>`).join("") || `<p class="small">No news items yet.</p>`;
}
function addNewsItem() {
  const settings = loadSiteSettings();
  const date = document.getElementById("newsDate")?.value.trim();
  const text = document.getElementById("newsText")?.value.trim();
  if (!date || !text) return alert("Add a date and news text first.");
  settings.news = settings.news || [];
  settings.news.unshift({ id: `N-${Date.now()}`, date, text });
  saveSiteSettings(settings);
  ["newsDate","newsText"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  renderNewsAdmin(); applySiteSettings();
}
function deleteNewsItem(id) {
  const settings = loadSiteSettings();
  settings.news = (settings.news || []).filter(item => item.id !== id);
  saveSiteSettings(settings); renderNewsAdmin(); applySiteSettings();
}

if (document.getElementById("adminDashboard")) loadSettingsAdmin();
applySiteSettings();

// ---------- Final admin UI navigation helpers ----------
function showAdminPage(name) {
  document.querySelectorAll('.admin-page').forEach(page => page.classList.remove('active'));
  const target = document.getElementById(`adminPage-${name}`);
  if (target) target.classList.add('active');
  document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.adminPage === name));
  updateAdminOverview();
}
function updateAdminOverview() {
  const commissions = loadCommissions();
  const active = commissions.filter(c => !c.archived);
  const gallery = loadGallery();
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  set('adminTotalCommissions', commissions.length);
  set('adminActiveCommissions', active.length);
  set('adminGalleryCount', gallery.length);
}
document.addEventListener('click', (event) => {
  const adminBtn = event.target.closest('[data-admin-page]');
  if (adminBtn) showAdminPage(adminBtn.dataset.adminPage);
  const jumpBtn = event.target.closest('[data-admin-jump]');
  if (jumpBtn) showAdminPage(jumpBtn.dataset.adminJump);
  const tabBtn = event.target.closest('[data-settings-tab]');
  if (tabBtn) showSettingsTab(tabBtn.dataset.settingsTab);
});
updateAdminOverview();

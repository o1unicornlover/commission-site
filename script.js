const ADMIN_PASSWORD = "admin123"; // Concept only. Real security needs a backend.
let selectedCommissionId = null;
let isAdmin = false;

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
  const none = includeNone ? `<option value="custom" ${selected === "custom" ? "selected" : ""}>Custom title only — keep current progress</option>` : "";
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
  renderAdmin(); renderAdminGallery();
}

async function addCommission() {
  const commissions = loadCommissions();
  const firstStage = getStage(document.getElementById("startingStage").value);
  const file = document.getElementById("previewFile")?.files?.[0];
  const previewImage = await fileToDataURL(file);
  const newCommission = {
    id: `CM-${String(Date.now()).slice(-5)}`,
    clientName: document.getElementById("clientName").value || "Anonymous",
    type: document.getElementById("commissionType").value || "Commission",
    status: firstStage.label,
    privacy: document.getElementById("privacy").value,
    previewImage,
    password: randomPassword(),
    archived: false,
    stages: [{ stageKey: firstStage.key, title: firstStage.label, desc: "Commission added to the tracker.", image: "", done: firstStage.percent <= 10, percent: firstStage.percent }]
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
  saveCommissions(commissions); renderAdmin();
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
  if (el) el.classList.toggle("hidden");
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
      <div id="adminDetails-${c.id}" class="admin-details hidden">
        <p class="small">Password: <code>${c.password}</code></p>
        <div class="button-row"><input id="previewReplace-${c.id}" type="file" accept="image/*"><button class="btn" onclick="replacePreview('${c.id}')">Replace board image</button></div>
        <div class="update-box">
          <h4>Add progress update</h4>
          <div class="update-form">
            <input id="updateTitle-${c.id}" placeholder="Custom update title, e.g. Blocking out the pose">
            <select id="updateStage-${c.id}" title="Optional: choose a progress preset. Custom title stays separate.">${stageOptions("custom", true)}</select>
            <p class="small">The dropdown only changes the progress percentage/status. Your title stays custom.</p>
            <textarea id="updateDesc-${c.id}" placeholder="Description for the client"></textarea>
            <input id="updateImage-${c.id}" type="file" accept="image/*">
            <label class="small"><input id="updateDone-${c.id}" type="checkbox" checked> Mark this stage as finished</label>
            <button class="btn primary" onclick="addUpdate('${c.id}')">Add Update</button>
          </div>
        </div>
        <div class="update-box"><h4>Current updates</h4>${c.stages.map((s,i)=>`<p class="small">${s.done?"✓":"○"} ${s.title} — ${s.percent ?? getStage(s.stageKey).percent}% <button class="text-btn" onclick="markStageDone('${c.id}', ${i})">toggle</button></p>`).join("")}</div>
        <div class="update-box"><h4>Client chat</h4><div id="adminChatMessages-${c.id}" class="chat-messages small-chat"></div><textarea id="adminChatInput-${c.id}" placeholder="Reply to this client..."></textarea><button class="btn primary" onclick="sendChatMessage('${c.id}', 'admin')">Send Reply</button></div>
        <button class="btn danger" onclick="archiveCommission('${c.id}')">Finish / Archive</button>
      </div>
    </article>
  `).join("") || `<p class="small">No active commissions.</p>`;
  active.forEach(c => renderAdminChat(c.id));
  if (archiveList) archiveList.innerHTML = archived.map(c => `
    <article class="archive-row"><span>${c.id} — ${c.clientName} • ${c.type}</span><button class="btn" onclick="unarchiveCommission('${c.id}')">Restore</button></article>
  `).join("") || `<p class="small">No archived commissions.</p>`;
}

if (document.getElementById("startingStage")) document.getElementById("startingStage").innerHTML = stageOptions("accepted");
if (sessionStorage.getItem("adminOpen") === "true" && document.getElementById("adminDashboard")) {
  isAdmin = true;
  document.getElementById("adminLogin").classList.add("hidden");
  document.getElementById("adminDashboard").classList.remove("hidden");
  renderAdmin(); renderAdminGallery();
}
renderQueue(); renderGallery(); renderProgressPage();

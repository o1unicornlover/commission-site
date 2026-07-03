const ADMIN_PASSWORD = "admin123"; // Concept only. Real security needs a backend.
let selectedCommissionId = null;
let isAdmin = false;

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
      { title: "Payment Received", desc: "Commission accepted and added to the queue.", image: "", done: true },
      { title: "Blocking", desc: "Base proportions and pose are being sculpted.", image: "", done: true },
      { title: "Refinement", desc: "Anatomy, clothes, and hair details come next.", image: "", done: false }
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
      { title: "Payment Received", desc: "Commission accepted and waiting to start.", image: "", done: true },
      { title: "Sketch", desc: "Sketching has not started yet.", image: "", done: false }
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

function saveCommissions(commissions) {
  localStorage.setItem("commissions", JSON.stringify(commissions));
}

function randomPassword() {
  const words = ["mango", "fox", "star", "pearl", "moon", "lace", "berry", "pixel", "cloud", "milk", "rose", "sketch"];
  const a = words[Math.floor(Math.random() * words.length)];
  const b = Math.floor(10 + Math.random() * 90);
  const c = words[Math.floor(Math.random() * words.length)];
  return `${a}-${b}-${c}`;
}

function placeholderHTML(text = "Private Commission") {
  return `<div class="preview placeholder">${text}</div>`;
}

function imageHTML(c) {
  if (c.privacy === "private" || !c.previewImage) return placeholderHTML(c.privacy === "private" ? "Private Preview" : "No Image Yet");
  return `<img class="preview" src="${c.previewImage}" alt="${c.clientName} character preview">`;
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
      <button class="btn primary" onclick="openPasswordModal('${c.id}')">Access Progress</button>
    </article>
  `).join("") || `<p class="small">No active commissions yet.</p>`;
}

function renderGallery() {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;
  const archived = loadCommissions().filter(c => c.archived);
  grid.innerHTML = archived.map(c => `
    <article class="gallery-card">
      ${imageHTML(c)}
      <h3>${c.type}</h3>
      <p class="small">Archived commission by ${c.clientName}</p>
    </article>
  `).join("") || `<p class="small">Finished work can appear here later.</p>`;
}

function openPasswordModal(id) {
  selectedCommissionId = id;
  document.getElementById("clientPassword").value = "";
  document.getElementById("passwordError").textContent = "";
  document.getElementById("passwordModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("passwordModal").classList.add("hidden");
}

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

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const access = JSON.parse(sessionStorage.getItem("progressAccess") || "{}");
  const c = loadCommissions().find(item => item.id === id && !item.archived);

  if (!c || access.id !== c.id || access.password !== c.password) {
    area.innerHTML = `
      <div class="progress-card">
        <h1 class="page-title">Progress Locked</h1>
        <p class="small">Please go back to the queue and enter the correct password.</p>
        <a class="btn primary" href="queue.html">Back to Queue</a>
      </div>
    `;
    return;
  }

  const doneCount = c.stages.filter(s => s.done).length;
  const progress = Math.round((doneCount / c.stages.length) * 100);
  area.innerHTML = `
    <div class="progress-card">
      <p class="eyebrow">Private progress page</p>
      <h1 class="page-title">${c.clientName} — ${c.type}</h1>
      <p class="small">Commission ID: ${c.id} • Status: ${c.status}</p>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
      <p class="small">${progress}% complete</p>
      <div class="stage-list">
        ${c.stages.map(stage => `
          <article class="stage-card">
            <h3>${stage.done ? "✓" : "○"} ${stage.title}</h3>
            <p>${stage.desc}</p>
            ${stage.image ? `<img src="${stage.image}" alt="${stage.title} WIP">` : ""}
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function adminLogin() {
  const pass = document.getElementById("adminPassword").value;
  if (pass !== ADMIN_PASSWORD) return alert("Wrong admin password.");
  isAdmin = true;
  document.getElementById("adminLogin").classList.add("hidden");
  document.getElementById("adminDashboard").classList.remove("hidden");
  renderAdmin();
}

function addCommission() {
  const commissions = loadCommissions();
  const statusValue = document.getElementById("status").value || "Waiting";
  const newCommission = {
    id: `CM-${String(Date.now()).slice(-5)}`,
    clientName: document.getElementById("clientName").value || "Anonymous",
    type: document.getElementById("commissionType").value || "Commission",
    status: statusValue,
    privacy: document.getElementById("privacy").value,
    previewImage: document.getElementById("previewImage").value,
    password: randomPassword(),
    archived: false,
    stages: [
      { title: "Payment Received", desc: "Commission accepted and added to the queue.", image: "", done: true },
      { title: statusValue, desc: "Progress update will be added here.", image: "", done: false }
    ]
  };
  commissions.push(newCommission);
  saveCommissions(commissions);
  alert(`Created! Send this to the client:\nID: ${newCommission.id}\nPassword: ${newCommission.password}`);
  renderQueue();
  renderGallery();
  renderAdmin();
}

function archiveCommission(id) {
  const okay = confirm("Are you sure you want to archive this commission? It will disappear from the queue and the password will stop working.");
  if (!okay) return;
  const commissions = loadCommissions();
  const c = commissions.find(item => item.id === id);
  if (c) {
    c.archived = true;
    c.password = "ARCHIVED";
  }
  saveCommissions(commissions);
  renderQueue();
  renderGallery();
  renderAdmin();
}

function renderAdmin() {
  if (!isAdmin) return;
  const list = document.getElementById("adminList");
  if (!list) return;
  const commissions = loadCommissions().filter(c => !c.archived);
  list.innerHTML = commissions.map(c => `
    <article class="admin-card">
      <div>
        <h4>${c.id} — ${c.clientName}</h4>
        <p>${c.type} • ${c.status}</p>
        <p class="small">Password: <code>${c.password}</code></p>
      </div>
      <button class="btn danger" onclick="archiveCommission('${c.id}')">Finish / Archive</button>
    </article>
  `).join("") || `<p class="small">No active commissions.</p>`;
}

renderQueue();
renderGallery();
renderProgressPage();

/*
  Refactor Stage 2 - shared utility helpers.
  Kept global for compatibility with the current HTML onclick handlers.
*/

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

function placeholderHTML(text = "Private Commission") { return `<div class="preview placeholder">${text}</div>`; }

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function safeLink(url) {
  const value = String(url || "").trim();
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("mailto:")) return value;
  return "#";
}

function renderSocialIcon(icon) {
  const value = String(icon || "♡").trim();
  if (value.startsWith("fa-") || value.includes(" fa-")) return `<i class="${value}" aria-hidden="true"></i>`;
  return `<span>${value}</span>`;
}

function themeLabel(theme) {
  return ({ default: "Default", february: "February", october: "Halloween", december: "Christmas" })[theme] || "Default";
}

function setFavicon(dataUrl) {
  let link = document.querySelector("link[rel='icon']");
  if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
  link.href = dataUrl;
}

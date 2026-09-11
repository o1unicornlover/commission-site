/*
  Refactor Stage 3 - shared utility and workflow helpers.
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

function getStage(key) {
  return PROGRESS_STAGES.find(s => s.key === key) || PROGRESS_STAGES[0];
}

function stageOptions(selected="waiting", includeNone=false) {
  const none = includeNone
    ? `<option value="custom" ${selected === "custom" ? "selected" : ""}>General Update — no progress change</option>`
    : "";

  return none + PROGRESS_STAGE_GROUPS.map(group => `
    <optgroup label="${group.group}">
      ${group.stages.map(s => `<option value="${s.key}" ${s.key === selected ? "selected" : ""}>${s.label} — ${s.percent}%</option>`).join("")}
    </optgroup>
  `).join("");
}

function commissionWorkflowKey(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("animation") || value.includes("anim")) return "animation";
  if (value.includes("3d") || value.includes("model") || value.includes("sculpt")) return "3d";
  if (value.includes("2d") || value.includes("illustration") || value.includes("art") || value.includes("drawing")) return "2d";
  return "other";
}

function stageKeyFromLabel(label) {
  const normalized = String(label || "").trim().toLowerCase();
  if (!normalized) return "";

  const exact = PROGRESS_STAGES.find(stage => String(stage.label).toLowerCase() === normalized);
  if (exact) return exact.key;

  // Compatibility with labels saved before the simplified workflow.
  const aliases = {
    "client review": "awaiting-feedback",
    "final polish": "awaiting-feedback",
    "complete / delivered": "complete",
    "waiting": "waiting",
    "waiting / not started": "waiting",
    "storyboard / plan": "anim-sketch",
    "animation — storyboard / plan": "anim-sketch",
    "rough export / preview": "anim-rough-export",
    "render / final preview": "3d-render"
  };

  if (aliases[normalized]) return aliases[normalized];

  return PROGRESS_STAGES.find(stage => normalized.includes(String(stage.label).toLowerCase()))?.key || "";
}

function workflowForCommission(type) {
  return COMMISSION_STAGE_SEQUENCES[commissionWorkflowKey(type)] || COMMISSION_STAGE_SEQUENCES.other;
}

function nextStageForCommission(type, currentLabel) {
  const sequence = workflowForCommission(type);
  const currentKey = stageKeyFromLabel(currentLabel);

  if (!currentKey) {
    const firstKey = sequence[0];
    return firstKey ? getStage(firstKey) : null;
  }

  const index = sequence.indexOf(currentKey);
  if (index < 0 || index >= sequence.length - 1) return null;
  return getStage(sequence[index + 1]);
}

function placeholderHTML(text = "Private Commission") {
  return `<div class="preview placeholder">${text}</div>`;
}

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
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = dataUrl;
}

/*
  Refactor Stage 3 - constants and shared workflow state.
  Progress presets are intentionally concise; General Update is handled as a
  non-milestone update and does not change the progress percentage/status.
*/
const ADMIN_PASSWORD = "admin123"; // Temporary compatibility only. Replace with Supabase Auth before production.
let selectedCommissionId = null;
let isAdmin = false;
let expandedAdminIds = new Set();

const PROGRESS_STAGE_GROUPS = [
  {
    group: "General",
    stages: [
      { key: "waiting", label: "Waiting / In Queue", percent: 0 },
      { key: "awaiting-feedback", label: "Awaiting Client Feedback", percent: 95 },
      { key: "complete", label: "Complete / Delivered", percent: 100 }
    ]
  },
  {
    group: "2D Art",
    stages: [
      { key: "2d-sketch", label: "Sketch", percent: 15 },
      { key: "2d-lineart", label: "Lineart", percent: 30 },
      { key: "2d-flats", label: "Flat Colors", percent: 45 },
      { key: "2d-coloring", label: "Coloring", percent: 65 },
      { key: "2d-rendering", label: "Rendering", percent: 85 }
    ]
  },
  {
    group: "3D Art",
    stages: [
      { key: "3d-blocking", label: "Blocking", percent: 15 },
      { key: "3d-base", label: "Base Sculpt", percent: 30 },
      { key: "3d-refine", label: "Refining Shapes", percent: 45 },
      { key: "3d-hair-clothes", label: "Hair / Clothes", percent: 55 },
      { key: "3d-details", label: "Details", percent: 65 },
      { key: "3d-retopo", label: "Retopology", percent: 75 },
      { key: "3d-uv", label: "UV Mapping", percent: 82 },
      { key: "3d-texture", label: "Texturing", percent: 88 },
      { key: "3d-render", label: "Render / Preview", percent: 92 }
    ]
  },
  {
    group: "Animation",
    stages: [
      { key: "anim-sketch", label: "Sketch", percent: 15 },
      { key: "anim-rough", label: "Rough Motion", percent: 35 },
      { key: "anim-cleanup", label: "Cleanup", percent: 55 },
      { key: "anim-color", label: "Color / Texture", percent: 70 },
      { key: "anim-render", label: "Rendering", percent: 85 },
      { key: "anim-rough-export", label: "Rough Export", percent: 92 },
      { key: "anim-final", label: "Final Export", percent: 98 }
    ]
  }
];
const PROGRESS_STAGES = PROGRESS_STAGE_GROUPS.flatMap(group => group.stages);

const COMMISSION_STAGE_SEQUENCES = {
  "2d": [
    "2d-sketch",
    "2d-lineart",
    "2d-flats",
    "2d-coloring",
    "2d-rendering",
    "awaiting-feedback",
    "complete"
  ],
  "3d": [
    "3d-blocking",
    "3d-base",
    "3d-refine",
    "3d-hair-clothes",
    "3d-details",
    "3d-retopo",
    "3d-uv",
    "3d-texture",
    "3d-render",
    "awaiting-feedback",
    "complete"
  ],
  "animation": [
    "anim-sketch",
    "anim-rough",
    "anim-cleanup",
    "anim-color",
    "anim-render",
    "anim-rough-export",
    "awaiting-feedback",
    "anim-final",
    "complete"
  ],
  "other": ["waiting", "awaiting-feedback", "complete"]
};

// Kept only so older localStorage compatibility functions do not crash while
// the remaining legacy file is being split up. Supabase is the live source of truth.
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
      { stageKey: "3d-blocking", title: "Blocking", desc: "Base proportions and pose are being sculpted.", image: "", done: true, percent: 15 }
    ]
  },
  {
    id: "CM-002",
    clientName: "Private Client",
    type: "2D Art",
    status: "Waiting / In Queue",
    privacy: "private",
    previewImage: "",
    password: "star-18-milk",
    archived: false,
    stages: []
  }
];

const defaultSlotSettings = [
  { id: "2d", title: "2D Art", desc: "Character art, outfit design, rendered illustrations.", price: "", current: 0, max: 4, closed: false },
  { id: "3d", title: "3D Model", desc: "Character models, sculpts, figure-style models, and 3D previews.", price: "", current: 0, max: 2, closed: false },
  { id: "anim", title: "Animation", desc: "Short loops, character animation, simple motion tests.", price: "", current: 0, max: 2, closed: true }
];

window.App = window.App || {};
window.App.State = window.App.State || {};
window.App.Progress = window.App.Progress || {};

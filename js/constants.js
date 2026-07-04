/*
  Refactor Stage 2 - constants and global state.
  These values used to live at the top of legacy-app.js.
*/
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


const defaultSlotSettings = [
  { id: "2d", title: "2D Art", desc: "Character art, outfit design, rendered illustrations.", price: "", current: 0, max: 4, closed: false },
  { id: "3d", title: "3D Model", desc: "Character models, sculpts, figure-style models, and 3D previews.", price: "", current: 0, max: 2, closed: false },
  { id: "anim", title: "Animation", desc: "Short loops, character animation, simple motion tests.", price: "", current: 0, max: 2, closed: true }
];

window.App = window.App || {};
window.App.State = window.App.State || {};

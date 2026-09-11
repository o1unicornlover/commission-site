# Commission Website — Project Status

## Source of truth
- Live branch: `main`
- ChatGPT development branch: `chatgpt-finish-site`
- Backend: Supabase project `gqqssyqswyualglleedm`

## Current stage
Stage 2 refactor is installed. Feature-based Supabase API modules, shared constants/utilities, and targeted autosync are already present. Most remaining frontend feature logic still lives in `js/legacy-app.js` as a compatibility layer.

## In progress
1. Simplify progress workflow.
2. Preserve **General Update** as a non-progress post.
3. Add **Awaiting Client Feedback** as the review state.
4. Keep the client progress bar with current stage and next step.
5. Continue splitting `js/legacy-app.js` without regressing chat/progress polling.

## Planned after refactor
- Attachments / references / deliverables
- Commission activity timeline
- Revenue dashboard
- Kanban board with 2D / 3D / Animation / Other filters
- Notifications
- Secure admin authentication
- Later: PayPal webhook verification and deeper seasonal design polish

## Progress presets
### 2D
Sketch → Lineart → Flat Colors → Coloring → Rendering → Awaiting Client Feedback → Complete

### 3D
Current modeling stages stay for now; Render / Preview → Awaiting Client Feedback → Complete

### Animation
Sketch → Rough Motion → Cleanup → Color / Texture → Rendering → Rough Export → Awaiting Client Feedback → Final Export → Complete

### General Update
Does not change the progress percentage or the commission's current milestone.

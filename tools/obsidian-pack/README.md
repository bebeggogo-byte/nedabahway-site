# Obsidian Graph View — Neural Dark Pack

Apply pack for the actual Obsidian desktop app graph view (NOT the `vault/brain.html` page in this repo — that one is already optimized via PR #67).

The pack delivers two things:

1. **Performance** — recommended `graph.json` settings + filter strategy that fix the laggy/heavy-graph problem when the vault has many notes
2. **Aesthetics** — a CSS snippet that gives the graph view the same neural-dark palette as `brain.html`

Obsidian's graph view renders nodes/edges/labels to `<canvas>`, so SVG-style transforms and CSS animations from `brain.html` cannot apply here. The levers Obsidian actually exposes are:

- `graph.json` settings (forces, filters, display)
- CSS custom properties on `.graph-view.color-*` (color tokens the canvas reads)
- `colorGroups` (per-tag/folder colors via the graph control panel)
- Community plugins (for advanced visuals)

This pack uses all four.

---

## Install

### 1. Visual snippet (do first — zero risk)

Copy `snippets/graph-neural-dark.css` into your vault:

```
<your-vault>/.obsidian/snippets/graph-neural-dark.css
```

Then in Obsidian: **Settings → Appearance → CSS snippets → reload, then toggle `graph-neural-dark` on**.

You should see the graph immediately switch to the dark navy palette with teal default nodes, purple tags, blue attachments, cream-on-teal highlight.

If you don't like a color, edit the snippet — values map 1:1 to the variable names.

### 2. Performance settings (do via the UI, do NOT overwrite graph.json)

Open the graph view, click the gear icon (control panel), and apply these:

| Section | Setting | Recommended | Why |
|---|---|---|---|
| **Filters** | Show orphans | OFF | Orphans are dead weight — hides isolated notes that just noise the layout |
| Filters | Show attachments | OFF (or limited) | Attachments inflate node count fast |
| Filters | Show tags | ON only if used | Tags become hub-nodes; useful but heavy |
| Filters | Hide unresolved | ON | Hides links to non-existent notes |
| Filters | Search | (use to scope) | E.g. `path:lectures` to show only lecture notes — biggest single perf win |
| **Display** | Arrows | OFF | Drawing arrowheads ~doubles edge render cost |
| Display | Text fade threshold | ~0.5–0.7 | Higher value = labels disappear sooner when zoomed out (huge perf win on big graphs) |
| Display | Node size | 1.0–1.2 | Larger nodes = fewer pixels per node-area to repaint |
| Display | Line thickness | 0.7–0.9 | Thinner lines render faster |
| **Forces** | Center force | 0.5 | Pulls cluster center fast — settles quicker |
| Forces | Repel force | 8 | Default is 10; lower = quicker settle |
| Forces | Link force | 0.8 | Default 1.0; slightly lower = less oscillation |
| Forces | Link distance | 200–250 | Larger = less overlap to compute |

Two rules:
- **Always start with Filters.** Reducing node count is 10× more effective than tuning forces. Use the search field aggressively.
- **Don't touch graph.json by hand.** Use the UI. Obsidian saves your changes automatically.

### 3. Color groups (optional — for the lecture demo)

Color groups are queries that paint matching nodes a specific color. Set up a few that match how you organize notes. Examples:

| Query | Color | Intent |
|---|---|---|
| `path:lectures` | `#1abc9c` (teal) | Active lecture material |
| `path:archive` | `#566479` (stone) | Background, dimmed |
| `tag:#core` | `#f5e9d7` (cream) | Core concepts pop |
| `tag:#question` | `#e74c3c` (red) | Open questions |
| `tag:#review` | `#9b59b6` (purple) | Needs review |

Add via the graph control panel → Color groups → +. Order matters: first match wins.

---

## Recommended community plugins (in order of value)

For when the built-in graph view hits its ceiling:

1. **Extended Graph** (Lithou) — add icons/images on nodes, custom styling per group. Best return for "lecture-pretty" goal.
2. **Graph Analysis** (SkepticMystic) — adjacency matrix, centrality, community detection. More analytical than visual.
3. **Juggl** (HEmile) — Cytoscape-based alternative graph view. Fully styleable, much more customizable. Heavier dependency.
4. **3D Graph** (AlexW00) — 3D force layout. Eye candy for demos, not for daily work.

Install via **Settings → Community plugins → Browse**.

---

## Troubleshooting

**Snippet doesn't apply** — Did you reload snippets after dropping the file? The reload button is next to the snippets list.

**Graph still laggy after settings change** — Run the search filter. Dropping node count from 5000 to 500 fixes lag in any graph engine. There's no software fix for "all 5000 visible at once" on a non-GPU canvas.

**Colors look weird** — Your theme might override `.graph-view.color-*`. Try Obsidian's default theme to confirm the snippet works, then adjust your theme or layer specificity.

**Want stronger visual tone** — Edit the snippet's color values; or move to Juggl plugin which renders to SVG and supports CSS transforms / animations like the `brain.html` page does.

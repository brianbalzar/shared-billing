# Shared Billing — build rules

Final direction. Screens: `Shared Billing Final.dc.html`. Tokens: `tokens.css`. Every rule below uses semantic token names.

## Color rules
- `color-direct` only on: direct shared-credit links, chosen actors, the selected direct link, primary buttons ("Try it", "Allow 1 person in between"). Never on filters, sliders, secondary buttons, overflow, pins, or list hover.
- `color-route` only on the one selected indirect route: path stroke, bridge ring, route link labels, panel key.
- Everything the app added (bridges, hubs, indirect links, overflow) uses `color-bridge*`.
- State never relies on color alone: chosen = size + border + `shadow-selected`; selected direct link = halo; selected route = heavier stroke + ring + panel context.

## Nodes
| Node | Size | Treatment |
| --- | --- | --- |
| Chosen actor | `size-node-chosen` | `color-direct-surface` fill, 3px `color-direct` border, `shadow-selected`, headshot full color, remove control top-right, pin badge top-left when pinned |
| Hub (bridges 3+ chosen) | `size-node-hub` | `color-bridge-surface`, `ring-hub`, sub-label "Links all N" |
| Bridge | `size-node-bridge` | `color-bridge-surface`, desaturated headshot, name below |
| Bridge on selected route | `size-node-bridge` | adds `ring-route`, name weight 700 |
| Overflow | pill, `size-overflow-height` | rest: `color-border-strong`; hover: `color-text-muted` border + `color-muted`; open: 2px `color-border-active`. Never coral |
| Add | `size-node-add` | 2px dashed `color-text-disabled`, plus icon. Hidden at 6 actors |

Headshot fallback: initials in `font-display`. Names: `font-display`. Everything else: `font-ui`.

## Links
- Stroke from shared-film count: `stroke-1` … `stroke-6`. Direct = `color-direct`, indirect = `color-bridge`, overflow = `stroke-overflow` dashed.
- Labels: direct shows "N shared films" (or the title for 1); indirect shows the film title, quiet, no border.
- Every link and node is focusable and clickable; focus shows `ring-focus`.

## Selection and panels
- Click direct link → halo, panel "Shared films": film rows (poster, title, year, each actor's role).
- Click bridge actor or indirect link → route goes `color-route` (+`stroke-route-extra`), unrelated links/nodes drop to `opacity-dimmed`, panel "Why this co-star appears": one block per side with the linking film and both roles.
- Click overflow → panel "Co-stars in between": rows show the film on each side, "Show" adds to graph, "Show all N in graph".
- Panel opens at `size-panel` on the right; graph re-centers in the remaining width. Esc or × closes and clears selection.
- TMDB attribution: canvas bottom-left, or panel footer when open.

## Controls (quiet)
- Top bar: wordmark + subtitle "Find the actors who connect any two stars.", search, "People in between" slider 0–3 (ink, not coral), films filter (text button → settings popover), Reset layout (enabled only when something is pinned).
- No `shadow-selected`/`shadow-panel` on ordinary controls. `color-border-active` only on focused/active inputs and important panels.
- Typeahead: `shadow-popover`, active row `color-muted`, rows = headshot, name (display), birth year, known-for · film count.

## First use
Empty state: add node, headline, one-line explanation, search, and one featured example card "Tom Hanks + Audrey Hepburn — No shared film, but two co-stars connect them." with a primary "Try it" button. Card uses `shadow-panel`.

## Deeper paths
Show one route; it counts as selected (gold). Stepper "Route 1 of N · All have K people in between". Never draw all routes.

## Motion
- Link found: stroke draws A→B over `dur-link-draw`.
- Bridge added: fade + scale .85→1 over `dur-bridge-in`, 40ms stagger.
- Layout settles within `dur-settle-max`, then stops. No idle drift. Dragged nodes pin where dropped; Reset layout releases them.
- `prefers-reduced-motion`: everything appears in place.

## Edge states
- Loading: one muted line "Rolling the credits…" + thin muted bar; chosen nodes already placed.
- No connection (slider at 0): card with `shadow-panel`, primary "Allow 1 person in between".

# Handoff: Shared Billing (co-star finder)

## Overview
Shared Billing is a single-page desktop web app. The user picks 2–6 actors and the app draws how they connect through films. Chosen actors are large bubbles. A direct shared film is a coral link between them. When two chosen actors never shared a film, the app finds the shortest chain of co-stars and adds them as smaller "bridge" bubbles. Every link and bridge opens the films behind it as evidence.

Personal project. Desktop-first (designed at 1440 × 900), light and dark mode, single static page backed by preprocessed IMDb data plus TMDB images.

## About the design files
The files in `design/` are **design references built in HTML**. They show the intended look and behavior; they are not production code to copy. Recreate them in the target stack. If the project has no stack yet, a good fit is **Vite + React + TypeScript**, with **SVG for links** and absolutely positioned DOM for nodes, and **d3-force** run to convergence (not continuously). Use `tokens.css` as-is; it is written to be consumed directly.

The frames are static: node positions are hand-placed to show intended density. In the product, positions come from the force layout (see Layout below).

## Fidelity
**High fidelity.** Colors, type, sizes, strokes, radii, shadows and copy are final. Match them exactly using the tokens.

## Files
- `design/Shared Billing Final (standalone).html`: open in any browser, works offline. Every state in light and dark, plus a components and tokens sheet at the bottom.
- `design/Shared Billing Final.dc.html` + `support.js`: the same document in editable source form. The state data (node coordinates, links, panel content) lives in the `states()` method of the script near the bottom, which is a useful reference for fixture data.
- `tokens.css`: all design tokens, with semantic names.
- `BUILD.md`: condensed component and interaction rules (a checklist version of this README).
- `original-brief.md`: the original product brief, including the data findings.

---

## Screens and states
One screen, 1440 × 900 reference. Structure:
- **Top bar**: 64px tall, full width, `color-panel`, 1px bottom `color-border`, padding 0 24px, flex row, gap 24px, items centered.
- **Canvas**: fills everything below the top bar, `color-canvas`. The graph is drawn here.
- **Side panel** (when open): 440px wide, docked right from y=64 to the bottom, `color-panel`, 1.5px left border `color-border-active`. When it opens, the graph re-fits into the remaining 1000px.
- **Summary line**: absolute, left 24, top 88. `text-meta` (13px Figtree), `color-text-muted`. Example: "No shared films · 23 co-stars link them · showing 5".
- **TMDB attribution**: absolute, left 24, bottom 16, `text-attribution` (11px), `color-text-muted`: "Headshots from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB." It moves to the panel footer when the panel is open, worded "Posters and headshots from TMDB…".

### Top bar, left to right
1. **Wordmark block** (column, gap 2px): "Shared Billing" in Bricolage Grotesque 800, 20px, line-height 1, tracking −0.03em, `color-text-primary`. Below it, the subtitle "Find the actors who connect any two stars." in Figtree 12px, `color-text-muted`.
2. **Search field** (hidden in the empty state, where search moves to the center): 280 × 36, margin-left 16, padding 0 12, 1px `color-border`, radius 8, `color-panel`. 16px search icon in `color-text-muted`, placeholder "Add an actor" (14px, `color-text-muted`), and a right-aligned count "2 of 6" (12px, muted). Focus: 1.5px `color-border-active` plus `ring-focus`.
3. Spacer (flex 1).
4. **"People in between" slider**: the label (13px, weight 500, `color-text-secondary`), then a 144px track. The track is 2px `color-border`, with the filled part in `color-text-secondary` and a 16px knob (`color-panel` fill, 2px `color-text-primary` border). Four stops, 0–3, are spaced 48px apart, with 11px labels below; the active stop is weight 700 in `color-text-primary` and the others weight 500, muted. Default value 1. In the empty state the whole group sits at 40% opacity. The slider is **not coral**.
5. **Films filter**: a borderless text button, 36px tall, padding 0 8: sliders icon + "Popular films" (13px, weight 500, `color-text-secondary`). It opens the settings popover.
6. **Reset layout**: rotate-ccw icon + label (13px, 500). `color-text-disabled` until a node is pinned, then `color-text-primary`.

### State 1: Empty start
- An add node (112px dashed circle) centered at x=720, y=240, with no label.
- A column centered from y=340, gap 16:
  - Headline "Who's connected to who?" in Bricolage 800, 44px, tracking −0.03em, primary.
  - Body text, max-width 520, centered, 16px/1.55, secondary: "Pick two actors, or up to six. Shared films draw as lines. If two of them never met on set, we'll pull in the co-stars who connect them."
  - Search field (margin-top 16): 520 × 48, radius 8, 1px `color-border-strong`, 18px icon, placeholder "Search for an actor" (16px, muted).
  - Gap 24, then the label "Or start with an example" (12px, 500, muted) and the **featured example card**. The card is 520px wide, padding 16, `color-panel`, 1.5px `color-border-active`, radius 12, `shadow-panel`. It is a flex row with gap 16:
    - A mini diagram: a 40px chosen circle "TH" (2px coral border, coral surface), a 16px line, a 20px bridge dot, a 16px line, and a 40px chosen circle "AH".
    - Text: "Tom Hanks + Audrey Hepburn" (Bricolage 700, 17px), with "No shared film, but two co-stars connect them." (13px, muted) below.
    - A primary button "Try it": 36px tall, pill, `color-direct` background, `color-on-direct` text, 14px weight 600.
  - Clicking the card loads Hanks + Hepburn, which leads straight to state 3.

### State 1b: Actor search (typeahead)
- The center field is focused: 1.5px `color-border-active` plus `ring-focus`. Typed text is 16px primary, with a caret.
- The dropdown sits 52px below the field top: 520 wide, `color-panel`, 1px border, radius 8, `shadow-popover`, padding 4px 0.
- Each row: padding 8 16, gap 12.
  - A 40px circle headshot (initials fallback: Bricolage 800, 14px, on `color-bridge-surface`).
  - The name (Bricolage 700, 16px) with the birth year beside it ("b. 1981", 13px muted).
  - A second line, known-for film and film count, e.g. "Knives Out · 41 films" (13px muted).
- The active row has a `color-muted` background and an "Enter" hint chip (11px, 1px border, radius 4).
- Keyboard: up/down move the active row, Enter adds, Esc closes. The birth year is what tells actors with the same name apart.

### State 2: Two actors, direct link (Tom Hanks + Meg Ryan, 4 films)
- Chosen nodes at (470, 482) and (970, 482). Add node at (1250, 740).
- One quadratic arc, control point offset −90px perpendicular, in `color-direct` at `stroke-4` (6px, since there are 4 films).
- Label at the curve midpoint: "4 shared films", pill, padding 2 8, 1px `color-direct` border, `color-canvas` fill, 12px weight 600, `color-direct-text`.

### State 3: Two actors, one person in between (Audrey Hepburn + Tom Hanks)
- Chosen nodes at (420, 482) and (1020, 482).
- Bridges: John Goodman at (720, 330) and Keith David at (720, 640).
- Indirect links: `color-bridge`, 1.5px. Each carries its film title as a quiet label (11px, weight 500, muted, no border, canvas fill): Hepburn–Goodman "Always", Goodman–Hanks "Punchline", Hepburn–David "Always", David–Hanks "Cloud Atlas".

### State 3b: Selected bridge ("Why this co-star appears")
- Triggered by clicking a bridge actor or either of its links.
- **The selected route** (Hepburn → Goodman → Hanks):
  - Stroke is `color-route` at the count stroke + 1.5px.
  - Labels are 12px, weight 600, `color-route-text`, with a 1px `color-route` border.
  - Goodman gets `ring-route` and his name goes to weight 700, primary.
- **Unrelated routes**: links at 30% opacity, nodes at 35%, labels at 40%.
- **Panel**:
  - Eyebrow "Why this co-star appears" (12px, 500, muted).
  - Title "John Goodman" (Bricolage 800, 28px, tracking −0.02em).
  - Meta row: a 16 × 3 gold key swatch and "Links Audrey Hepburn and Tom Hanks · 1 person in between" (14px, secondary).
  - Evidence blocks, one per side:
    - "Link 1 · with Audrey Hepburn": *Always* (1989). Audrey Hepburn: Hap. John Goodman: Al Yackey.
    - "Link 2 · with Tom Hanks": *Punchline* (1988). Tom Hanks: Steven Gold. John Goodman: John Krytsick.

### State 4: Two actors, crowded bridges (Tom Hanks + Billy Crystal, 23 bridges)
- Chosen nodes at (300, 482) and (1140, 482).
- The top 5 bridges sit in a column at x=720, at y = 170, 290, 410, 530, 650. The strongest bridge goes in the middle, nearest the straight line between the chosen actors:
  - Meg Ryan, at 410: 4 films with Hanks, 1 with Crystal.
  - Julia Roberts, at 290: 2 + 1.
  - Christopher Walken, at 530: 1 + 1.
  - Robin Wright, at 170: 1 + 1.
  - Carrie Fisher, at 650: 1 + 1.
- The overflow pill "+18 more" sits at (720, 770). It connects to both chosen actors with 1px dashed (4 4) `color-bridge` lines.
- Each stroke width follows the film count on that side of the bridge.

### State 4b: Overflow expanded
- The overflow pill shows its open state: 2px `color-border-active`, primary text. Never coral.
- **Panel**:
  - Eyebrow "Co-stars in between", title "Tom Hanks and Billy Crystal".
  - Meta "18 more beyond the top 5 · most shared films first".
  - A secondary pill button "Show all 23 in graph" (32px tall, 1px `color-border`).
  - Rows: 40px headshot; name (Bricolage 700, 16px); a two-column grid (88px name column, 12px text) giving the film on each side; and a "Show" pill (28px tall, 1px border) that adds that bridge to the graph.

### State 5: Four actors with a hub (Hanks, Bacon, Crystal, Hepburn)
- Chosen nodes: Hanks (380, 250), Bacon (1060, 250), Crystal (380, 700), Hepburn (1060, 700). Hepburn is pinned.
- Hanks–Bacon is a direct coral link, labeled "Apollo 13", with control offset −70.
- John Goodman bridges every other pair, so he is a **hub** at (720, 475). Hub treatment: 72px, `ring-hub`, sub-label "Links all 4" (11px, 500, muted).
- One extra bridge (Meg Ryan) and a "+22 more" overflow pill sit on the left, between Hanks and Crystal.
- **Pinned badge**: a 26px circle at the node's top-left, `color-text-primary` fill with a pin icon in canvas color. Pinning enables Reset layout.

### State 6: Deeper path (Setsuko Hara → Chishū Ryū → Martin Scorsese → Ziggy Marley)
- People-in-between slider at 3.
- The one displayed route counts as **selected**, so it draws in gold and both bridges get `ring-route`.
- Labels: "6 films", "Dreams", "Shark Tale · voice".
- **Route stepper**, bottom center, 56px from the bottom: `color-panel`, 1px border, radius 12, padding 8, no shadow.
  - Prev and next are 36px circular buttons. Prev is disabled (muted icon, no border); next has a 1px border.
  - Center text: "Route 1 of 129" (14px, 600) with "All have 2 people in between" (12px, muted) below.
- Never draw all routes at once.
- *The route count comes from the brief; this specific pair is illustrative.*

### State 7: Link detail (direct)
- Clicking a direct link puts a halo behind it: a `color-direct-surface` stroke at width + 10. Its label inverts to a `color-direct` fill with `color-on-direct` text.
- **Panel**: eyebrow "Shared films", title "Tom Hanks and Meg Ryan", meta row with a 16 × 6 coral key and "Direct link · 4 shared films · 1990–2015".
- **Film rows**: padding 16 24, 1px bottom border, gap 16.
  - Poster 56 × 84, radius 4. Fallback is `color-bridge-surface` with the title in 10px.
  - Title (15px, 600) with the year (13px, muted) beside it.
  - A role grid (112px name column, 13px text): actor name (600, secondary), then role (muted).
- Data:
  - *Joe Versus the Volcano* (1990): Joe Banks / DeDe, Angelica, Patricia.
  - *Sleepless in Seattle* (1993): Sam Baldwin / Annie Reed.
  - *You've Got Mail* (1998): Joe Fox / Kathleen Kelly.
  - *Ithaca* (2015): Matthew Macauley / Mrs. Macauley.

### State 8: Loading
- Chosen nodes are already placed.
- Centered at y≈470: "Rolling the credits…" (13px, muted) above a 120 × 2 track holding a 48px muted bar.
- Searches take under 1s, so keep this minimal and don't show it for responses under 150ms.

### State 9: No connection
- Only possible with the slider at 0.
- A card at (500, 380): 440 wide, padding 24, 1.5px `color-border-active`, radius 12, `shadow-panel`, gap 12.
  - "These two never crossed paths." (Bricolage 800, 24px).
  - Body: "Audrey Hepburn and Tom Hanks never shared a film. Let one person in between and we'll find who links them." (14px/1.55).
  - Primary pill button "Allow 1 person in between". It sets the slider to 1 and re-runs.

---

## Component specs
| Component | Spec |
| --- | --- |
| Chosen actor | 112px circle, `color-direct-surface` fill, 3px `color-direct` border, `shadow-selected` (5px 5px 0 hard). Headshot fills the circle at full color; the fallback is initials in Bricolage 800, 36px, `color-direct-text`. Name below (gap 8): Bricolage 700, 16px, primary, with a canvas-colored backing (padding 1 6) so the label sits clear of the links behind it. Remove control: a 26px circle inset 2px from the top-right, `color-panel`, 1px border, minus icon. |
| Bridge | 56px, `color-bridge-surface`, headshot desaturated (grayscale 100%, opacity .8). Initials: Bricolage 800, 17px, `color-bridge-text`. Name: Bricolage 600, 13px, secondary. |
| Hub | 72px, `ring-hub`, initials 21px, name Bricolage 700, 14px, primary. Sub-label 11px, 500, muted, 6px below the name. |
| Add | 112px, 2px dashed `color-text-disabled`, 32px plus icon (1.5 stroke), label "Add actor" (Figtree 13px, muted). Opens the typeahead. Hidden at 6 actors. |
| Overflow | Pill, 32px tall, padding 0 14, `color-panel` fill, 13px weight 600. Rest: 1px `color-border-strong`. Hover: 1px `color-text-muted` + `color-muted` fill. Open: 2px `color-border-active`. |
| Direct link | Quadratic curve. Stroke by film count: 1→1.5, 2→3, 3→4.5, 4–5→6, 6+→8px, round caps. |
| Indirect link | Same stroke-by-count, in `color-bridge`. |
| Selected route | `color-route`, stroke + 1.5px. |
| Overflow link | 1px dashed 4 4, `color-bridge`. |
| Link labels | Placed at the curve's t=0.5 point: 0.25·A + 0.5·C + 0.25·B. Pill shape, padding 2 8. |

Icons are Lucide-style line icons, 1.5px stroke, using `currentColor`: search, sliders-horizontal, rotate-ccw, plus, minus, x, chevron-left/right, pin. Use the `lucide-react` package.

## Interactions and behavior
- **Add**: from the add node or the top-bar search, open the typeahead and pick an actor. The node fades/scales in and the graph recomputes. Maximum 6 actors.
- **Remove**: the − control on a chosen node. Below 2 actors, return to the empty state.
- **People in between (0–3)**: the maximum bridge depth. 0 shows direct links only.
- **Films filter popover** (see the components sheet):
  - "Films that count" is a 3-row list: Hit films (~7,000), Popular films (~19,000, the default), All rated films (~47,000). The selected row gets a `color-muted` background.
  - Helper text: "Fewer films means fewer bridges…"
  - "Bridges shown per pair" is a stepper, default 5.
- **Selection**: only one selection at a time (a direct link, a bridge/route, or the overflow).
  - Selecting opens the matching panel, and clicking the empty canvas clears it.
  - Esc or × closes the panel.
  - Selecting a route dims unrelated links and nodes.
- **Drag and pin**: dragging a node fixes its `fx`/`fy` and shows the pin badge. Reset layout clears every pin and re-settles the graph.
- **Focus**: every node, link, button and row is reachable by Tab. The focus ring is `ring-focus` (2px canvas gap + 2px primary). For SVG links, render an invisible wide hit path (about 16px stroke) that takes focus and click, and draw the ring as an outline stroke.
- **Motion**:
  - Links draw in via stroke-dashoffset over 400ms with `--ease-out`.
  - Bridges fade and scale 0.85→1 over 280ms, staggered 40ms.
  - Selection changes take 150ms.
  - The layout settles within 600ms, then stops. Run the simulation offscreen for N ticks and animate nodes to their final positions. No idle drift.
  - Respect `prefers-reduced-motion`.

## Layout algorithm (guidance)
- **Chosen actors**: spread around an ellipse inscribed in the canvas, with a strong charge so they push apart.
- **Bridges**: link force to each chosen actor they connect. A bridge connecting 3+ chosen actors is a hub and drifts toward the centroid.
- **Bridge order per pair**: rank by total shared films. Place the top-ranked nearest the straight line between the pair, then alternate the rest to either side.
- **Collision radii**: node radius + 24 for chosen actors (so their labels clear), + 16 for bridges.
- Re-fit the graph to the canvas width when the panel opens.

## State model (suggested)
```ts
type ActorId = string; type FilmId = string;
interface AppState {
  chosen: ActorId[];                 // 0–6
  peopleBetween: 0 | 1 | 2 | 3;      // default 1
  filmSet: 'hit' | 'popular' | 'all';// default 'popular'
  bridgesPerPair: number;            // default 5
  selection: null
    | { kind: 'direct'; a: ActorId; b: ActorId }
    | { kind: 'bridge'; bridge: ActorId; pair: [ActorId, ActorId] }
    | { kind: 'route'; pair: [ActorId, ActorId]; index: number } // deeper paths
    | { kind: 'overflow'; pair: [ActorId, ActorId] };
  routeIndex: Record<string, number>;// per pair, for deeper paths
  expanded: Set<string>;             // pairs whose overflow is shown in-graph
  pinned: Record<ActorId, { x: number; y: number }>;
  status: 'idle' | 'loading' | 'ready';
  theme: 'light' | 'dark' | 'system';
}
```
**Derived graph per pair**:
- If the pair shares films, draw one direct link carrying those films with roles.
- Otherwise, run a BFS up to `peopleBetween` on the co-star graph restricted to `filmSet`.
  - With 1 person in between, list every bridge and its films on each side, ranked by total shared films.
  - With 2 or more, take the shortest routes; show one route plus a count.

**Data notes** (from the brief):
- About 70% of random pairs need 2 or fewer people in between; the deepest found was 4.
- Famous pairs have 15–29 bridges at depth 1, so crowding is the normal case.
- Voice roles count; label them "(voice)" or "· voice".
- IMDb lists only about the top 10 billed people per film, so filmographies are partial.
- Self-cameos can appear.
- Headshots and posters come from TMDB. They need visible attribution, and the fallback when an image is missing is initials or a blank poster.

## Design tokens
All values are in `tokens.css`, with light values on `:root` / `[data-theme="light"]` and dark values on `[data-theme="dark"]`. Key values (light / dark):

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| color-direct | #FF5A36 | #FF7A5C | Direct credit, chosen actor, selected direct link, primary action. **Only these.** |
| color-direct-text | #9A2A10 | #FFD3C4 | Chosen initials, direct labels |
| color-direct-surface | #FFE3D9 | #5A1F10 | Chosen fill, link halo |
| color-on-direct | #1A1410 | #120E0C | Text on coral buttons |
| color-route | #B08A3E | #C9A35A | Selected indirect route only |
| color-route-text | #6B4E14 | #E6CC94 | Route labels |
| color-route-surface | #F3E6C8 | #3B301D | Reserved for route highlights |
| color-bridge | #A08A74 | #7A6553 | Indirect and overflow strokes |
| color-bridge-surface | #EFE3D3 | #33281F | Bridge and hub fill, poster fallback |
| color-bridge-text | #4F3F33 | #DCCBB5 | Bridge initials |
| color-canvas | #FFF8EE | #1B1512 | Canvas |
| color-panel | #FFFFFF | #120E0C | Top bar, panel, cards, fields |
| color-muted | #F6ECDD | #261E19 | Hover and active rows |
| color-text-primary | #1A1410 | #FFF8EE | Text, focus ring |
| color-text-secondary | #2B211A | #EFE3D3 | Body |
| color-text-muted | #7A6553 | #B3A08B | Metadata |
| color-text-disabled | #A08A74 | #8A7561 | Disabled, add-node dash |
| color-border | #EFE3D3 | #33281F | Hairlines |
| color-border-strong | #DCCBB5 | #4F3F33 | Resting overflow pill, idle center search field |
| color-border-active | #1A1410 | #FFF8EE | Focused inputs, important panels |
| shadow-selected | 5px 5px 0 #1A1410 | 5px 5px 0 #5A1F10 | Chosen actors only |
| shadow-panel | 6px 6px 0 #1A1410 | 6px 6px 0 #000 | Example card, no-connection card |
| shadow-popover | 0 8px 24px rgba(26,20,16,.10) | 0 8px 24px rgba(0,0,0,.5) | Typeahead, settings |

- **Spacing**: `space-4`, `space-8`, `space-12`, `space-16`, `space-24`, `space-32`, `space-48`.
- **Radius**: field 8, card 12, poster 4, pill 999.
- **Type**:
  - Display: Bricolage Grotesque (500/700/800) for the wordmark, headings, panel titles and actor names.
  - UI: Figtree (400–700) for everything else.
  - Both load from Google Fonts. The `--text-*` shorthand tokens in `tokens.css` give the exact sizes and weights.

## Assets
- No image assets ship with the design. Headshots and posters come from the TMDB API at runtime; initials and blank posters are the fallbacks.
- Fonts: Google Fonts (Bricolage Grotesque, Figtree).
- Icons: Lucide.

## Data caveat
Film and role data in the frames comes from the brief and general knowledge. The overflow-list rows in 4b, the search-result film counts, the "+22 more" count, and the deeper-path example are illustrative. Use the real IMDb pipeline for actual values.

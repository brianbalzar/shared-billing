import type { Actor, Graph, Pair, Route } from './types';
export interface Node { id: string; actor?: Actor; kind: 'chosen' | 'bridge' | 'hub' | 'overflow'; pair?: string; pairs: string[]; label?: string; linksTo: Set<string>; x: number; y: number; radius: number }
export interface Edge { id: string; a: string; b: string; pair: string; pairs: string[]; kind: 'direct' | 'bridge' | 'overflow'; routeActor?: string; title: string; count: number; deep: boolean }
export function routeStrength(route: Route) {
  const counts = route.links.map(l => l.films.length);
  const quality = route.links.reduce((sum, link) => sum + Math.max(0, ...link.films.map(f => f.rating * Math.log10(Math.max(1, f.votes)))), 0);
  return Math.min(...counts) * 4 + counts.reduce((sum, count) => sum + count, 0) + quality / 100;
}
export function strongestPair(graph: Graph): string | null {
  const score = (p: Pair) => p.direct ? 100 + p.direct.films.length : p.bridges.length ? routeStrength(p.bridges[0]) + Math.log2(p.bridges.length + 1) : p.route ? 1 / (p.people || 1) : 0;
  return [...graph.pairs].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))[0]?.id || null;
}
const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
// Headline and subline for the result summary. `visible` is makeGraph's shown-bridge map, so "Showing N" matches the canvas.
export function describeResult(graph: Graph, setLabel: string, depth: number, visible: Record<string, string[]>, focus: string | null) {
  const pairs = graph.pairs, connected = pairs.filter(p => p.people !== null);
  let headline: string;
  if (pairs.length === 1) {
    const [p] = pairs, names = `${p.a.name} and ${p.b.name}`;
    headline = p.direct ? `${names} share ${plural(p.direct.films.length, 'film', 'films')}`
      : p.bridges.length ? `${names} connect through ${plural(p.bridges.length, 'co-star', 'co-stars')}`
      : p.route ? `${names} connect through ${plural(p.people!, 'person', 'people')} in between`
      : depth === 0 ? `No shared films in ${setLabel}` : `No connection within ${plural(depth, 'person', 'people')} in between`;
  } else headline = !connected.length ? `No connections among these ${graph.actors.length} actors in ${setLabel}` : connected.length === pairs.length ? `All ${pairs.length} pairs are connected` : `${connected.length} of ${pairs.length} pairs are connected`;
  const showing = pairs.reduce((sum, p) => sum + (p.direct ? 1 : visible[p.id]?.length || (p.route && (graph.actors.length < 4 || p.id === focus) ? 1 : 0)), 0);
  const direct = pairs.filter(p => p.direct).length, indirect = connected.length - direct;
  const breakdown = pairs.length > 1 && connected.length ? [direct && `${plural(direct, 'pair shares', 'pairs share')} films`, indirect && `${plural(indirect, 'pair connects', 'pairs connect')} through others`].filter(Boolean) : [];
  const sub = showing ? [...breakdown, `Showing ${plural(showing, 'connection', 'connections')}`, 'Click a co-star or film to explore'] : ['Try more people in between or a broader film set'];
  return { headline, sub: sub.join(' · '), showing };
}
// Multi-actor anchors start below the result headline and the pair chips.
const anchorTop = (count: number, h: number) => Math.min(count > 4 ? 300 : 260, h * .36);
export function corridor(a: { x: number; y: number }, b: { x: number; y: number }, width: number, height: number, count: number, focused: boolean) {
  const w = Math.max(380, width), h = Math.max(480, height), top = anchorTop(count, h);
  const cx = w / 2, cy = (top + h - 185) / 2, dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy) || 1;
  let nx = -dy / distance, ny = dx / distance;
  if (nx * ((a.x + b.x) / 2 - cx) + ny * ((a.y + b.y) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
  const diagonal = count >= 4 && Math.hypot((a.x + b.x) / 2 - cx, (a.y + b.y) / 2 - cy) < 50;
  const bow = count === 2 ? -65 : diagonal ? Math.min(140, distance * .23) : focused ? 48 : 30;
  return { nx, ny, bow, diagonal, x: (a.x + b.x) / 2 + nx * bow * 2, y: (a.y + b.y) / 2 + ny * bow * 2 };
}
export function makeGraph(graph: Graph, shown: number, expanded: Record<string, string[]>, focus: string | null = null) {
  const nodes = new Map<string, Node>(), edges: Edge[] = [], visible: Record<string, string[]> = {};
  const chosenIds = new Set(graph.actors.map(a => a.id)), multi = graph.actors.length > 2;
  const memberships = new Map<string, Set<string>>(), affiliations = new Map<string, Set<string>>(), hubScores = new Map<string, number>();
  for (const pair of graph.pairs) for (const route of pair.bridges) {
    const id = route.actors[1].id;
    if (!memberships.has(id)) { memberships.set(id, new Set()); affiliations.set(id, new Set()); }
    memberships.get(id)!.add(pair.id); affiliations.get(id)!.add(pair.a.id); affiliations.get(id)!.add(pair.b.id);
    const requested = (expanded[pair.id] || []).indexOf(id);
    hubScores.set(id, (hubScores.get(id) || 0) + routeStrength(route) + (pair.id === focus ? 20 + (requested >= 0 ? 2000 / (requested + 1) : 0) : 0));
  }
  const hubIds = new Set([...affiliations].filter(([id, selected]) => selected.size >= 3 && !chosenIds.has(id)).sort(([a], [b]) => hubScores.get(b)! - hubScores.get(a)! || a.localeCompare(b)).slice(0, 2).map(([id]) => id));
  const add = (actor: Actor, pair?: string) => {
    const kind = chosenIds.has(actor.id) ? 'chosen' : hubIds.has(actor.id) ? 'hub' : 'bridge';
    const id = kind === 'bridge' ? `${pair}:${actor.id}` : actor.id;
    if (!nodes.has(id)) nodes.set(id, { id, actor, kind, pair, pairs: kind === 'hub' ? [...memberships.get(actor.id)!] : pair ? [pair] : [], linksTo: kind === 'hub' ? affiliations.get(actor.id)! : new Set(), x: 0, y: 0, radius: kind === 'chosen' ? 55 : kind === 'hub' ? 36 : 28 });
    return id;
  };
  graph.actors.forEach(a => add(a));
  const ordered = [...graph.pairs].sort((a, b) => Number(b.id === focus) - Number(a.id === focus));
  let remaining = graph.actors.length === 3 ? 10 : Infinity;
  for (const pair of ordered) {
    visible[pair.id] = [];
    if (pair.direct) edges.push({ id: `direct:${pair.id}`, a: pair.a.id, b: pair.b.id, pair: pair.id, pairs: [pair.id], kind: 'direct', title: pair.direct.films.length === 1 ? pair.direct.films[0].title : `${pair.direct.films.length} shared films`, count: pair.direct.films.length, deep: false });
    const active = graph.actors.length < 4 || pair.id === focus;
    const limit = !active ? 0 : multi ? Math.min(4, pair.id === focus ? shown + 1 : Math.min(shown, 2)) : shown;
    const requested = expanded[pair.id] || [];
    const ranked = [...pair.bridges].sort((a, b) => Number(requested.includes(b.actors[1].id)) - Number(requested.includes(a.actors[1].id)) || (requested.includes(a.actors[1].id) && requested.includes(b.actors[1].id) ? requested.indexOf(a.actors[1].id) - requested.indexOf(b.actors[1].id) : routeStrength(b) - routeStrength(a)));
    const candidates = pair.bridges.length ? ranked : active && pair.route ? [pair.route] : [];
    let used = 0;
    for (const route of candidates) {
      if (!active) break;
      if (pair.bridges.length && used >= (multi ? limit : limit + requested.length)) break;
      const intermediates = route.actors.slice(1, -1);
      if (intermediates.some(a => (affiliations.get(a.id)?.size || 0) >= 3 && !hubIds.has(a.id) && !chosenIds.has(a.id))) continue;
      const cost = intermediates.filter(a => !chosenIds.has(a.id) && !(hubIds.has(a.id) && nodes.has(a.id))).length;
      if (cost > remaining) continue;
      remaining -= cost; used++;
      if (pair.bridges.length) visible[pair.id].push(route.actors[1].id);
      const routeNodes = route.actors.map(a => add(a, pair.id));
      intermediates.forEach(a => { const node = nodes.get(add(a, pair.id))!; if (node.kind === 'bridge') { node.linksTo.add(pair.a.id); node.linksTo.add(pair.b.id); } });
      route.links.forEach((link, i) => {
        const a = routeNodes[i], b = routeNodes[i + 1], key = [a, b].sort().join(':');
        const existing = edges.find(e => e.kind === 'bridge' && [e.a, e.b].sort().join(':') === key);
        if (existing) { if (!existing.pairs.includes(pair.id)) existing.pairs.push(pair.id); return; }
        edges.push({ id: key, a, b, pair: pair.id, pairs: [pair.id], kind: 'bridge', routeActor: route.actors[1].id, title: link.films.length === 1 ? link.films[0].title : `${link.films.length} films`, count: link.films.length, deep: !!pair.route });
      });
    }
    const hidden = pair.bridges.length - visible[pair.id].length;
    if (hidden > 0 && active) {
      const id = `overflow:${pair.id}`;
      nodes.set(id, { id, kind: 'overflow', pair: pair.id, pairs: [pair.id], label: `+${hidden} more`, linksTo: new Set([pair.a.id, pair.b.id]), x: 0, y: 0, radius: 42 });
      [pair.a, pair.b].forEach(a => edges.push({ id: `${id}:${a.id}`, a: a.id, b: id, pair: pair.id, pairs: [pair.id], kind: 'overflow', title: '', count: 0, deep: false }));
    }
  }
  return { nodes: [...nodes.values()], edges, visible };
}
// Stable anchors and pair-owned corridors replace the global force simulation.
export function settle(nodes: Node[], edges: Edge[], width: number, height: number, pinned: Record<string, { x: number; y: number }>, focus: string | null = null) {
  const w = Math.max(380, width), h = Math.max(480, height);
  const chosen = nodes.filter(node => node.kind === 'chosen'), n = chosen.length;
  const top = n > 2 ? anchorTop(n, h) : h * .5, bottom = h - 185;
  const cx = w / 2, cy = (top + bottom) / 2;
  chosen.forEach((node, i) => {
    // Two-actor anchors slide outward as the canvas narrows (e.g. when the details panel opens),
    // so the corridor between them keeps room for bridge names and film labels.
    if (n === 2) { const inset = .13 + .08 * Math.max(0, Math.min(1, (w - 700) / 400)); node.x = w * (i === 0 ? inset : 1 - inset); node.y = h * .5; }
    else if (n === 3) { const span = Math.min(w * .68, (bottom - top) * 1.5); node.x = [cx, cx - span / 2, cx + span / 2][i]; node.y = [top, bottom, bottom][i]; }
    else if (n === 4) { const side = Math.min(w * .62, bottom - top); node.x = [cx - side / 2, cx + side / 2, cx + side / 2, cx - side / 2][i]; node.y = [top, top, top + side, top + side][i]; }
    else { const angle = -Math.PI / 2 + i * 2 * Math.PI / n; node.x = cx + Math.cos(angle) * w * .34; node.y = cy + Math.sin(angle) * (bottom - top) / 2; }
    if (pinned[node.id]) { node.x = pinned[node.id].x * w; node.y = pinned[node.id].y * h; }
  });
  const map = new Map(nodes.map(node => [node.id, node]));
  const hubs = nodes.filter(node => node.kind === 'hub');
  hubs.forEach((node, i) => { node.x = cx + (i - (hubs.length - 1) / 2) * 110; node.y = cy; });
  for (const pair of new Set(nodes.filter(node => node.pair && node.kind !== 'chosen' && node.kind !== 'hub').map(node => node.pair!))) {
    const corridor = nodes.filter(node => node.pair === pair && node.kind !== 'chosen' && node.kind !== 'hub');
    const pairEdges = edges.filter(edge => edge.pairs.includes(pair));
    const deep = pairEdges.filter(e => e.deep);
    const anchors = (deep.length ? [deep[0].a, deep[deep.length - 1].b] : pair.split(':')).map(id => map.get(id)!).filter(Boolean);
    if (anchors.length < 2) continue;
    const [a, b] = anchors, dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy) || 1;
    let nx = -dy / distance, ny = dx / distance;
    if (nx * ((a.x + b.x) / 2 - cx) + ny * ((a.y + b.y) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
    const bridges = corridor.filter(node => node.kind === 'bridge'), overflow = corridor.find(node => node.kind === 'overflow');
    if (n === 2 && !pairEdges.some(e => e.deep)) {
      // Centre the stack on the anchors and use the vertical room, but keep the last name clear of "+N more".
      const step = Math.min(125, (h - 260) / Math.max(1, bridges.length)), span = (bridges.length - 1) * step;
      const lowest = overflow ? h - 115 - 21 - 64 : h - 120, middle = Math.max(110 + span / 2, Math.min(h * .5, lowest - span / 2));
      bridges.forEach((node, i) => { node.x = cx; node.y = middle + (i - (bridges.length - 1) / 2) * step; });
      if (overflow) { overflow.x = cx; overflow.y = h - 115; }
    } else {
      // Opposite corners use an outer arc, leaving the center exclusively for hubs.
      const diagonal = n >= 4 && Math.hypot((a.x + b.x) / 2 - cx, (a.y + b.y) / 2 - cy) < 50;
      const bow = diagonal ? Math.min(140, distance * .23) : n === 2 ? -65 : pair === focus ? 48 : 30;
      bridges.forEach((node, i) => { const t = (i + 1) / (bridges.length + 1); node.x = a.x + dx * t + nx * bow * Math.sin(Math.PI * t); node.y = a.y + dy * t + ny * bow * Math.sin(Math.PI * t); });
      if (overflow) { overflow.x = (a.x + b.x) / 2 + nx * (bow + (diagonal ? 25 : 78)); overflow.y = (a.y + b.y) / 2 + ny * (bow + (diagonal ? 25 : 78)); }
    }
  }
  for (const node of nodes) {
    if (node.kind !== 'chosen' && pinned[node.id]) { node.x = pinned[node.id].x * w; node.y = pinned[node.id].y * h; }
    node.x = Math.max(node.radius + 25, Math.min(w - node.radius - 25, node.x));
    node.y = Math.max(node.radius + (n > 2 ? 175 : 65), Math.min(h - node.radius - 60, node.y));
  }
  return nodes;
}

// ---- Film-label placement -------------------------------------------------------------------
// Labels are positioned along their curve, avoiding node bubbles, actor names and each other.
// Widths are estimated from text length so this stays pure and testable outside the browser.
export interface Point { x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface LabelRequest { id: string; title: string; start: Point; control: Point; end: Point; bold?: boolean }
export interface LabelPlacement { x: number; y: number; width: number; fullWidth: number; truncated: boolean }
export const LABEL_HEIGHT = 24, LABEL_MAX = 240, LABEL_HOVER_MAX = 420;
export const labelWidth = (text: string, bold = false) => Math.ceil(text.length * (bold ? 6.9 : 6.3) + 20);
export const quadPoint = (s: Point, c: Point, e: Point, t: number): Point => ({ x: (1 - t) ** 2 * s.x + 2 * (1 - t) * t * c.x + t ** 2 * e.x, y: (1 - t) ** 2 * s.y + 2 * (1 - t) * t * c.y + t ** 2 * e.y });
export function nodeObstacles(nodes: Node[]): Box[] {
  const boxes: Box[] = [];
  for (const node of nodes) {
    if (node.kind === 'overflow') { boxes.push({ x: node.x - 55, y: node.y - 18, w: 110, h: 36 }); continue; }
    boxes.push({ x: node.x - node.radius, y: node.y - node.radius, w: node.radius * 2, h: node.radius * 2 });
    const name = node.actor?.name || '';
    const perChar = node.kind === 'chosen' ? 9.2 : node.kind === 'hub' ? 7.8 : 7.4, cap = node.kind === 'bridge' ? 130 : 180;
    const width = Math.min(cap, name.length * perChar + 12), height = (node.kind === 'chosen' ? 22 : 19) + (node.kind === 'hub' ? 16 : 0);
    boxes.push({ x: node.x - width / 2, y: node.y + node.radius + 6, w: width, h: height });
  }
  return boxes;
}
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
export function placeLabels(requests: LabelRequest[], obstacles: Box[]): Record<string, LabelPlacement> {
  const placed: Record<string, LabelPlacement> = {}, taken = [...obstacles];
  const offsets = [.5, .42, .58, .34, .66, .27, .73];
  for (const request of requests) {
    const fullWidth = labelWidth(request.title, request.bold);
    const widths = [...new Set([Math.min(fullWidth, LABEL_MAX), Math.min(fullWidth, 150), Math.min(fullWidth, 104)])];
    let best: { score: number; placement: LabelPlacement; box: Box } | null = null;
    for (const width of widths) for (const t of offsets) {
      const p = quadPoint(request.start, request.control, request.end, t);
      const box = { x: p.x - width / 2, y: p.y - LABEL_HEIGHT / 2, w: width, h: LABEL_HEIGHT };
      const collision = taken.reduce((sum, other) => sum + overlap(box, other), 0);
      // Collisions dominate; then prefer the full title, then the curve midpoint.
      const score = collision * 4 + (width < fullWidth ? 300 + (fullWidth - width) * 2 : 0) + Math.abs(t - .5) * 160;
      if (!best || score < best.score) best = { score, box, placement: { x: p.x, y: p.y, width, fullWidth, truncated: width < fullWidth } };
    }
    if (best) { placed[request.id] = best.placement; taken.push(best.box); }
  }
  return placed;
}

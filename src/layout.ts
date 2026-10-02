import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from 'd3-force';
import type { SimulationNodeDatum } from 'd3-force';
import type { Actor, Graph } from './types';
export interface Node extends SimulationNodeDatum { id: string; actor?: Actor; kind: 'chosen' | 'bridge' | 'hub' | 'overflow'; pair?: string; label?: string; linksTo: Set<string>; x: number; y: number; radius: number }
export interface Edge { id: string; a: string; b: string; pair: string; kind: 'direct' | 'bridge' | 'overflow'; routeActor?: string; title: string; count: number; deep: boolean }
export function makeGraph(graph: Graph, shown: number, expanded: Record<string, string[]>) {
  const nodes = new Map<string, Node>(), edges: Edge[] = [];
  const add = (a: Actor, chosen = false) => { if (!nodes.has(a.id)) nodes.set(a.id, { id: a.id, actor: a, kind: chosen ? 'chosen' : 'bridge', linksTo: new Set(), x: 0, y: 0, radius: chosen ? 56 : 28 }); };
  graph.actors.forEach(a => add(a, true));
  for (const pair of graph.pairs) {
    if (pair.direct) edges.push({ id: `direct:${pair.id}`, a: pair.a.id, b: pair.b.id, pair: pair.id, kind: 'direct', title: pair.direct.films.length === 1 ? pair.direct.films[0].title : `${pair.direct.films.length} shared films`, count: pair.direct.films.length, deep: false });
    const routes = pair.bridges.length ? pair.bridges.filter((r, i) => i < shown || expanded[pair.id]?.includes(r.actors[1].id)) : pair.route ? [pair.route] : [];
    for (const route of routes) {
      route.actors.forEach(a => add(a));
      route.actors.slice(1, -1).forEach(a => { nodes.get(a.id)!.linksTo.add(pair.a.id); nodes.get(a.id)!.linksTo.add(pair.b.id); });
      route.links.forEach((link, i) => {
        const id = [link.a, link.b].sort().join(':');
        const existing = edges.find(e => e.a === link.a && e.b === link.b && e.pair === pair.id);
        if (!existing) edges.push({ id: `${pair.id}:${id}`, a: link.a, b: link.b, pair: pair.id, kind: 'bridge', routeActor: route.actors[1].id, title: link.films.length === 1 ? link.films[0].title : `${link.films.length} films`, count: link.films.length, deep: !!pair.route });
      });
    }
    const hidden = pair.bridges.length - routes.length;
    if (hidden > 0) {
      const id = `overflow:${pair.id}`;
      nodes.set(id, { id, kind: 'overflow', pair: pair.id, label: `+${hidden} more`, linksTo: new Set([pair.a.id, pair.b.id]), x: 0, y: 0, radius: 42 });
      [pair.a, pair.b].forEach(a => edges.push({ id: `${id}:${a.id}`, a: a.id, b: id, pair: pair.id, kind: 'overflow', title: '', count: 0, deep: false }));
    }
  }
  for (const n of nodes.values()) if (n.kind === 'bridge' && n.linksTo.size >= 3) { n.kind = 'hub'; n.radius = 36; }
  return { nodes: [...nodes.values()], edges };
}
export function settle(nodes: Node[], edges: Edge[], width: number, height: number, pinned: Record<string, { x: number; y: number }>) {
  const w = Math.max(380, width), h = Math.max(360, height), cx = w / 2, cy = h / 2;
  const chosen = nodes.filter(n => n.kind === 'chosen');
  chosen.forEach((n, i) => {
    const angle = chosen.length === 2 ? i * Math.PI + Math.PI : (i / chosen.length) * Math.PI * 2 - Math.PI * 3 / 4;
    n.x = cx + Math.cos(angle) * Math.min(w * .29, 420); n.y = cy + Math.sin(angle) * Math.min(h * .29, 245);
  });
  const map = new Map(nodes.map(n => [n.id, n]));
  const bridges = nodes.filter(n => n.kind !== 'chosen');
  bridges.forEach((n, i) => {
    const targets = [...n.linksTo].map(id => map.get(id)!).filter(Boolean);
    n.x = targets.reduce((sum, t) => sum + t.x, 0) / (targets.length || 1);
    n.y = targets.reduce((sum, t) => sum + t.y, 0) / (targets.length || 1);
    if (chosen.length === 2) {
      const offset = i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 ? -1 : 1);
      n.y += offset * Math.min(110, (h - 220) / Math.max(1, bridges.length - 1));
      if (n.kind === 'overflow') n.y = h - 105;
    } else { n.x += Math.cos(i * 2.4) * 60; n.y += Math.sin(i * 2.4) * 60; }
  });
  // Longer routes read left to right instead of stacking every intermediate at the centroid.
  for (const pair of new Set(edges.filter(e => e.deep).map(e => e.pair))) {
    const chain = edges.filter(e => e.deep && e.pair === pair);
    const first = map.get(chain[0].a)!, last = map.get(chain[chain.length - 1].b)!;
    chain.slice(0, -1).forEach((edge, i) => {
      const node = map.get(edge.b)!;
      if (node.kind === 'chosen') return;
      const t = (i + 1) / chain.length;
      node.x = first.x + (last.x - first.x) * t;
      node.y = first.y + (last.y - first.y) * t - Math.sin(t * Math.PI) * 80;
    });
  }
  const targets = new Map(nodes.map(n => [n.id, { x: n.x, y: n.y }]));
  for (const n of nodes) if (pinned[n.id]) { n.fx = Math.max(75, Math.min(w - 75, pinned[n.id].x * w)); n.fy = Math.max(100, Math.min(h - 110, pinned[n.id].y * h)); }
  const simulation = forceSimulation(nodes).stop()
    .force('link', forceLink<Node, { source: string; target: string }>(edges.map(e => ({ source: e.a, target: e.b }))).id(n => n.id).distance(chosen.length === 2 ? w * .23 : Math.min(w, h) * .29).strength(.18))
    .force('charge', forceManyBody().strength(n => (n as Node).kind === 'chosen' ? -950 : -150))
    .force('collision', forceCollide<Node>().radius(n => n.radius + (n.kind === 'chosen' ? 24 : bridges.length > 7 ? 38 : 18)).iterations(5))
    .force('x', forceX<Node>(n => targets.get(n.id)!.x).strength(n => n.kind === 'chosen' ? .65 : .22))
    .force('y', forceY<Node>(n => targets.get(n.id)!.y).strength(n => n.kind === 'chosen' ? .65 : .25));
  for (let i = 0; i < 160; i++) simulation.tick();
  for (const n of nodes) { n.x = Math.max(n.radius + 30, Math.min(w - n.radius - 30, n.x)); n.y = Math.max(n.radius + 70, Math.min(h - n.radius - 80, n.y)); }
  return nodes;
}

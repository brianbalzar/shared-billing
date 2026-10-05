import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeGraph, settle, strongestPair } from '../src/layout.ts';
import type { Actor, Graph, Pair, Route } from '../src/types.ts';
const actor = (id: string): Actor => ({ id, name: id, birth: null, known: '', count: 1 });
const route = (a: Actor, b: Actor, bridge: Actor): Route => ({ actors: [a, bridge, b], links: [[a, bridge], [bridge, b]].map(([a, b]) => ({ a: a.id, b: b.id, films: [{ id: `${a.id}${b.id}`, title: 'Evidence', year: 2000, votes: 20000, rating: 7, roles: {} }] })) });
function fixture(count: number): Graph {
  const actors = Array.from({ length: count }, (_, i) => actor(`actor${i}`)), pairs: Pair[] = [];
  for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
    const a = actors[i], b = actors[j], id = `${a.id}:${b.id}`;
    pairs.push({ id, a, b, direct: null, bridges: [route(a, b, actor('hub')), ...Array.from({ length: 20 }, (_, k) => route(a, b, actor(`${id}bridge${k}`)))], route: null, totalRoutes: 21, people: 1, routeIndex: 0 });
  }
  return { actors, pairs };
}
test('pair focus preserves fixed anchors and a genuine square', () => {
  const graph = fixture(4);
  const positions = graph.pairs.map(pair => { const display = makeGraph(graph, 3, {}, pair.id); return settle(display.nodes, display.edges, 1440, 836, {}, pair.id).filter(n => n.kind === 'chosen').map(n => [n.x, n.y]); });
  positions.forEach(p => assert.deepEqual(p, positions[0]));
  const [a,b,c] = positions[0]; assert.equal(b[0] - a[0], c[1] - b[1]);
});
test('three actors retain pair ownership and stay under the total density cap even after expansion', () => {
  const graph = fixture(3), focus = strongestPair(graph)!;
  const display = makeGraph(graph, 12, { [focus]: graph.pairs[0].bridges.map(r => r.actors[1].id) }, focus);
  assert.ok(display.nodes.filter(n => n.kind === 'bridge' || n.kind === 'hub').length <= 10);
  for (const pair of graph.pairs) assert.ok(display.visible[pair.id].length <= 4);
  for (const node of display.nodes.filter(n => n.kind === 'bridge')) assert.equal(node.pairs.length, 1);
  for (const node of display.nodes.filter(n => n.kind === 'hub')) assert.ok(node.linksTo.size >= 3);
  const positioned = settle(display.nodes, display.edges, 1440, 836, {}, focus);
  for (const node of positioned.filter(n => n.kind === 'bridge')) assert.ok(Math.hypot(node.x - 720, node.y - 440.5) > 110, 'ordinary bridges cannot occupy the hub area');
});
test('four to six actors show intermediates and overflow only for the focused pair', () => {
  for (const count of [4,5,6]) {
    const graph = fixture(count), focus = graph.pairs[1].id, display = makeGraph(graph, 3, {}, focus);
    assert.ok(display.visible[focus].length <= 4);
    for (const pair of graph.pairs.filter(p => p.id !== focus)) assert.equal(display.visible[pair.id].length, 0);
    for (const node of display.nodes.filter(n => n.kind === 'bridge' || n.kind === 'overflow')) assert.equal(node.pair, focus);
  }
});
test('film labels avoid actor names and each other, and two-actor anchors widen on narrow canvases', async () => {
  const { placeLabels, nodeObstacles } = await import('../src/layout.ts');
  const bridge = { id: 'b', actor: actor('A very long bridge name'), kind: 'bridge' as const, pairs: [], linksTo: new Set<string>(), x: 300, y: 200, radius: 28 };
  const obstacles = nodeObstacles([bridge]);
  // A label whose midpoint would sit on the bridge's name gets moved along its curve instead.
  const placed = placeLabels([{ id: 'e', title: 'Evidence', start: { x: 300, y: 245 }, control: { x: 300, y: 245 }, end: { x: 300, y: 400 } }], obstacles).e;
  const name = obstacles[1];
  assert.ok(placed.y - 12 >= name.y + name.h || placed.y + 12 <= name.y, 'label clears the actor name');
  const pair = placeLabels(['one', 'two'].map(id => ({ id, title: 'Same spot', start: { x: 0, y: 0 }, control: { x: 100, y: 0 }, end: { x: 200, y: 0 } })), []);
  assert.notEqual(pair.one.x, pair.two.x, 'second label shifts away from the first');
  const two = fixture(2), display = makeGraph(two, 3, {});
  const wide = settle(display.nodes.map(n => ({ ...n })), display.edges, 1440, 836, {}).filter(n => n.kind === 'chosen');
  const narrow = settle(display.nodes.map(n => ({ ...n })), display.edges, 720, 836, {}).filter(n => n.kind === 'chosen');
  assert.ok((narrow[1].x - narrow[0].x) / 720 > (wide[1].x - wide[0].x) / 1440);
});

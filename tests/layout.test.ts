import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeGraph, settle, strongestPair, describeResult, nodeObstacles } from '../src/layout.ts';
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
test('result headline names the strongest kind of connection and the sub-line counts what is shown', () => {
  const [a, b] = ['Ann', 'Bo'].map(actor), film = { id: 't', title: 'T', year: 2000, votes: 2e4, rating: 7, roles: {} };
  const pair = (over: Partial<Pair>): Graph => ({ actors: [a, b], pairs: [{ id: 'p', a, b, direct: null, bridges: [], route: null, totalRoutes: 0, people: null, routeIndex: 0, ...over }] });
  const describe = (g: Graph, depth = 1) => describeResult(g, 'Popular films', depth, { p: g.pairs[0].bridges.slice(0, 3).map(r => r.actors[1].id) }, null);
  assert.equal(describe(pair({ direct: { a: 'Ann', b: 'Bo', films: [film, film, film] }, people: 0 })).headline, 'Ann and Bo share 3 films');
  const bridges = pair({ bridges: Array.from({ length: 21 }, (_, i) => route(a, b, actor(`c${i}`))), people: 1 });
  assert.equal(describe(bridges).headline, 'Ann and Bo connect through 21 co-stars');
  assert.equal(describe(bridges).sub, 'Showing 3 connections · Click a co-star or film to explore');
  assert.equal(describe(pair({ route: { ...route(a, b, actor('x')), actors: [a, actor('x'), actor('y'), b] }, people: 2 })).headline, 'Ann and Bo connect through 2 people in between');
  assert.equal(describe(pair({}), 0).headline, 'No shared films in Popular films');
  assert.equal(describe(pair({}), 2).headline, 'No connection within 2 people in between');
  const three = fixture(3);
  assert.equal(describeResult(three, 'Popular films', 1, {}, null).headline, 'All 3 pairs are connected');
});
test('"+N more" buttons clear every co-star name and stay on the canvas in the three-actor view', () => {
  const graph = fixture(3), hit = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  for (const [w, h] of [[1440, 836], [1280, 720], [1000, 836], [820, 640]]) for (const pair of graph.pairs) {
    const display = makeGraph(graph, 3, {}, pair.id), nodes = settle(display.nodes, display.edges, w, h, {}, pair.id);
    const overflows = nodes.filter(n => n.kind === 'overflow'), others = nodes.filter(n => n.kind !== 'overflow');
    assert.ok(overflows.length > 0);
    for (const o of overflows) {
      const box = { x: o.x - 55, y: o.y - 18, w: 110, h: 36 };
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.w <= w && box.y + box.h <= h, `${o.id} stays on the ${w}x${h} canvas`);
      for (const obstacle of nodeObstacles(others)) assert.ok(!hit(box, obstacle), `${o.id} overlaps a node or name at ${w}x${h}, focus ${pair.id}`);
      for (const other of overflows.filter(x => x !== o)) assert.ok(!hit(box, { x: other.x - 55, y: other.y - 18, w: 110, h: 36 }), 'overflow buttons do not overlap each other');
    }
  }
});

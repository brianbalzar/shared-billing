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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { CreditEngine } from '../src/engine.ts';
import { exampleCandidates, exampleHolds } from '../src/recommendations.ts';
import type { Actor, Pair } from '../src/types.ts';
const actor = (id: string, birth: number | null): Actor => ({ id, name: id, birth, known: '', count: 1 });
const pair = (over: Partial<Pair>, ba: number | null = 1930, bb: number | null = 1990): Pair => ({ id: 'p', a: actor('a', ba), b: actor('b', bb), direct: null, bridges: [], route: null, totalRoutes: 0, people: null, routeIndex: 0, ...over });
const bridge = { actors: [], links: [] };
test('example labels are only true for the connections they describe', () => {
  const film = { id: 't', title: 'T', year: 2000, votes: 2e4, rating: 7, roles: {} }, films = (n: number) => ({ a: 'a', b: 'b', films: Array(n).fill(film) });
  assert.ok(exampleHolds('shared', pair({ direct: films(3), people: 0 })));
  assert.ok(!exampleHolds('shared', pair({ direct: films(1), people: 0 })));
  assert.ok(exampleHolds('unexpected', pair({ bridges: [bridge], people: 1 })));
  assert.ok(!exampleHolds('unexpected', pair({ bridges: [bridge], people: 1 }, 1960, 1975)), 'needs a generation gap');
  assert.ok(!exampleHolds('unexpected', pair({ direct: films(3), people: 0 })));
  assert.ok(exampleHolds('two-steps', pair({ route: bridge, people: 2 })));
  assert.ok(!exampleHolds('two-steps', pair({ bridges: [bridge], people: 1 })));
  assert.ok(exampleHolds('crowded', pair({ bridges: Array(30).fill(bridge), people: 1 })));
  assert.ok(!exampleHolds('crowded', pair({ bridges: Array(29).fill(bridge), people: 1 })));
});
// Guards the shipped dataset: if a data rebuild changes a connection, this names the example to replace.
const file = new URL('../public/data/credits.bin', import.meta.url);
test('every curated starting pair is verified true for the Popular films set', { skip: !existsSync(file) }, () => {
  const engine = new CreditEngine(JSON.parse(gunzipSync(readFileSync(file)).toString()));
  const offered = new Set(engine.examples('popular').map(x => x.kind));
  for (const c of exampleCandidates) assert.ok(offered.has(c.kind), `"${c.label}" (${c.names.join(' + ')}) is no longer true for Popular films`);
  assert.equal(offered.size, exampleCandidates.length);
});

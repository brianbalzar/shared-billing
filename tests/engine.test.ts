import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CreditEngine } from '../src/engine.ts';
import type { Dataset } from '../src/types.ts';
const fixture: Dataset = {
  metadata: { generated: '', actors: 5, films: 5, counts: { hit: 0, popular: 4, all: 5 }, minVotes: { hit: 100000, popular: 10000, all: 1000 } },
  actors: ['Alice', 'Bob', 'Céline', 'David', 'Eve'].map((name, i) => [`nm${i}`, name, 1960 + i, 'A Film', 2]),
  films: [
    ['tt0', 'Alice + Céline', 1990, 12000, 7, [[0, 'Alice role'], [2, 'Céline role']]],
    ['tt1', 'Alice + David', 1991, 12000, 7, [[0, 'Alice role'], [3, 'David role']]],
    ['tt2', 'Céline + Eve', 1992, 12000, 7, [[2, 'Céline role'], [4, 'Eve role']]],
    ['tt3', 'David + Eve', 1993, 12000, 7, [[3, 'David role'], [4, 'Eve role']]],
    ['tt4', 'Eve + Bob', 1994, 2000, 7, [[4, 'Eve role'], [1, 'Bob role']]],
  ]
};
test('direct evidence contains each actor role and depth zero excludes bridges', () => {
  const e = new CreditEngine(fixture);
  assert.equal(e.graph(['nm0', 'nm2'], 0, 'popular', {}).pairs[0].direct!.films[0].roles.nm2, 'Céline role');
  assert.equal(e.graph(['nm0', 'nm4'], 0, 'popular', {}).pairs[0].people, null);
});
test('all one-person bridges are found and ranked without duplicated film routes', () => {
  const pair = new CreditEngine(fixture).graph(['nm0', 'nm4'], 1, 'popular', {}).pairs[0];
  assert.equal(pair.bridges.length, 2); assert.equal(pair.people, 1);
  assert.deepEqual(new Set(pair.bridges.map(r => r.actors[1].id)), new Set(['nm2', 'nm3']));
});
test('shortest-route count and arbitrary route indexing preserve equal shortest paths', () => {
  const e = new CreditEngine(fixture);
  const first = e.graph(['nm0', 'nm1'], 2, 'all', {}).pairs[0];
  const second = e.graph(['nm0', 'nm1'], 2, 'all', { 'nm0:nm1': 1 }).pairs[0];
  assert.equal(first.totalRoutes, 2); assert.equal(first.people, 2);
  assert.notDeepEqual(first.route!.actors.map(a => a.id), second.route!.actors.map(a => a.id));
  assert.equal(second.route!.links.length, 3);
  assert.equal(e.graph(['nm0', 'nm1'], 1, 'all', {}).pairs[0].people, null);
});
test('film filters remove paths and accent-insensitive search respects chosen actors', () => {
  const e = new CreditEngine(fixture);
  assert.equal(e.graph(['nm0', 'nm1'], 3, 'popular', {}).pairs[0].people, null);
  assert.equal(e.search('celine', [], 'popular')[0].name, 'Céline');
  assert.equal(e.search('celine', ['nm2'], 'popular').length, 0);
  assert.equal(e.search('Bob', [], 'popular').length, 0);
});

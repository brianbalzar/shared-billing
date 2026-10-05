import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeLink, encodeLink } from '../src/linkstate.ts';
test('a shared link round-trips actors, depth, film set and focused pair', () => {
  const state = { ids: ['nm0000237', 'nm0000093', 'nm0000233'], depth: 2, filmSet: 'all' as const, pair: 'nm0000093:nm0000233' };
  const query = encodeLink(state);
  assert.equal(query, 'a=nm0000237,nm0000093,nm0000233&d=2&f=all&p=nm0000093:nm0000233');
  assert.deepEqual(decodeLink(`?${query}`), state);
  assert.equal(encodeLink({ ids: ['nm1', 'nm2'], depth: 1, filmSet: 'popular', pair: null }), 'a=nm1,nm2&d=1&f=popular');
});
test('invalid link parameters are ignored instead of breaking the page', () => {
  assert.equal(decodeLink(''), null);
  assert.equal(decodeLink('?a=bogus,<script>,tt123'), null);
  assert.deepEqual(decodeLink('?a=nm1,nope,nm1,nm2&d=9&f=huge&p=nm1:nm9'), { ids: ['nm1', 'nm2'], depth: 1, filmSet: 'popular', pair: null });
  assert.equal(decodeLink('?a=nm1,nm2,nm3&p=nm3:nm1')!.pair, null, 'pair ids must be in sorted order, as the engine writes them');
  assert.equal(decodeLink('?a=nm1,nm2,nm3&p=nm1:nm9')!.pair, null, 'pair must belong to the chosen actors');
  assert.equal(decodeLink('?a=nm1,nm2&p=nm1:nm2')!.pair, null, 'only multi-actor views have a focused pair');
  assert.equal(decodeLink('?a=nm1,nm2,nm3,nm4,nm5,nm6,nm7,nm8')!.ids.length, 6);
  assert.equal(decodeLink('?a=nm1,nm2&d=0')!.depth, 0);
});

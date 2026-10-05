import type { FilmSet } from './types';
export interface LinkState { ids: string[]; depth: number; filmSet: FilmSet; pair: string | null }
export const MAX_ACTORS = 6, MAX_DEPTH = 3;
const sets: FilmSet[] = ['hit', 'popular', 'all'], idPattern = /^nm\d{1,10}$/;
// ?a=nm1,nm2&d=1&f=popular&p=nm1:nm2 — IDs and values are URL-safe, so nothing needs escaping.
export function encodeLink({ ids, depth, filmSet, pair }: LinkState) {
  return `a=${ids.join(',')}&d=${depth}&f=${filmSet}${pair ? `&p=${pair}` : ''}`;
}
// Returns null when the URL carries no usable actors, so the caller falls back to the landing page.
// Bad IDs are dropped, bad numbers and sets fall back to the defaults, and a pair must belong to the chosen actors.
export function decodeLink(search: string): LinkState | null {
  const params = new URLSearchParams(search);
  const ids = [...new Set((params.get('a') || '').split(',').map(id => id.trim()).filter(id => idPattern.test(id)))].slice(0, MAX_ACTORS);
  if (!ids.length) return null;
  const d = params.get('d'), f = params.get('f'), p = params.get('p') || '';
  const depth = d !== null && /^\d$/.test(d) && +d <= MAX_DEPTH ? +d : 1;
  const members = p.split(':');
  const pair = ids.length > 2 && members.length === 2 && members[0] !== members[1] && members.every(id => ids.includes(id)) && p === [...members].sort().join(':') ? p : null;
  return { ids, depth, filmSet: sets.find(s => s === f) || 'popular', pair };
}

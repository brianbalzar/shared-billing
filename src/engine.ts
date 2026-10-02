import type { Actor, Dataset, Evidence, FilmSet, Graph, Pair, Route } from './types';
import { recommendedActors } from './recommendations';
export class CreditEngine {
  private ids = new Map<string, number>();
  private credits: number[][];
  private cache = new Map<number, Map<number, number[]>>();
  private active: boolean[] = [];
  private counts: number[] = [];
  private set: FilmSet | null = null;
  constructor(private data: Dataset) {
    this.credits = Array.from({ length: data.actors.length }, () => []);
    data.actors.forEach((a, i) => this.ids.set(a[0], i));
    data.films.forEach((f, i) => f[5].forEach(([a]) => this.credits[a].push(i)));
    this.filter('popular');
  }
  filter(set: FilmSet) {
    if (set === this.set) return;
    this.set = set; this.cache.clear();
    this.active = this.data.films.map(f => f[3] >= this.data.metadata.minVotes[set]);
    this.counts = this.credits.map(fs => fs.filter(f => this.active[f]).length);
  }
  actor(i: number): Actor {
    const [id, name, birth, known] = this.data.actors[i];
    return { id, name, birth, known, count: this.counts[i] };
  }
  randomActors(set: FilmSet): Actor[] {
    this.filter(set);
    const eligible = this.counts.map((count, i) => count > 0 && recommendedActors.has(this.data.actors[i][1]) ? i : -1).filter(i => i >= 0);
    const actors: Actor[] = [];
    while (actors.length < 2 && eligible.length) {
      const index = Math.floor(Math.random() * eligible.length);
      actors.push(this.actor(eligible[index]));
      eligible[index] = eligible[eligible.length - 1];
      eligible.pop();
    }
    return actors;
  }
  search(query: string, excluded: string[], set: FilmSet): Actor[] {
    this.filter(set);
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const q = normalize(query.trim());
    if (!q) return [];
    return this.data.actors.map((a, i) => ({ i, name: normalize(a[1]) }))
      .filter(a => this.counts[a.i] && !excluded.includes(this.data.actors[a.i][0]) && q.split(/\s+/).every(word => a.name.includes(word)))
      .sort((a, b) => Number(b.name === q) - Number(a.name === q) || Number(b.name.startsWith(q)) - Number(a.name.startsWith(q)) || this.counts[b.i] - this.counts[a.i])
      .slice(0, 12).map(a => this.actor(a.i));
  }
  private neighbors(i: number) {
    const cached = this.cache.get(i); if (cached) return cached;
    const result = new Map<number, number[]>();
    for (const f of this.credits[i]) if (this.active[f]) for (const [other] of this.data.films[f][5]) {
      if (other === i) continue;
      const fs = result.get(other); if (fs) { if (!fs.includes(f)) fs.push(f); } else result.set(other, [f]);
    }
    // Avoid retaining the entire co-star graph after broad searches.
    if (this.cache.size > 4000) this.cache.clear();
    this.cache.set(i, result); return result;
  }
  private evidence(a: number, b: number): Evidence {
    return { a: this.actor(a).id, b: this.actor(b).id, films: (this.neighbors(a).get(b) || []).map(i => {
      const [id, title, year, votes, rating, cast] = this.data.films[i];
      return { id, title, year, votes, rating, roles: Object.fromEntries(cast.map(([person, role]) => [this.data.actors[person][0], role])) };
    }).sort((a, b) => (a.year || 0) - (b.year || 0)) };
  }
  private route(path: number[]): Route { return { actors: path.map(i => this.actor(i)), links: path.slice(1).map((b, i) => this.evidence(path[i], b)) }; }
  pair(a: number, b: number, depth: number, requestedIndex = 0): Pair {
    const result: Pair = { id: [this.actor(a).id, this.actor(b).id].sort().join(':'), a: this.actor(a), b: this.actor(b), direct: null, bridges: [], route: null, totalRoutes: 0, people: null, routeIndex: 0 };
    const na = this.neighbors(a);
    if (na.has(b)) { result.direct = this.evidence(a, b); result.people = 0; return result; }
    if (!depth) return result;
    const nb = this.neighbors(b);
    const strength = (i: number) => {
      const left = na.get(i)!, right = nb.get(i)!;
      const quality = (fs: number[]) => Math.max(...fs.map(f => this.data.films[f][4] * Math.log10(this.data.films[f][3])));
      return Math.min(left.length, right.length) * 4 + left.length + right.length + (quality(left) + quality(right)) / 100;
    };
    const bridges = [...na.keys()].filter(i => nb.has(i)).sort((x, y) => strength(y) - strength(x) || this.actor(x).name.localeCompare(this.actor(y).name));
    if (bridges.length) { result.bridges = bridges.map(i => this.route([a, i, b])); result.totalRoutes = bridges.length; result.people = 1; return result; }
    if (depth === 1) return result;
    // BFS records every shortest predecessor, counting actor chains rather than duplicate film combinations.
    const distances = new Map<number, number>([[a, 0]]);
    const predecessors = new Map<number, number[]>();
    const counts = new Map<number, number>([[a, 1]]);
    let frontier = [a], found = false;
    for (let level = 1; level <= depth + 1 && frontier.length && !found; level++) {
      const next: number[] = [];
      for (const current of frontier) for (const other of this.neighbors(current).keys()) {
        if (!distances.has(other)) { distances.set(other, level); predecessors.set(other, []); counts.set(other, 0); next.push(other); }
        if (distances.get(other) === level) { predecessors.get(other)!.push(current); counts.set(other, counts.get(other)! + counts.get(current)!); }
        if (other === b) found = true;
      }
      frontier = next;
    }
    if (!found) return result;
    result.people = distances.get(b)! - 1;
    result.totalRoutes = counts.get(b)!;
    result.routeIndex = Math.max(0, Math.min(requestedIndex, result.totalRoutes - 1));
    let rank = result.routeIndex, current = b;
    const path = [b];
    while (current !== a) {
      const options = predecessors.get(current)!.sort((x, y) => this.counts[y] - this.counts[x] || x - y);
      for (const p of options) { const block = counts.get(p)!; if (rank < block) { current = p; path.push(p); break; } rank -= block; }
    }
    result.route = this.route(path.reverse()); return result;
  }
  graph(chosen: string[], depth: number, set: FilmSet, indices: Record<string, number>): Graph {
    this.filter(set);
    const ids = chosen.map(id => this.ids.get(id)).filter((i): i is number => i !== undefined);
    const pairs: Pair[] = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const key = [chosen[i], chosen[j]].sort().join(':'); pairs.push(this.pair(ids[i], ids[j], depth, indices[key] || 0));
    }
    return { actors: ids.map(i => this.actor(i)), pairs };
  }
}

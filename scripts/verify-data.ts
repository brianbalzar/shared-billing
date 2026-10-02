import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { CreditEngine } from '../src/engine.ts';
const data = JSON.parse(gunzipSync(readFileSync('public/data/credits.bin')).toString());
const engine = new CreditEngine(data);
for (const names of [['Tom Hanks', 'Audrey Hepburn'], ['Tom Hanks', 'Meg Ryan'], ['Tom Hanks', 'Billy Crystal'], ['Setsuko Hara', 'Ziggy Marley']]) {
  const actors = names.map(name => engine.search(name, [], 'popular')[0]);
  if (actors.some(a => !a)) { console.log({ names, missing: true }); continue; }
  const start = performance.now();
  const pair = engine.graph(actors.map(a => a.id), 3, 'popular', {}).pairs[0];
  console.log(JSON.stringify({ names, ms: Math.round(performance.now() - start), direct: pair.direct?.films.map(f => f.title), bridges: pair.bridges.map(r => r.actors[1].name), total: pair.totalRoutes, people: pair.people, path: pair.route?.actors.map(a => a.name) }));
}

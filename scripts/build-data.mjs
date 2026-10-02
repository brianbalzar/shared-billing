import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGunzip, gzipSync } from 'node:zlib';
import { createInterface } from 'node:readline';
import path from 'node:path';
const source = process.argv[2] || path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads');
async function scan(file, visit) {
  const input = createReadStream(path.join(source, file)).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });
  let first = true, count = 0;
  for await (const line of lines) { if (first) { first = false; continue; } visit(line.split('\t')); count++; }
  console.log(`${file}: ${count.toLocaleString()} rows processed`);
}
const ratings = new Map();
await scan('title.ratings.tsv.gz', ([id, rating, votes]) => { if (+votes >= 1000) ratings.set(id, [+votes, +rating]); });
const movies = new Map();
await scan('title.basics.tsv.gz', ([id, type, title, , adult, year]) => {
  if (type === 'movie' && adult === '0' && ratings.has(id)) movies.set(id, [id, title, year === '\\N' ? null : +year, ...ratings.get(id), []]);
});
ratings.clear();
console.log(`${movies.size.toLocaleString()} feature films selected (at least 1,000 votes)`);
const people = new Set();
await scan('title.principals.tsv.gz', ([id, , person, category, , characters]) => {
  const film = movies.get(id);
  if (!film || !['actor', 'actress'].includes(category)) return;
  let role = '';
  try { role = JSON.parse(characters).join(' / '); } catch { /* IMDb missing value */ }
  film[5].push([person, role]); people.add(person);
});
const actors = [], index = new Map();
await scan('name.basics.tsv.gz', ([id, name, birth, , , known]) => {
  if (!people.has(id)) return;
  index.set(id, actors.length);
  const knownTitle = known.split(',').map(id => movies.get(id)).find(Boolean)?.[1] || '';
  actors.push([id, name, birth === '\\N' ? null : +birth, knownTitle, 0]);
});
const films = [...movies.values()].filter(f => f[5].length >= 2);
for (const film of films) {
  film[5] = film[5].filter(([id]) => index.has(id)).map(([id, role]) => { const i = index.get(id); actors[i][4]++; return [i, role]; });
}
const metadata = { generated: new Date().toISOString(), source: 'IMDb non-commercial datasets', minVotes: { hit: 100000, popular: 10000, all: 1000 }, actors: actors.length, films: films.length, counts: { hit: films.filter(f => f[3] >= 100000).length, popular: films.filter(f => f[3] >= 10000).length, all: films.length } };
await mkdir('public/data', { recursive: true });
const json = JSON.stringify({ metadata, actors, films });
await writeFile('public/data/credits.bin', gzipSync(json, { level: 9 }));
await writeFile('public/data/metadata.json', JSON.stringify(metadata, null, 2));
console.log(`Wrote ${actors.length.toLocaleString()} actors / ${films.length.toLocaleString()} films; ${(Buffer.byteLength(json)/1e6).toFixed(1)} MB before compression`);

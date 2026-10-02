// Runs locally or in a trusted build job. Only public image paths are saved.
import { readFile, writeFile, rename } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
let token = process.env.TMDB_TOKEN;
if (!token) {
  try { token = (await readFile('.env.local', 'utf8')).split(/\r?\n/).find(line => line.startsWith('TMDB_TOKEN='))?.slice(11).trim().replace(/^["']|["']$/g, ''); } catch { /* optional local settings */ }
}
if (!token) { console.error('Set TMDB_TOKEN in .env.local to your API Read Access Token, then run npm run data:images.'); process.exit(1); }
const data = JSON.parse(gunzipSync(await readFile('public/data/credits.bin')).toString());
let images = { actors: {}, films: {} };
try { images = JSON.parse(await readFile('public/data/images.json', 'utf8')); } catch { /* first run */ }
async function saveCatalog(snapshot = JSON.stringify(images)) {
  const temporary = 'public/data/images.json.tmp';
  for (let attempt = 0; attempt < 8; attempt++) {
    try { await writeFile(temporary, snapshot); await rename(temporary, 'public/data/images.json'); return; }
    catch (error) { if (attempt === 7) throw error; await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1))); }
  }
}
const limit = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || 500);
const featuredNames = new Set(['Tom Hanks', 'Audrey Hepburn', 'Meg Ryan', 'Billy Crystal', 'Kevin Bacon', 'John Goodman', 'Keith David', 'Julia Roberts', 'Robin Wright', 'Carrie Fisher', 'Christopher Walken', 'Setsuko Hara', 'Ziggy Marley']);
const featuredIds = new Set(data.actors.map((a, i) => featuredNames.has(a[1]) ? i : -1).filter(i => i >= 0));
const popularCounts = new Map(), featuredFilms = new Set(), featuredCostars = new Set(featuredIds);
for (const film of data.films) if (film[3] >= 10000) {
  for (const [actor] of film[5]) popularCounts.set(actor, (popularCounts.get(actor) || 0) + 1);
  if (film[5].some(([actor]) => featuredIds.has(actor))) { featuredFilms.add(film[0]); for (const [actor] of film[5]) featuredCostars.add(actor); }
}
const actorIds = [...new Set([...featuredCostars, ...[...popularCounts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id)])];
const actors = actorIds.map(id => data.actors[id]);
const films = [...data.films].sort((a, b) => Number(featuredFilms.has(b[0])) - Number(featuredFilms.has(a[0])) || b[3] - a[3]).slice(0, Math.max(limit, featuredFilms.size));
console.log(`Preparing images for ${actors.length} actors and ${films.length} films, including the featured examples.`);
async function enrich(rows, kind, field, target) {
  let added = 0, cursor = 0, saving = Promise.resolve();
  const pending = rows.filter(row => !Object.hasOwn(target, row[0]));
  async function run() {
  while (cursor < pending.length) {
    const row = pending[cursor++];
    if (Object.hasOwn(target, row[0])) continue;
    let response;
    for (let attempt = 0; attempt < 4; attempt++) {
      response = await fetch(`https://api.themoviedb.org/3/find/${row[0]}?external_source=imdb_id`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
      if (response.status !== 429 && response.status < 500) break;
      await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
    }
    if (!response.ok) throw new Error(`TMDB returned ${response.status}. Check token access; no credential has been saved to the app.`);
    const result = await response.json();
    target[row[0]] = result[kind]?.[0]?.[field] || '';
    if (++added % 25 === 0) { const snapshot = JSON.stringify(images); saving = saving.then(() => saveCatalog(snapshot)); await saving; console.log(`${added} ${kind} checked`); }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  }
  const results = await Promise.allSettled(Array.from({ length: 4 }, () => run()));
  await saving;
  const failed = results.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
}
try { await enrich(actors, 'person_results', 'profile_path', images.actors); await enrich(films, 'movie_results', 'poster_path', images.films); }
finally { await saveCatalog(); }
console.log('Image paths saved. Rebuild and deploy to display them.');

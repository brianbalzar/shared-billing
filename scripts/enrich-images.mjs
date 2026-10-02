// Runs locally or in a trusted build job. Only public image paths are saved.
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
let token = process.env.TMDB_TOKEN;
if (!token) {
  try { token = (await readFile('.env.local', 'utf8')).split(/\r?\n/).find(line => line.startsWith('TMDB_TOKEN='))?.slice(11).trim().replace(/^["']|["']$/g, ''); } catch { /* optional local settings */ }
}
if (!token) { console.error('Set TMDB_TOKEN in .env.local to your API Read Access Token, then run npm run data:images.'); process.exit(1); }
const data = JSON.parse(gunzipSync(await readFile('public/data/credits.bin')).toString());
let images = { actors: {}, films: {} };
try { images = JSON.parse(await readFile('public/data/images.json', 'utf8')); } catch { /* first run */ }
const limit = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || 500);
const actors = [...data.actors].sort((a, b) => b[4] - a[4]).slice(0, limit);
const films = [...data.films].sort((a, b) => b[3] - a[3]).slice(0, limit);
async function enrich(rows, kind, field, target) {
  let added = 0;
  for (const row of rows) {
    if (Object.hasOwn(target, row[0])) continue;
    const response = await fetch(`https://api.themoviedb.org/3/find/${row[0]}?external_source=imdb_id`, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 429) { await new Promise(resolve => setTimeout(resolve, 3000)); continue; }
    if (!response.ok) throw new Error(`TMDB returned ${response.status}. Check token access; no credential has been saved to the app.`);
    const result = await response.json();
    target[row[0]] = result[kind]?.[0]?.[field] || '';
    if (++added % 25 === 0) { await writeFile('public/data/images.json', JSON.stringify(images)); console.log(`${added} ${kind} checked`); }
    await new Promise(resolve => setTimeout(resolve, 80));
  }
}
try { await enrich(actors, 'person_results', 'profile_path', images.actors); await enrich(films, 'movie_results', 'poster_path', images.films); }
finally { await writeFile('public/data/images.json', JSON.stringify(images)); }
console.log('Image paths saved. Rebuild and deploy to display them.');

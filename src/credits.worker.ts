import { CreditEngine } from './engine';
import type { Dataset } from './types';
let engine: CreditEngine;
try {
  const response = await fetch(`${import.meta.env.BASE_URL}data/credits.bin`);
  if (!response.ok) throw new Error('Could not load the movie credits.');
  const stream = response.body!.pipeThrough(new DecompressionStream('gzip'));
  const data: Dataset = await new Response(stream).json();
  engine = new CreditEngine(data);
  self.postMessage({ type: 'ready', metadata: data.metadata, actors: engine.randomActors('popular'), examples: engine.examples('popular') });
} catch (error) { self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Unable to load the movie credits.' }); }
self.onmessage = ({ data }) => {
  try {
    if (!engine) return;
    if (data.type === 'search') self.postMessage({ type: 'search', id: data.id, results: engine.search(data.query, data.excluded, data.filmSet) });
    if (data.type === 'actors') self.postMessage({ type: 'actors', actors: engine.actorsById(data.ids, data.filmSet) });
    if (data.type === 'graph') self.postMessage({ type: 'graph', id: data.id, graph: engine.graph(data.chosen, data.depth, data.filmSet, data.indices) });
  } catch (error) { self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Search failed. Please try another pair.' }); }
};

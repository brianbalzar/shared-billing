import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Search, SlidersHorizontal, RotateCcw, Plus, Minus, X, ChevronLeft, ChevronRight, Pin, Moon, Sun, Info, ArrowUpRight } from 'lucide-react';
import type { Actor, Evidence, FilmSet, Graph, Metadata, Pair, Route, Selection } from './types';
import { makeGraph, settle } from './layout';
import type { Node, Edge } from './layout';
type Images = { actors: Record<string, string>; films: Record<string, string> };
const labels = { hit: 'Hit films', popular: 'Popular films', all: 'All rated films' };
const initials = (name: string) => name.split(/\s+/).map(n => n[0]).filter(Boolean).slice(0, 2).join('');
const stroke = (count: number) => count >= 6 ? 8 : count >= 4 ? 6 : count === 3 ? 4.5 : count === 2 ? 3 : 1.5;
function Initials({ actor }: { actor: Actor }) { return <span aria-hidden="true">{initials(actor.name)}</span>; }
function Portrait({ actor, images }: { actor: Actor; images: Images }) {
  const [failed, setFailed] = useState(false);
  return images.actors[actor.id] && !failed ? <img src={`https://image.tmdb.org/t/p/w185${images.actors[actor.id]}`} alt="" draggable={false} onError={() => setFailed(true)} /> : <span aria-hidden="true">{initials(actor.name)}</span>;
}
function ActorSearch({ center, ready, chosen, filmSet, worker, images, add, focusToken }: { center?: boolean; ready: boolean; chosen: Actor[]; filmSet: FilmSet; worker: Worker | null; images: Images; add: (a: Actor) => void; focusToken: number }) {
  const [query, setQuery] = useState(''), [results, setResults] = useState<Actor[]>([]), [active, setActive] = useState(0), [open, setOpen] = useState(false), [pending, setPending] = useState(false);
  const input = useRef<HTMLInputElement>(null), container = useRef<HTMLDivElement>(null), request = useRef(0);
  const id = center ? 'center-search' : 'toolbar-search';
  useEffect(() => { if (focusToken) input.current?.focus(); }, [focusToken]);
  useEffect(() => {
    if (!worker) return;
    const listener = ({ data }: MessageEvent) => { if (data.type === 'search' && data.id === request.current) { setResults(data.results); setActive(0); setPending(false); } };
    worker.addEventListener('message', listener); return () => worker.removeEventListener('message', listener);
  }, [worker]);
  useEffect(() => {
    request.current = Date.now();
    if (!query.trim() || !ready) { setResults([]); setPending(false); return; }
    setPending(true);
    const timer = window.setTimeout(() => worker?.postMessage({ type: 'search', id: request.current, query, excluded: chosen.map(a => a.id), filmSet }), 120);
    return () => clearTimeout(timer);
  }, [query, chosen, ready, filmSet, worker]);
  useEffect(() => {
    const listener = (event: PointerEvent) => { if (!container.current?.contains(event.target as HTMLElement)) setOpen(false); };
    document.addEventListener('pointerdown', listener); return () => document.removeEventListener('pointerdown', listener);
  }, []);
  const pick = (actor: Actor) => { add(actor); setQuery(''); setResults([]); setOpen(false); input.current?.focus(); };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); e.stopPropagation(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); setActive(i => Math.max(0, Math.min(results.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))); }
    if (e.key === 'Enter' && open && results[active] && !pending) { e.preventDefault(); pick(results[active]); }
  };
  return <div ref={container} className={`actor-search ${center ? 'center-search' : ''}`}>
    <div className="search-field"><Search size={center ? 18 : 16} /><input ref={input} role="combobox" aria-label="Search for an actor" aria-expanded={open && !!query} aria-controls={`${id}-results`} aria-activedescendant={open && results[active] ? `${id}-${active}` : undefined} autoComplete="off" placeholder={ready ? center ? 'Search for an actor' : 'Add an actor' : 'Loading movie credits…'} disabled={!ready || chosen.length >= 6} value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={key} /><span className="search-count">{chosen.length} of 6</span></div>
    {open && query && <div className="search-results" role="listbox" id={`${id}-results`} aria-label="Actors">
      {pending ? <p className="search-message">Searching the credits…</p> : !results.length ? <p className="search-message">No actors found in {labels[filmSet].toLowerCase()}. Try another name or a wider film filter.</p> : results.map((a, i) => <div role="option" aria-selected={i === active} id={`${id}-${i}`} key={a.id} className={`search-result ${i === active ? 'active' : ''}`} onPointerDown={e => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => pick(a)}><div className="portrait"><Initials actor={a} /></div><div className="search-result-copy"><div><strong>{a.name}</strong> <span>{a.birth ? `b. ${a.birth}` : 'Birth year unknown'}</span></div><small>{a.known || 'Movie credits'} · {a.count} films</small></div>{i === active && <kbd>Enter</kbd>}</div>)}
    </div>}
  </div>;
}
function EvidenceFilms({ evidence, actors, images, heading }: { evidence: Evidence; actors: Actor[]; images: Images; heading?: string }) {
  return <section className="evidence-block">{heading && <h3>{heading}</h3>}{evidence.films.map(f => <div className="film-row" key={f.id}><div className="poster">{images.films[f.id] ? <img src={`https://image.tmdb.org/t/p/w185${images.films[f.id]}`} alt={`${f.title} poster`} onError={e => { e.currentTarget.style.display = 'none'; }} /> : <span>{f.title}</span>}</div><div className="film-copy"><a href={`https://www.imdb.com/title/${f.id}/`} target="_blank" rel="noreferrer">{f.title}<ArrowUpRight size={12} /></a> <span className="year">{f.year || 'Year unknown'}</span><dl>{[evidence.a, evidence.b].map(id => <div key={id}><dt>{actors.find(a => a.id === id)?.name || id}</dt><dd>{f.roles[id] || 'Role not listed'}</dd></div>)}</dl></div></div>)}</section>;
}
function Credits({ images }: { images: Images }) {
  const hasImages = Object.keys(images.actors).length + Object.keys(images.films).length > 0;
  return <span>Film credits: <a href="https://developer.imdb.com/non-commercial-datasets/" target="_blank" rel="noreferrer">IMDb</a>. {hasImages ? <>Images: TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</> : 'Headshots and posters will appear when image data is added.'}</span>;
}
function Panel({ selection, graph, images, shown, expanded, show, close }: { selection: Selection; graph: Graph; images: Images; shown: number; expanded: Record<string, string[]>; show: (pair: string, ids: string[]) => void; close: () => void }) {
  const pair = graph.pairs.find(p => p.id === selection.pair);
  if (!pair) return null;
  const route = selection.kind === 'bridge' ? pair.bridges.find(r => r.actors[1].id === selection.actor) : pair.route;
  const hidden = pair.bridges.filter((r, i) => i >= shown && !expanded[pair.id]?.includes(r.actors[1].id));
  return <aside className="side-panel" aria-label="Connection details"><button className="icon-button panel-close" onClick={close} aria-label="Close connection details"><X size={20} /></button><header className="panel-header"><div className="eyebrow">{selection.kind === 'direct' ? 'Shared films' : selection.kind === 'overflow' ? 'Co-stars in between' : 'Why this co-star appears'}</div><h2>{selection.kind === 'bridge' ? route?.actors[1].name : `${pair.a.name} and ${pair.b.name}`}</h2><div className="panel-meta">{selection.kind !== 'overflow' && <span className={`key-swatch ${selection.kind === 'direct' ? 'direct' : 'route'}`} />}<span>{selection.kind === 'direct' ? `Direct link · ${pair.direct?.films.length} shared ${pair.direct?.films.length === 1 ? 'film' : 'films'}` : selection.kind === 'overflow' ? `${hidden.length} more beyond the ${pair.bridges.length - hidden.length} shown · most shared films first` : `Links ${pair.a.name} and ${pair.b.name} · ${pair.people} ${pair.people === 1 ? 'person' : 'people'} in between`}</span></div>{selection.kind === 'overflow' && hidden.length > 0 && <button className="secondary" onClick={() => show(pair.id, pair.bridges.map(r => r.actors[1].id))}>Show all {pair.bridges.length} in graph</button>}</header><div className="panel-content">
    {selection.kind === 'direct' && pair.direct && <EvidenceFilms evidence={pair.direct} actors={[pair.a, pair.b]} images={images} />}
    {(selection.kind === 'bridge' || selection.kind === 'route') && route?.links.map((link, i) => <EvidenceFilms key={`${link.a}:${link.b}`} evidence={link} actors={route.actors} images={images} heading={`Link ${i + 1} · ${route.actors[i].name} + ${route.actors[i + 1].name}`} />)}
    {selection.kind === 'overflow' && (hidden.length ? hidden.map(r => <div className="overflow-row" key={r.actors[1].id}><div className="portrait"><Initials actor={r.actors[1]} /></div><div className="overflow-copy"><strong>{r.actors[1].name}</strong><dl>{r.links.map((link, i) => <div key={i}><dt>{i === 0 ? pair.a.name : pair.b.name}</dt><dd>{link.films.map(f => f.title).join(', ')}</dd></div>)}</dl></div><button className="secondary small" onClick={() => show(pair.id, [r.actors[1].id])}>Show</button></div>) : <p className="panel-message">All co-stars are now shown in the graph.</p>)}
  </div><footer><Credits images={images} /></footer></aside>;
}
function GraphCanvas({ graph, width, height, shown, expanded, pinned, setPinned, selection, select, images, remove, add, indices, setIndices }: { graph: Graph; width: number; height: number; shown: number; expanded: Record<string, string[]>; pinned: Record<string, { x: number; y: number }>; setPinned: (p: Record<string, { x: number; y: number }>) => void; selection: Selection | null; select: (s: Selection | null) => void; images: Images; remove: (id: string) => void; add: () => void; indices: Record<string, number>; setIndices: (i: Record<string, number>) => void }) {
  const result = useMemo(() => { const result = makeGraph(graph, shown, expanded); result.nodes = settle(result.nodes, result.edges, width, height, pinned); return result; }, [graph, shown, expanded, width, height, pinned]);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragStart = useRef<{ id: string; clientX: number; clientY: number; x: number; y: number; moved: boolean } | null>(null);
  const nodes = result.nodes.map(n => drag?.id === n.id ? { ...n, x: drag.x, y: drag.y } : n);
  const map = new Map(nodes.map(n => [n.id, n]));
  const pair = graph.pairs.find(p => p.id === selection?.pair);
  const selectedRoute = selection?.kind === 'bridge' ? pair?.bridges.find(r => r.actors[1].id === selection.actor) : selection?.kind === 'route' ? pair?.route : null;
  const routeIds = new Set(selectedRoute?.actors.map(a => a.id));
  const nodeDim = (n: Node) => n.kind !== 'chosen' && selectedRoute && !routeIds.has(n.id);
  const activate = (n: Node) => {
    if (n.kind === 'overflow') select({ kind: 'overflow', pair: n.pair! });
    else if (n.kind !== 'chosen') { const p = graph.pairs.find(p => p.bridges.some(r => r.actors[1].id === n.id) || p.route?.actors.some(a => a.id === n.id)); if (p) select(p.route ? { kind: 'route', pair: p.id, actor: n.id } : { kind: 'bridge', pair: p.id, actor: n.id }); }
  };
  const edgeSelect = (edge: Edge) => { select(edge.kind === 'direct' ? { kind: 'direct', pair: edge.pair } : edge.kind === 'overflow' ? { kind: 'overflow', pair: edge.pair } : edge.deep ? { kind: 'route', pair: edge.pair } : { kind: 'bridge', pair: edge.pair, actor: edge.routeActor! }); };
  const deeper = graph.pairs.filter(p => p.route);
  return <><svg className="graph-links" width={width} height={height} aria-label="Shared film connections">
    {result.edges.map(edge => {
      const a = map.get(edge.a)!, b = map.get(edge.b)!;
      const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy) || 1;
      const offset = edge.kind === 'direct' ? -Math.min(90, distance * .18) : 0;
      const c = { x: (a.x + b.x) / 2 - dy / distance * offset, y: (a.y + b.y) / 2 + dx / distance * offset };
      const start = { x: a.x + dx / distance * a.radius, y: a.y + dy / distance * a.radius }, end = { x: b.x - dx / distance * b.radius, y: b.y - dy / distance * b.radius };
      const d = `M ${start.x} ${start.y} Q ${c.x} ${c.y} ${end.x} ${end.y}`;
      const gold = edge.deep || !!selectedRoute?.links.some(l => [l.a, l.b].sort().join(':') === [edge.a, edge.b].sort().join(':'));
      const directSelected = selection?.kind === 'direct' && selection.pair === edge.pair;
      const dimmed = selectedRoute && !gold;
      const labelX = .25 * start.x + .5 * c.x + .25 * end.x, labelY = .25 * start.y + .5 * c.y + .25 * end.y;
      const labelWidth = Math.max(70, Math.min(240, distance - a.radius - b.radius - 28));
      const color = `var(--color-${gold ? 'route' : edge.kind === 'direct' ? 'direct' : 'bridge'})`;
      return <g key={edge.id} className={`edge ${dimmed ? 'dimmed' : ''} ${directSelected ? 'direct-selected' : ''} ${gold ? 'route-selected' : ''}`}>
        {directSelected && <path d={d} stroke="var(--color-direct-surface)" strokeWidth={stroke(edge.count) + 10} fill="none" />}
        <path className="link-stroke" d={d} stroke={color} strokeWidth={edge.kind === 'overflow' ? 1 : stroke(edge.count) + (gold ? 1.5 : 0)} fill="none" strokeLinecap="round" strokeDasharray={edge.kind === 'overflow' ? '4 4' : undefined} />
        <path className="link-hit" d={d} stroke="transparent" strokeWidth={18} fill="none" tabIndex={0} role="button" aria-label={edge.kind === 'overflow' ? 'Show more co-stars' : `${a.actor?.name} and ${b.actor?.name}: ${edge.title}`} onClick={e => { e.stopPropagation(); edgeSelect(edge); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); edgeSelect(edge); } }} />
        {edge.title && <foreignObject x={labelX - labelWidth / 2} y={labelY - 13} width={labelWidth} height={32} className="label-foreign"><div className="link-label-wrap"><button title={edge.title} className={`link-label ${edge.kind === 'direct' ? 'direct' : ''} ${gold ? 'gold' : ''} ${directSelected ? 'selected' : ''}`} tabIndex={-1} onClick={e => { e.stopPropagation(); edgeSelect(edge); }}>{edge.title}</button></div></foreignObject>}
      </g>;
    })}
  </svg><div className="graph-nodes">{nodes.map((n, i) => <div key={n.id} className={`graph-node ${n.kind} ${nodeDim(n) ? 'dimmed' : ''} ${selectedRoute && routeIds.has(n.id) && n.kind !== 'chosen' || !selectedRoute && deeper.some(p => p.route?.actors.slice(1, -1).some(a => a.id === n.id)) ? 'on-route' : ''} ${drag?.id === n.id ? 'dragging' : ''}`} style={{ left: n.x, top: n.y, animationDelay: `${Math.min(i, 8) * 40}ms` }}>
    <button className={`node-button ${selection?.kind === 'overflow' && selection.pair === n.pair ? 'open' : ''}`} aria-label={n.kind === 'overflow' ? `${n.label} co-stars` : `${n.actor!.name}${n.kind === 'chosen' ? ', chosen actor. Drag to pin.' : ', show linking films. Drag to pin.'}`} onClick={e => { e.stopPropagation(); if (!dragStart.current?.moved) activate(n); }} onPointerDown={e => { if (n.kind === 'overflow' || e.button !== 0) return; e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); dragStart.current = { id: n.id, clientX: e.clientX, clientY: e.clientY, x: n.x, y: n.y, moved: false }; }} onPointerMove={e => { const start = dragStart.current; if (!start || start.id !== n.id || !e.currentTarget.hasPointerCapture(e.pointerId)) return; const dx = e.clientX - start.clientX, dy = e.clientY - start.clientY; if (Math.hypot(dx, dy) > 4) start.moved = true; if (start.moved) setDrag({ id: n.id, x: Math.max(65, Math.min(width - 65, start.x + dx)), y: Math.max(85, Math.min(height - 90, start.y + dy)) }); }} onPointerUp={e => { if (drag?.id === n.id) { setPinned({ ...pinned, [n.id]: { x: drag.x / width, y: drag.y / height } }); setDrag(null); } if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { setDrag(null); dragStart.current = null; }}>
      {n.kind === 'overflow' ? n.label : <span className="node-portrait">{n.kind === 'chosen' || n.kind === 'hub' && (selection?.kind === 'bridge' || selection?.kind === 'route') && selection.actor === n.id ? <Portrait actor={n.actor!} images={images} /> : <Initials actor={n.actor!} />}</span>}
    </button>{n.actor && <><div className="node-name">{n.actor.name}</div>{n.kind === 'hub' && <div className="hub-caption">{n.linksTo.size === graph.actors.length ? `Links all ${n.linksTo.size}` : `Links ${n.linksTo.size} actors`}</div>}{pinned[n.id] && <span className="pin-badge" title="Pinned"><Pin size={13} /></span>}{n.kind === 'chosen' && <button className="remove-actor" aria-label={`Remove ${n.actor.name}`} onClick={e => { e.stopPropagation(); remove(n.id); }}><Minus size={14} /></button>}</>}
  </div>)}</div>{graph.actors.length < 6 && <button className="add-node" style={{ left: width - 135, top: height - 155 }} onClick={e => { e.stopPropagation(); add(); }} aria-label="Add actor"><span><Plus size={32} strokeWidth={1.5} /></span><small>Add actor</small></button>}
  {deeper.length > 0 && <div className="route-steppers">{deeper.map(p => <div className="route-stepper" key={p.id}><button className="icon-button" disabled={p.routeIndex === 0} aria-label={`Previous route for ${p.a.name} and ${p.b.name}`} onClick={e => { e.stopPropagation(); setIndices({ ...indices, [p.id]: p.routeIndex - 1 }); select({ kind: 'route', pair: p.id }); }}><ChevronLeft size={18} /></button><button className="route-caption" onClick={e => { e.stopPropagation(); select({ kind: 'route', pair: p.id }); }}><strong>Route {p.routeIndex + 1} of {p.totalRoutes.toLocaleString()}</strong><span>All have {p.people} people in between</span>{deeper.length > 1 && <small>{p.a.name} + {p.b.name}</small>}</button><button className="icon-button" disabled={p.routeIndex + 1 >= p.totalRoutes} aria-label={`Next route for ${p.a.name} and ${p.b.name}`} onClick={e => { e.stopPropagation(); setIndices({ ...indices, [p.id]: p.routeIndex + 1 }); select({ kind: 'route', pair: p.id }); }}><ChevronRight size={18} /></button></div>)}</div>}
  </>;
}
export default function App() {
  const [worker, setWorker] = useState<Worker | null>(null), [metadata, setMetadata] = useState<Metadata | null>(null), [error, setError] = useState('');
  const [chosen, setChosen] = useState<Actor[]>([]), [depth, setDepth] = useState(1), [filmSet, setFilmSet] = useState<FilmSet>('popular'), [shown, setShown] = useState(5);
  const [graph, setGraph] = useState<Graph>({ actors: [], pairs: [] }), [loading, setLoading] = useState(false), [selection, setSelection] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState<Record<string, string[]>>({}), [pinned, setPinned] = useState<Record<string, { x: number; y: number }>>({}), [indices, setIndices] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState(false), [about, setAbout] = useState(false), [focusToken, setFocusToken] = useState(0), [images, setImages] = useState<Images>({ actors: {}, films: {} });
  const [theme, setTheme] = useState(() => localStorage.getItem('shared-billing-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [size, setSize] = useState({ width: 1440, height: 836 });
  const canvas = useRef<HTMLDivElement>(null), settingsRef = useRef<HTMLDivElement>(null), request = useRef(0), loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const w = new Worker(new URL('./credits.worker.ts', import.meta.url), { type: 'module' }); setWorker(w);
    w.onmessage = ({ data }) => { if (data.type === 'ready') setMetadata(data.metadata); if (data.type === 'error') { if (loadingTimer.current) clearTimeout(loadingTimer.current); setError(data.message); setLoading(false); } if (data.type === 'graph' && data.id === request.current) { if (loadingTimer.current) clearTimeout(loadingTimer.current); setGraph(data.graph); setLoading(false); setError(''); } };
    w.onerror = () => { setError('Movie credits could not load. Please reload and try again.'); setLoading(false); };
    fetch(`${import.meta.env.BASE_URL}data/images.json`).then(r => r.ok ? r.json() : null).then(data => { if (data) setImages(data); }).catch(() => {});
    return () => w.terminate();
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('shared-billing-theme', theme); }, [theme]);
  useEffect(() => {
    if (!canvas.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(canvas.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!metadata || !worker) return;
    const id = ++request.current;
    loadingTimer.current = setTimeout(() => setLoading(true), 150);
    worker.postMessage({ type: 'graph', id, chosen: chosen.map(a => a.id), depth, filmSet, indices });
    return () => { if (loadingTimer.current) clearTimeout(loadingTimer.current); };
  }, [metadata, worker, chosen, depth, filmSet, indices]);
  useEffect(() => {
    const key = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setSelection(null); setSettings(false); setAbout(false); } };
    const outside = (e: PointerEvent) => { if (!settingsRef.current?.contains(e.target as HTMLElement)) setSettings(false); };
    document.addEventListener('keydown', key); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside); };
  }, []);
  const add = (a: Actor) => { setChosen(previous => previous.length >= 6 || previous.some(p => p.id === a.id) ? previous : [...previous, a]); setSelection(null); setExpanded({}); };
  const remove = (id: string) => { setChosen(chosen.filter(a => a.id !== id)); setSelection(null); setExpanded({}); const p = { ...pinned }; delete p[id]; setPinned(p); };
  const tryExample = () => { setChosen([{ id: 'nm0000158', name: 'Tom Hanks', birth: 1956, known: 'Forrest Gump', count: 0 }, { id: 'nm0000030', name: 'Audrey Hepburn', birth: 1929, known: 'Roman Holiday', count: 0 }]); setDepth(1); setFilmSet('popular'); setSelection(null); setExpanded({}); setPinned({}); };
  const panelOpen = !!selection && graph.pairs.some(p => p.id === selection.pair);
  const graphWidth = size.width - (panelOpen ? Math.min(size.width <= 1100 ? 380 : 440, size.width * .45) : 0);
  const activeGraph = useMemo(() => ({ ...graph, actors: chosen.map(a => graph.actors.find(g => g.id === a.id) || a), pairs: graph.pairs.filter(p => chosen.some(c => c.id === p.a.id) && chosen.some(c => c.id === p.b.id)) }), [graph, chosen]);
  const empty = chosen.length < 2;
  const noConnection = !empty && !loading && activeGraph.pairs.length === 1 && activeGraph.pairs[0].people === null;
  const directCount = activeGraph.pairs.reduce((sum, p) => sum + (p.direct?.films.length || 0), 0), bridgeCount = activeGraph.pairs.reduce((sum, p) => sum + p.bridges.length, 0);
  const missing = activeGraph.pairs.filter(p => p.people === null).length;
  const show = (pair: string, ids: string[]) => setExpanded({ ...expanded, [pair]: [...new Set([...(expanded[pair] || []), ...ids])] });
  return <div className="app"><header className="topbar"><div className="wordmark"><div>Shared Billing</div><span>Find the actors who connect any two stars.</span></div>{!empty && <ActorSearch ready={!!metadata} chosen={chosen} filmSet={filmSet} worker={worker} images={images} add={add} focusToken={focusToken} />}<div className="toolbar-spacer" /><div className={`depth-control ${empty ? 'quiet' : ''}`}><label htmlFor="people-between">People in between</label><div className="slider"><input id="people-between" type="range" min={0} max={3} step={1} value={depth} disabled={empty} aria-valuetext={`${depth} ${depth === 1 ? 'person' : 'people'} in between`} onChange={e => { setDepth(+e.target.value); setSelection(null); setExpanded({}); }} style={{ '--fill': `${depth / 3 * 100}%` } as React.CSSProperties} /><div className="slider-labels">{[0, 1, 2, 3].map(n => <span className={n === depth ? 'active' : ''} key={n}>{n}</span>)}</div></div></div><div className="settings-anchor" ref={settingsRef}><button className="text-button" aria-expanded={settings} onClick={() => setSettings(!settings)}><SlidersHorizontal size={16} />{labels[filmSet]}</button>{settings && <div className="settings-popover"><h3>Films that count</h3><div role="radiogroup" aria-label="Films that count">{(['hit', 'popular', 'all'] as FilmSet[]).map(set => <button role="radio" aria-checked={filmSet === set} key={set} className={`filter-option ${filmSet === set ? 'active' : ''}`} onClick={() => { setFilmSet(set); setSelection(null); setExpanded({}); }}><span className="radio-mark" /><span>{labels[set]}</span><small>{metadata ? metadata.counts[set].toLocaleString() : '…'} films</small></button>)}</div><p>Fewer films means fewer bridges. Based on IMDb vote counts.</p><div className="bridge-setting"><label>Bridges shown per pair</label><div><button className="icon-button" aria-label="Show fewer bridges" disabled={shown <= 1} onClick={() => setShown(shown - 1)}><Minus size={14} /></button><output>{shown}</output><button className="icon-button" aria-label="Show more bridges" disabled={shown >= 12} onClick={() => setShown(shown + 1)}><Plus size={14} /></button></div></div></div>}</div><button className="text-button reset" disabled={!Object.keys(pinned).length} onClick={() => setPinned({})}><RotateCcw size={16} />Reset layout</button><button className="icon-button theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button></header>
    <main ref={canvas} className={`canvas ${panelOpen ? 'has-panel' : ''}`} onClick={() => { setSelection(null); setSettings(false); }}>
      {empty ? <div className="empty-state" onClick={e => e.stopPropagation()}><button className="empty-add" aria-label="Search for an actor" onClick={() => setFocusToken(focusToken + 1)}><Plus size={32} strokeWidth={1.5} /></button><h1>Who's connected to who?</h1><p>Pick two actors, or up to six. Shared films draw as lines. If two of them never met on set, we'll pull in the co-stars who connect them.</p>{chosen.length === 1 && <div className="first-actor"><div className="portrait"><Portrait actor={chosen[0]} images={images} /></div><strong>{chosen[0].name}</strong><span>Now add one more.</span><button className="icon-button" aria-label={`Remove ${chosen[0].name}`} onClick={() => remove(chosen[0].id)}><X size={14} /></button></div>}<ActorSearch center ready={!!metadata} chosen={chosen} filmSet={filmSet} worker={worker} images={images} add={add} focusToken={focusToken} /><div className="example-label">Or start with an example</div><div className="example-card"><div className="mini-graph" aria-hidden="true"><span>TH</span><i /><b /><i /><span>AH</span></div><div className="example-copy"><strong>Tom Hanks + Audrey Hepburn</strong><span>No shared film, but two co-stars connect them.</span></div><button className="primary" disabled={!metadata} onClick={tryExample}>Try it</button></div>{!metadata && !error && <div className="initial-loading" role="status">Preparing the movie credits…</div>}</div> : <><div className="summary" role="status">{loading ? 'Finding connections…' : `${directCount ? `${directCount} shared ${directCount === 1 ? 'film' : 'films'}` : 'No shared films'}${bridgeCount ? ` · ${bridgeCount} co-stars link them · showing ${new Set(makeGraph(activeGraph, shown, expanded).nodes.filter(n => n.kind === 'bridge' || n.kind === 'hub').map(n => n.id)).size}` : ''}${activeGraph.pairs.some(p => p.route) ? ' · shortest routes found' : ''}${missing && activeGraph.pairs.length > 1 ? ` · ${missing} ${missing === 1 ? 'pair has' : 'pairs have'} no connection at this depth` : ''}`}</div><GraphCanvas graph={activeGraph} width={graphWidth} height={size.height} shown={shown} expanded={expanded} pinned={pinned} setPinned={setPinned} selection={selection} select={setSelection} images={images} remove={remove} add={() => setFocusToken(focusToken + 1)} indices={indices} setIndices={setIndices} />{loading && <div className="loading-state" role="status"><span>Rolling the credits…</span><div><i /></div></div>}{noConnection && <div className="no-connection" onClick={e => e.stopPropagation()}><h2>{depth === 0 ? 'These two never crossed paths.' : 'No connection at this depth.'}</h2><p>{depth === 0 ? `${chosen[0].name} and ${chosen[1].name} never shared a film in this dataset. Let one person in between and we'll look for who links them.` : `No route connects ${chosen[0].name} and ${chosen[1].name} within ${depth} ${depth === 1 ? 'person' : 'people'} in between using ${labels[filmSet].toLowerCase()}. IMDb's principal cast lists are partial.`}</p>{depth < 3 ? <button className="primary" onClick={() => setDepth(depth + 1)}>Allow {depth + 1} {depth + 1 === 1 ? 'person' : 'people'} in between</button> : filmSet !== 'all' ? <button className="secondary" onClick={() => setFilmSet('all')}>Try all rated films</button> : <button className="secondary" onClick={() => setFocusToken(focusToken + 1)}>Try another actor</button>}</div>}</>}
      {error && <div className="error-state" role="alert"><strong>Couldn't load the credits.</strong><p>{error}</p><button className="secondary" onClick={() => location.reload()}>Try again</button></div>}
      {!panelOpen && <div className="attribution"><Credits images={images} /></div>}<button className="icon-button about-button" aria-label="About Shared Billing and its data" onClick={e => { e.stopPropagation(); setAbout(true); }}><Info size={17} /></button>
      {panelOpen && selection && <div onClick={e => e.stopPropagation()}><Panel selection={selection} graph={activeGraph} images={images} shown={shown} expanded={expanded} show={show} close={() => setSelection(null)} /></div>}
    </main>{about && <div className="modal-backdrop" onClick={() => setAbout(false)}><section className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={e => e.stopPropagation()}><button autoFocus className="icon-button panel-close" onClick={() => setAbout(false)} aria-label="Close about"><X size={20} /></button><div className="eyebrow">A little movie detective work</div><h2 id="about-title">Shared Billing</h2><p>Follow the films and co-stars that connect any two actors. Every connection comes with the credits behind it.</p><h3>About the data</h3><p>Based on IMDb's non-commercial datasets. Only feature films with at least 1,000 votes are included. Popular films have 10,000+ votes; hit films have 100,000+. Cast lists include principal actors and actresses, so filmographies and connections are partial. Voice performances count when included in the credits.</p>{metadata && <p className="muted">{metadata.films.toLocaleString()} films · {metadata.actors.toLocaleString()} people<br />Prepared {new Date(metadata.generated).toLocaleDateString()}</p>}<p>For personal, noncommercial exploration. <a href="https://www.imdb.com/interfaces/" target="_blank" rel="noreferrer">IMDb dataset information</a>.</p>{(Object.keys(images.actors).length > 0 || Object.keys(images.films).length > 0) && <><a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer"><img className="tmdb-logo" src={`${import.meta.env.BASE_URL}tmdb.svg`} alt="TMDB" /></a><p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p></>}<button className="secondary" onClick={() => setAbout(false)}>Back to the graph</button></section></div>}
  </div>;
}

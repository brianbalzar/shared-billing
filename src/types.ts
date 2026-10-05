export type FilmSet = 'hit' | 'popular' | 'all';
export interface Actor { id: string; name: string; birth: number | null; known: string; count: number }
export interface Film { id: string; title: string; year: number | null; votes: number; rating: number; roles: Record<string, string> }
export interface Evidence { a: string; b: string; films: Film[] }
export interface Route { actors: Actor[]; links: Evidence[] }
export interface Pair { id: string; a: Actor; b: Actor; direct: Evidence | null; bridges: Route[]; route: Route | null; totalRoutes: number; people: number | null; routeIndex: number }
export interface Graph { actors: Actor[]; pairs: Pair[] }
export interface Metadata { generated: string; actors: number; films: number; counts: Record<FilmSet, number>; minVotes: Record<FilmSet, number> }
export interface Dataset { metadata: Metadata; actors: [string, string, number | null, string, number][]; films: [string, string, number | null, number, number, [number, string][]][] }
export type ExampleKind = 'shared' | 'unexpected' | 'two-steps' | 'crowded';
export interface Example { kind: ExampleKind; label: string; depth: number; actors: [Actor, Actor] }
export type Selection = { kind: 'direct' | 'overflow'; pair: string } | { kind: 'route'; pair: string; actor?: string } | { kind: 'bridge'; pair: string; actor: string };

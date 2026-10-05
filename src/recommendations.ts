import type { ExampleKind, Pair } from './types';
// A deliberate mix of familiar film stars across generations. Credit count alone
// would recommend prolific supporting performers rather than recognizable names.
export const recommendedActors = new Set([
  'Tom Hanks', 'Audrey Hepburn', 'Denzel Washington', 'Meryl Streep',
  'Leonardo DiCaprio', 'Kate Winslet', 'Brad Pitt', 'Angelina Jolie',
  'George Clooney', 'Julia Roberts', 'Sandra Bullock', 'Keanu Reeves',
  'Morgan Freeman', 'Samuel L. Jackson', 'Harrison Ford', 'Carrie Fisher',
  'Robert De Niro', 'Al Pacino', 'Dustin Hoffman', 'Jack Nicholson',
  'Anthony Hopkins', 'Jodie Foster', 'Michael Caine', 'Helen Mirren',
  'Judi Dench', 'Maggie Smith', 'Robin Williams', 'Whoopi Goldberg',
  'Eddie Murphy', 'Steve Martin', 'Billy Crystal', 'Bill Murray',
  'Meg Ryan', 'Michelle Pfeiffer', 'Susan Sarandon', 'Geena Davis',
  'Tom Cruise', 'Nicole Kidman', 'Will Smith', 'Charlize Theron',
  'Matt Damon', 'Ben Affleck', 'Christian Bale', 'Natalie Portman',
  'Scarlett Johansson', 'Robert Downey Jr.', 'Chris Evans', 'Chris Hemsworth',
  'Mark Ruffalo', 'Jeremy Renner', 'Chris Pratt', 'Zoe Saldana',
  'Ryan Reynolds', 'Ryan Gosling', 'Emma Stone', 'Emma Watson',
  'Jennifer Lawrence', 'Anne Hathaway', 'Hugh Jackman', 'Reese Witherspoon',
  'Cate Blanchett', 'Amy Adams', 'Viola Davis', 'Octavia Spencer',
  'Lupita Nyong\'o', 'Daniel Kaluuya', 'Michael B. Jordan', 'Idris Elba',
  'Florence Pugh', 'Saoirse Ronan', 'Timothée Chalamet', 'Zendaya',
  'Pedro Pascal', 'Oscar Isaac', 'Adam Driver', 'Margot Robbie',
  'Cillian Murphy', 'Emily Blunt', 'Jenna Ortega', 'Paul Mescal',
  'Kevin Bacon', 'John C. Reilly', 'Willem Dafoe', 'Jeff Bridges',
  'Kurt Russell', 'Sigourney Weaver', 'Jamie Lee Curtis', 'Michael Keaton',
  'Danny DeVito', 'John Travolta', 'Diane Keaton', 'Goldie Hawn',
  'Clint Eastwood', 'Robert Redford', 'Paul Newman', 'Elizabeth Taylor',
  'Cary Grant', 'James Stewart', 'Humphrey Bogart', 'Ingrid Bergman',
  'Marilyn Monroe', 'Grace Kelly', 'Sidney Poitier', 'Gregory Peck',
  'Bette Davis', 'Katharine Hepburn', 'Marlon Brando', 'Debbie Reynolds',
  'Jackie Chan', 'Michelle Yeoh', 'Jet Li', 'Bruce Lee',
  'Shah Rukh Khan', 'Aamir Khan', 'Amitabh Bachchan', 'Deepika Padukone',
  'Penélope Cruz', 'Javier Bardem', 'Antonio Banderas', 'Salma Hayek',
]);
// Curated starting pairs. Each label is a claim about the Popular films set, so the engine re-checks it
// against the loaded data (exampleHolds) and the app only offers pairs whose label is still true.
export const exampleCandidates: { kind: ExampleKind; label: string; depth: number; names: [string, string] }[] = [
  { kind: 'shared', label: 'Shared films', depth: 1, names: ['Brad Pitt', 'George Clooney'] },
  { kind: 'unexpected', label: 'Unexpected connection', depth: 1, names: ['Bette Davis', 'Margot Robbie'] },
  { kind: 'two-steps', label: 'Two steps apart', depth: 2, names: ['Gregory Peck', 'Tom Hanks'] },
  { kind: 'crowded', label: 'Lots of mutual co-stars', depth: 1, names: ['Samuel L. Jackson', 'Nicole Kidman'] },
];
export function exampleHolds(kind: ExampleKind, pair: Pair) {
  const gap = pair.a.birth && pair.b.birth ? Math.abs(pair.a.birth - pair.b.birth) : 0;
  if (kind === 'shared') return !!pair.direct && pair.direct.films.length >= 3;
  if (kind === 'unexpected') return !pair.direct && pair.bridges.length >= 1 && pair.bridges.length <= 3 && gap >= 25;
  if (kind === 'two-steps') return !pair.direct && !pair.bridges.length && pair.people === 2;
  return !pair.direct && pair.bridges.length >= 30;
}

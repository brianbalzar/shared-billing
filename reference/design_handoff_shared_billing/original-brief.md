# Co-star finder: design brief

Oct 2, 2026 · @Brian Balzar

## Concept

One screen: you pick 2–6 actors, and the app draws how they connect through the films they made. Chosen actors are large bubbles; films are links between them. When two chosen actors never shared a film, the app finds the shortest chain of co-stars and adds those people automatically as smaller "bridge" bubbles.

- Co-star overlap and degrees of separation are the same view, not two modes. A solid link means a shared film; bridges appear only where a direct link doesn't exist.
- A force layout positions everything automatically. Chosen actors spread across the canvas; bridges settle between the people they connect, and a bridge that links several chosen actors drifts to the middle as a hub.
- Every link is clickable and opens the films behind it.
- Personal project, desktop-first, single static page.

## Visual language

The hierarchy has to read at a glance: the actors you chose, then the people the app pulled in, then everything else.

| Element | What it represents | Design direction |
| --- | --- | --- |
| Chosen actor bubble | An actor the user added | Large (about 2× a bridge), headshot fill, name label, a "−" control to remove |
| Bridge bubble | A co-star the app added to connect two chosen actors | Small, quieter treatment (muted or desaturated headshot), name on hover or small label |
| Add bubble | Empty slot with "+" | Dashed outline, same size as a chosen bubble, sits on the canvas, not in a toolbar |
| Direct link | One or more films two people share | Curved arc; thickness scales with film count (1 vs 4 films must look different) |
| Overflow node | Bridges beyond the top 5 for a pair, collapsed | Small pill like "+18 more"; click to expand into the graph or into a list |
| Hub | A bridge connecting 3+ chosen actors | Same as a bridge, but slightly larger or ringed so it reads as important |

Keep color to two roles: one accent for chosen actors and their links, neutral for everything the app added. Selection and hover can use the accent. Light and dark mode both required.

## Screens and states to design

Design these seven states. Each uses real data from the IMDb spike, so the layouts reflect actual density, not a toy example.

1. **Empty start.** No actors yet. One add bubble and a search box; an invitation to start, not an empty canvas.
2. **Two actors, direct link.** Tom Hanks and Meg Ryan: one thick arc, 4 films (*Joe Versus the Volcano*, *Sleepless in Seattle*, *You've Got Mail*, *Ithaca*). The simplest happy path.
3. **Two actors, one bridge.** Audrey Hepburn and Tom Hanks, no shared film. Two bridges: John Goodman (*Always* / *Punchline*) and Keith David (*Always* / *Cloud Atlas*). Calm, readable.
4. **Two actors, crowded bridges.** Tom Hanks and Billy Crystal: 23 bridges, including Meg Ryan, Carrie Fisher, Robin Wright, Helen Hunt, Christopher Walken, and Julia Roberts. Show the top 5 plus a "+18 more" overflow node. This is the most important state to get right.
5. **Four actors with a hub.** Hanks, Crystal, Kevin Bacon, Hepburn. Hanks–Bacon link directly (*Apollo 13*); every other pair needs a bridge. John Goodman bridges all five of the other pairs, so he should read as a hub in the middle.
6. **Deeper path.** Two lesser-known actors 3–4 people apart. Show one best chain and a count like "1 of 129 routes", with a way to step to the next route.
7. **Link detail.** Clicking a link opens the films: poster, title, year, and roles. Decide between a side panel and a popover; a side panel is probably better because a pair can share up to a dozen films.

Also design: the no-connection message (rare, but needed when the slider is set too low) and a loading state, which should be brief because searches finish in under a second.

## Controls

Controls stay minimal so the graph owns the screen.

- **Actor search.** Typeahead with headshot, name, and birth year in each result. Several actors share common names, so the year disambiguates. Opened from the add bubble or a search box.
- **Add and remove.** The "+" bubble adds; the "−" on a chosen bubble removes. Minimum 2 actors, maximum 6; past 6 the links become unreadable.
- **People in between.** A slider from 0 to 3, labeled "People in between" (not "degrees", which is ambiguous). 0 shows only direct shared films. The spike found no pair needing more than 4, so 3 is the cap, with deeper results shown as a rare case.
- **Popularity filter.** Optional, possibly tucked into a settings popover. It controls which films count, from "Hit films" (about 7,000 movies) to "All rated films" (about 47,000). The default is about 19,000 movies. Raising it is also the main clutter control: Hanks–Crystal drops from 23 bridges to 12.
- **Bridges shown per pair.** Default 5, with the overflow node holding the rest.
- **Drag and pin.** Users can drag any bubble, and a dragged bubble stays where it's dropped. A "reset layout" control releases them.

## Data facts and constraints

The design must handle the data as it really behaves, measured on IMDb's datasets.

| Measure | Real value | Design implication |
| --- | --- | --- |
| Bridges at 1 person in between | 1–3 for an older star; 15–29 for famous pairs | Crowding is the default, not an edge case |
| Shortest-path depth, random pairs | About 70% need 2 or fewer people; deepest found was 4 | Slider tops out at 3 |
| Equally short routes, 2+ people in between | Median 12–20; one pair had 1,005 | Show one best route plus a count, never all |
| Search speed | Under 1 second | Loading state can be minimal |

Known data quirks:

- Voice roles count, so Pixar films create many links. A link might show a role label like "voice" in the detail panel.
- IMDb lists only about the top 10 billed people per film, so filmographies are partial. Tom Hanks shows 68 films.
- Cameos as oneself can slip in, such as the mockumentary *I'm Still Here*.
- Headshots and posters come from TMDB, which requires a visible attribution line. Plan a spot for it, and a fallback (initials) when a headshot is missing.

## Deliverables and scope

Claude Design should return static frames of the seven states above plus a token set the build can consume directly.

- [ ] Desktop frames (about 1440 px wide) for all seven states, light and dark
- [ ] Token file: colors, type scale, spacing, bubble sizes, and link stroke widths by film count
- [ ] Actor search and typeahead result row
- [ ] Link detail panel with film poster rows
- [ ] Overflow node, collapsed and expanded
- [ ] Empty, loading, and no-connection states
- [ ] Suggested name for the app

Out of scope for this pass:

- Motion and the force-layout physics. These get tuned in code, since static frames can't show how bubbles settle.
- Mobile layout. Desktop-first; revisit once the desktop version works.
- Accounts, saved searches, and sharing.

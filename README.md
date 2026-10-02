# Shared Billing

A desktop-first movie co-star explorer, built with React, TypeScript, SVG, and a settled d3-force layout. Search for 2–6 actors and inspect the real film credits behind direct links, co-stars, and deeper shortest routes. Light and dark themes, keyboard search, overflow lists, film filters, and drag-to-pin layouts are included.

Each fresh visit or reload opens with two distinct random actors who have credits in the default Popular films dataset. Remove actors to start your own search; the manual Hanks–Hepburn example remains available in the empty state.

## Development

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
npm test
npm run build
```

Open the local URL printed by Vite, followed by `/shared-billing/`.

## Movie data

The checked-in `public/data/credits.bin` is a compressed subset prepared from the IMDb non-commercial datasets downloaded October 2, 2026. Search and connection finding run in a Web Worker; the app decompresses the data once in the browser and requires no backend. It includes non-adult feature films with at least 1,000 IMDb votes, principal actor/actress credits, role text, birth years, and known-for titles. Principal casts are partial, so an absent link does not establish that actors never worked together.

The handoff did not contain the spike's exact popularity thresholds. This implementation uses **Hit films: 100,000+ votes**, **Popular films: 10,000+ votes**, and **All rated films: 1,000+ votes**. These filters apply within the included feature-film subset. Counts come from the data rather than illustrative design frames. Actor film counts in search reflect the active filter. Routes count distinct shortest actor chains, not combinations of films along the same chain.

To regenerate, place `name.basics.tsv.gz`, `title.basics.tsv.gz`, `title.principals.tsv.gz`, and `title.ratings.tsv.gz` in Downloads, or pass another directory:

```sh
npm run data:build
node scripts/build-data.mjs /path/to/datasets
```

Source datasets stay outside the repository. This project is intended for personal, noncommercial use. See [IMDb dataset information and terms](https://www.imdb.com/interfaces/).

## TMDB images

Create a TMDB account and request a developer API credential at https://www.themoviedb.org/settings/api. Use the **API Read Access Token**, stored locally in a gitignored `.env.local`:

```dotenv
TMDB_TOKEN=your_read_access_token
```

Then run:

```sh
npm run data:images
node scripts/enrich-images.mjs --limit=2000
```

The default prioritizes the featured examples and their co-stars, then the 500 actors with the most popular-film credits, plus at least 500 film posters. `--limit` expands this popular-actor and poster coverage. It resumes existing lookups, retries rate limits, and saves only public image paths to `public/data/images.json`. The token is never sent to the browser or committed. Missing images use initials/poster fallbacks. The official approved TMDB logo is included at `public/tmdb.svg`; the About dialog displays it together with TMDB's required attribution when image data is available. See https://developer.themoviedb.org/docs/faq.

## GitHub Pages

The base URL is `/shared-billing/`. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**. The deployment workflow tests and builds pushes to `main`, then deploys the `dist` artifact. No secrets are required for the app without images. The expected URL is https://brianbalzar.github.io/shared-billing/.

## Design

The supplied handoff is preserved under `reference/design_handoff_shared_billing/`. `src/tokens.css` contains the supplied tokens with the refined chosen-actor portrait treatment: a 96px face-biased image, 4px warm-ivory spacer, 3px coral border, and restrained hard shadow. Chosen actors retain full-opacity portraits during route selection. Bridges use sepia initials; hubs reveal a portrait only when explicitly selected. Search candidates and overflow rows use initials. Static design examples are references, not production search results. Graph positions come from a deterministic force simulation run to convergence, then stopped. Users can drag nodes to pin their positions and release all pins with Reset layout.

Modern browsers with Web Workers and DecompressionStream are required. The first visit downloads approximately 9 MB of compressed credits; later requests operate locally. The layout is designed for desktop; small-screen refinement is a future improvement.

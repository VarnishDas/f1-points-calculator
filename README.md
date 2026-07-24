# Formula 1 Points Calculator

A static React + TypeScript SPA for predicting the 2026 Formula 1 championship. Drag drivers into the finishing slots of upcoming races and instantly see the projected Drivers' and Constructors' standings, then share your scenario with a URL.

- **Live site:** https://f1-points-calculator.varnishdas.dev/
- **Stack:** Vite, React 19, TypeScript, Tailwind CSS 4, Zustand
- **Package manager:** pnpm

> Independent project, not affiliated with Formula 1.

## Features

- **Drag-and-drop predictions** — place drivers into Grand Prix and Sprint finishing positions for every upcoming race using @dnd-kit.
- **Live WDC/WCC standings** — projected driver and constructor standings recalculate on every change, including official results already on record.
- **Title-status indicators** — each driver is flagged as champion, in contention, or out of contention based on the best remaining outcome.
- **Shareable scenario URLs** — predictions are encoded into the URL hash; copying the link captures the full scenario.
- **Session persistence** — the URL hash stays in sync as you predict, so a page reload restores your scenario.
- **Mobile prediction board** — a dedicated per-race board for small screens alongside the desktop grid.

## Quickstart

Requires Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

## Scripts

| Command                | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `pnpm dev`             | Start the Vite dev server.                                         |
| `pnpm build`           | Type-check (`tsc -b`) and build the production bundle to `dist/`.  |
| `pnpm preview`         | Serve the production build locally.                                |
| `pnpm lint`            | Run ESLint over the repository.                                    |
| `pnpm test`            | Run the Vitest suite once.                                         |
| `pnpm data:update`     | Fetch the latest F1 data and rewrite `src/data/*.json`.            |
| `pnpm data:update:dry` | Same as above but writes nothing (`--dry-run`).                    |
| `pnpm data:validate`   | Validate committed `src/data/*.json` against Zod schemas offline.  |

See [docs/data-pipeline.md](docs/data-pipeline.md) for how the data refresh works.

## Project structure

```
├── .github/workflows/     # scheduled F1 data refresh
├── public/                # static assets (favicons, og image)
├── scripts/               # update-data.ts data pipeline
├── src/
│   ├── components/        # React UI (boards, standings panel, header)
│   ├── config/            # season constants (APP_SEASON, API base URL)
│   ├── constants/         # shared race constants
│   ├── data/              # generated JSON + typed re-exports
│   ├── engine/            # pure points/standings calculation
│   ├── hooks/             # useShareableUrl
│   ├── store/             # Zustand calculator store
│   ├── types/             # Driver/Team/Race/Standings types
│   └── utils/             # scenario encode/decode, session helpers
├── index.html
└── vite.config.ts
```

For a module-level walkthrough, see [docs/architecture.md](docs/architecture.md).

## Data attribution

Formula 1 data is provided by [Jolpica-F1](https://github.com/jolpica/jolpica-f1), using its Ergast-compatible API.

The data is licensed under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/).

This project transforms the source API data into local JSON files for use in the calculator.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup, code style, and PR expectations.

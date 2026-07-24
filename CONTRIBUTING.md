# Contributing

Thanks for helping improve the F1 Points Calculator. This guide covers the development setup, workflow, and what we expect from a pull request.

## Development setup

Requirements:

- Node.js 20 or newer (the data workflow runs on Node 26)
- pnpm v11 (the data workflow pins 11.9.0)

```bash
pnpm install
pnpm dev
```

The app is a fully static Vite SPA; there is no backend to run.

## Branch naming

Create a branch off `main` using one of these prefixes:

- `feature/<short-name>` — new functionality
- `fix/<short-name>` — bug fixes
- `docs/<short-name>` — documentation only
- `chore/<short-name>` — maintenance, dependencies, tooling

## Tests, lint, and build

Run all three before opening a pull request:

```bash
pnpm test     # Vitest, single run
pnpm lint     # ESLint
pnpm build    # tsc -b && vite build
```

Tests are written with Vitest and live in `__tests__/` directories colocated with the source (for example `src/engine/__tests__/calculateRacePoints.test.ts`). The data pipeline test sits next to the script at `scripts/update-data.test.ts`. Add or update tests whenever you change calculation or encoding logic.

## Code style

- 2-space indentation, double quotes for strings.
- TypeScript with strict compiler lint options enabled (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`). Do not add `any` or leave unused code behind.
- `verbatimModuleSyntax` is on: use `import type { ... }` for type-only imports.
- Keep the engine (`src/engine/`) and scenario utilities (`src/utils/`) free of React and side effects — they are pure functions with unit tests.
- UI styling uses Tailwind CSS 4 utility classes; there is no separate CSS framework.
- Run `pnpm lint` and fix findings rather than suppressing rules.

## Pull requests

- Keep PRs focused on one change; split unrelated work into separate PRs.
- Describe what changed and why, and note any user-facing behaviour changes.
- Make sure `pnpm test`, `pnpm lint`, and `pnpm build` all pass.
- Do not edit the generated files in `src/data/` by hand; change `scripts/update-data.ts` instead (see [docs/data-pipeline.md](docs/data-pipeline.md)).
- If you change something covered by [docs/architecture.md](docs/architecture.md), update the docs in the same PR.

# Data pipeline

How the app gets its Formula 1 data: a script fetches the current season from the Jolpica-F1 API, transforms it into local JSON, and a scheduled GitHub Actions workflow keeps it fresh.

## Source

All data comes from [Jolpica-F1](https://github.com/jolpica/jolpica-f1) via its Ergast-compatible API. The base URL is defined in `src/config/season.ts`:

```
https://api.jolpi.ca/ergast/f1
```

The season year is `APP_SEASON` in the same file (currently `2026`). Data licensing and attribution are covered in the [README](../README.md#data-attribution).

## The update script

`scripts/update-data.ts` (run with `tsx`) does the following:

1. **Fetch** — pulls the season calendar, drivers, constructors, and driver standings in parallel, then fetches Grand Prix results (and sprint results where applicable) round by round. Requests retry on HTTP 429/5xx with backoff, honouring `Retry-After`, and use short delays between calls to be polite to the API.
2. **Transform** — `transformSourceData` maps Ergast-style payloads into the app's `Driver`, `Team`, and `Race` shapes. IDs are normalized slugs; existing `sourceId` mappings keep IDs stable across refreshes, so manual edits to display names and team colors in the JSON are preserved. Races with a Grand Prix result become `status: "completed"`; everything else stays `upcoming`. Prediction fields are always generated as `null`.
3. **Validate** — the generated data is checked with Zod schemas plus referential and uniqueness rules (unique IDs and rounds, results referencing known drivers/teams, completed races having results, and so on). Invalid output aborts the run without touching the files.
4. **Write** — if the generated drivers/teams/races differ from the existing files, all four JSON files are rewritten under `src/data/`:
   - `drivers.json`, `teams.json`, `races.json` — app data
   - `metadata.json` — season, source URL, generation timestamp, and any warnings (for example when a previously known result had to be preserved because the source omitted it)

If nothing changed, the script reports it and leaves the files untouched.

### Flags

- `--dry-run` — fetch, transform, and validate everything, but write nothing. Prints a summary of what would change.

## Running it manually

```bash
pnpm data:update       # fetch and update src/data/*.json
pnpm data:update:dry   # same, but writes nothing (--dry-run)
```

The transformation and validation logic is unit-tested in `scripts/update-data.test.ts` (`pnpm test`).

## Scheduled refresh

`.github/workflows/update-f1-data.yml` automates the pipeline:

- **Schedule:** weekly on Mondays at 02:30 UTC (`cron: "30 2 * * 1"`), plus manual `workflow_dispatch` (manual runs are restricted to the repository owner).
- **Steps:** checkout → setup pnpm 11.9.0 and Node 26 → `pnpm install --frozen-lockfile` → `pnpm data:update` → `pnpm lint` → `pnpm test` → `pnpm build`.
- **Result:** if the data changed, `peter-evans/create-pull-request` opens a pull request from branch `data/update-f1-data` containing only the four JSON files under `src/data/`, titled "chore: update F1 data and calendar". Lint, tests, and the build must pass before the PR is created.

Because the app is fully static, merging that PR and redeploying is all it takes to ship fresh data.

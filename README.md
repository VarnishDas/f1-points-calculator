# Formula 1 Points Calculator

A static React + TypeScript SPA for predicting the 2026 Formula 1 championship standings. Drag drivers into upcoming race results, instantly recalculate driver and constructor points, and share scenarios via URL.

- **Live site:** https://f1-points-calculator.varnishdas.dev/
- **Stack:** Vite, React, TypeScript, Tailwind CSS, Zustand
- **Package manager:** pnpm

> Independent project, not affiliated with Formula 1.

## Getting started

```bash
pnpm install
pnpm dev
```

Build and test:

```bash
pnpm build      # outputs to dist/
pnpm test       # vitest
pnpm lint
```

## Data attribution

Formula 1 data is provided by [Jolpica-F1](https://github.com/jolpica/jolpica-f1), using its Ergast-compatible API.

The data is licensed under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/).

This project transforms the source API data into local JSON files for use in the calculator.

`src/data/active-drivers.json` is the curated prediction roster. It maps each
active API driver id to the team they should score for in future predictions.
Add a replacement there before running `pnpm data:update`; generated driver data
will still retain former or reserve drivers referenced by official results.

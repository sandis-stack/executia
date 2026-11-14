# TASK-35 — one corner language (rounded) — evidence

Base: `6502947` (live `origin/main`). Branch: `fix/website-rounded-20261114`. Local only (no vercel, no push).

## Home radius tokens (measured)

| Token | Value | Home samples |
|---|---|---|
| `--radius-card` | 12px | DESIGN_SYSTEM Radius; `.card`/`.panel` via `--radius` |
| `--radius-control` | 12px | `.menu-toggle`, `.input` |
| `--radius-pill` | 999px | `.pill-btn` |

Written into `assets/app.css` `:root`. `--radius` aliases `--radius-card`.

## Radius audit (acceptance #1)

Script: `evidence/website-rounded-20261114/tools/radius-audit.mjs`  
Exceptions: full-bleed chrome, hairline top/bottom/left/right rules, table cells.

| | 390 | 1440 | total |
|---|---|---|---|
| before-tight (6502947 CSS) | 11 | 13 | **24** |
| after | 0 | 0 | **0** |

Engine squares fixed: `.ej-procurement`, `.ej-decision` (PROCEED/HOLD/REJECT), `.ej-workspace`, `.ej-proof-panel`, `.ej-validation-frame` (table wrapper). Borders match home card language (`1px solid var(--line)`).

## Layout (acceptance #2)

Official `tools/audit.mjs` (same measure as TASK-29): `layout-after/audit-*.json`.

| Width | overflow pages | edge text | small taps |
|---|---|---|---|
| 390 | 0 | 0 | 0 |
| 768 | 0 | 0 | 0 |
| 320 | 0 | 2 (pre-existing `/entry/legacy` + `/docs`; engine 0 after narrow padding) | 0 |

HEAD `6502947` at 320 already had edge on those pages (+ engine). After: engine edge cleared; legacy/docs unchanged.

`npm test` **56/56** (53 + 3 radius-token tests). Architecture guard **14/14**. Deploy fakes **38/38**.

## Sheet (acceptance #3)

`BRIDGE/review/TASK-35-sheet.png` — /engine, home, /one, /proof at 390 and 1440, before | after.

## WEBSITE-DEPLOY.sh (acceptance #4)

- URL parser keeps last `*.vercel.app` URL; ignores trailing `Aliased https://executia.io` (TASK-29 prod stop).
- Fakes: **38/38** (includes new Aliased-line check).
- Header documents PR → preview → PO GO → merge-to-main release flow (no direct push).

## .vercelignore (acceptance #6)

```
evidence/
tools/
*.md
.env
.env.*
```

Local ship-set check (`tools/vercelignore-check.mjs`): `evidenceShipped=0`, `mdShipped=0`.

Evidence already public on live Git builds:

| Commit | evidence/ files |
|---|---|
| `072e272` (pre-TASK-29) | **119** |
| `6502947` (live) | **246** |

Files under `evidence/` at `6502947` that embed `/Users/sandis/...` paths (no secrets found): **6**

- `evidence/website-21b-20261111/tools/compare.mjs`
- `evidence/website-21b-20261111/tools/prototypes.mjs`
- `evidence/website-mobile-20261110/tools/audit.mjs`
- `evidence/website-mobile-20261110/tools/desk-diff.mjs`
- `evidence/website-mobile-20261110/tools/n1-pair.mjs`
- `evidence/website-mobile-20261110/tools/pairs.mjs`

`/evidence/...` 404 on a Vercel preview is **PO GO later** (scheduled cursor does not run vercel). Local ignore check is the proof available now.

## Release flow (acceptance #7)

`README_DEPLOY.md` updated: next release = PR to `main` (architecture-guard on PR) → preview from PR → PO GO → merge. Push to `main` = production.

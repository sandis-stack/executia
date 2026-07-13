# P0 Product Recovery Report

| Field | Value |
|---|---|
| **Mission** | IQ-P0-11D — Recover & Commit P0 Product |
| **Date** | 2026-07-13 |
| **Repository** | `executia` |
| **Branch** | `iq-p0-product-recovery` |
| **Commit** | `85d99c6ade735f1630411818d43cea17b4613c39` |

---

## Recovery summary

| Metric | Value |
|---|---|
| Files recovered | **53** |
| Source: `stash@{0}` | 8 files (`index.html`, `assets/app.js`, `package.json`, `vercel.json`, `request.html`, `one.html`, `pilot.html`, `EXECUTIA_UI_STANDARD.md`) |
| Source: working tree (untracked) | 39 files (P0 modules, CSS, tests, `index.legacy.html`) |
| Source: commit `5f1adca` (deps only) | 6 files (`platform-nav.js`, `platform-brand.js`, `docs.html`, `engine.html`, `support.html`, `pilot-approved.html`) |
| Stash dropped | **No** — `stash@{0}` retained |

---

## Implementation inventory

### Hero (IQ-P0-07)

| File | Source | Tracked |
|---|---|---|
| `index.html` (#hero) | stash | Yes |
| `assets/homepage-hero.js` | working tree | Yes |
| `assets/homepage-migrated.css` | working tree | Yes |

### Execution Value (IQ-P0-04)

| File | Source | Tracked |
|---|---|---|
| `index.html` (#execution-value) | stash | Yes |
| `assets/execution-value-engine.js` | working tree | Yes |
| `assets/execution-value-calculator.js` | working tree | Yes |
| `assets/execution-value-calculator.css` | working tree | Yes |

### Organization Assessment (IQ-P0-05)

| File | Source | Tracked |
|---|---|---|
| `index.html` (#organization-assessment) | stash | Yes |
| `assets/organization-assessment-engine.js` | working tree | Yes |
| `assets/organization-assessment.js` | working tree | Yes |
| `assets/organization-assessment.css` | working tree | Yes |

### Living Engine (IQ-P0-06)

| File | Source | Tracked |
|---|---|---|
| `index.html` (#living-engine) | stash | Yes |
| `assets/living-engine/` (10 modules) | working tree | Yes |
| `assets/living-engine-ui.js` | working tree | Yes |
| `assets/living-engine.css` | working tree | Yes |

### One Core (IQ-P0-08)

| File | Source | Tracked |
|---|---|---|
| `index.html` (#one-core) | stash | Yes |
| `assets/one-core/` (3 modules) | working tree | Yes |
| `assets/one-core-ui.js` | working tree | Yes |
| `assets/one-core.css` | working tree | Yes |

### Execution Economy (IQ-P0-09)

| File | Source | Tracked |
|---|---|---|
| `index.html` (#execution-economy) | stash | Yes |
| `assets/execution-economy/` (2 modules) | working tree | Yes |
| `assets/economy-ui.js` | working tree | Yes |
| `assets/economy.css` | working tree | Yes |

### Public Funnel (IQ-P0-05A)

| File | Source | Tracked |
|---|---|---|
| `assets/public-funnel.js` | working tree | Yes |
| `assets/public-funnel-bootstrap.js` | working tree | Yes |
| `assets/app.js` (funnel hooks) | stash | Yes |
| `request.html`, `one.html`, `pilot.html` | stash | Yes |

### Shared assets

| File | Source | Tracked |
|---|---|---|
| `assets/homepage-story-film.js` | working tree | Yes |
| `assets/platform-nav.js` | `5f1adca` | Yes |
| `assets/platform-brand.js` | `5f1adca` | Yes |
| `index.legacy.html` | working tree | Yes |
| `vercel.json` | stash | Yes |
| `package.json` | stash | Yes |

### Tests

| File | Source | Tracked |
|---|---|---|
| `tests/public-funnel.test.js` | working tree | Yes |
| `tests/execution-value-engine.test.js` | working tree | Yes |
| `tests/organization-assessment-engine.test.js` | working tree | Yes |
| `tests/living-engine.test.js` | working tree | Yes |
| `tests/one-core.test.js` | working tree | Yes |
| `tests/execution-economy.test.js` | working tree | Yes |

---

## Verification

| Check | Result | Evidence |
|---|---|---|
| Tests | **PASS** | `node --test tests/*.test.js` — 37/37 pass |
| Build | **N/A** | Static site; no build step |
| Asset references | **PASS** | All `index.html` `/assets/*` paths exist on disk |
| Routes (`vercel.json`) | **PASS** | `/entry`, `/pilot`, `/one`, `/request`, `/engine`, etc. mapped |
| Broken imports | **PASS** | Test suite imports all modules successfully |
| Pushed | **Yes** | `origin/iq-p0-product-recovery` |

---

## Remaining blockers

| # | Blocker | Impact | Recommendation |
|---|---|---|---|
| 1 | Not merged to `main` | Production still on legacy homepage @ `47c360e` | PO review PR → merge |
| 2 | `stash@{0}` still present | Duplicate recovery source | Drop stash after merge confirmed |
| 3 | ONE app funnel param ingestion | `executia-one` does not consume params | IQ-P1-05 |
| 4 | PO sign-off | Missions IQ-P0-05–09 IN REVIEW | PO accessibility + visual review on preview |

---

## Preview

`http://localhost:3040/index.html` — branch `iq-p0-product-recovery` @ `85d99c6`

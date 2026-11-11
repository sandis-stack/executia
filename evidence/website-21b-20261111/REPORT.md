# TASK-21b — old prototype pages: absolute asset URLs and tap targets

Branch `fix/website-21b-20261111`, stacked on TASK-21 (`fix/website-mobile-20261110` @ `5113154`) so both ship with TASK-20.
Fix commit `4cf2d61`. Not pushed, not deployed. Local route server only (`serve_vercel_routes.mjs`); production not checked.

| | Status | Evidence |
|---|---|---|
| LOCAL | PASS | routed URLs render; pixel diff 0 against the page as it rendered before; `npm test` 44/44; architecture guard OK, guard tests 14/14 |
| REMOTE | BLOCKED (no push by rule) | — |
| PRODUCTION | BLOCKED (deploy is PO-gated, with TASK-20) | — |
| OVERALL | ready for CTO review; one open question (T21b-Q1) | this report |

## 1. Absolute asset URLs

`vercel.json` rewrites `/life` → `/apps/life/index.html`, `/life-proof` → `/proofs/life-proof/index.html` and
`/invoice-proof` → `/proofs/invoice-proof/index.html`. The browser keeps the short URL, so `./styles.css` resolved to
`/styles.css` (or `/life/styles.css` with a trailing slash) and returned 404. The pages showed no styles and no script.

Changed, nothing else:

| File | Before | After |
|---|---|---|
| `apps/life/index.html` | `./styles.css`, `./app.js` | `/apps/life/styles.css`, `/apps/life/app.js` |
| `proofs/life-proof/index.html` | `./life-proof.css`, `./life-proof.js` | `/proofs/life-proof/life-proof.css`, `/proofs/life-proof/life-proof.js` |
| `proofs/invoice-proof/index.html` | `../life-proof/life-proof.css`, `./invoice-proof.css`, `./invoice-proof.js` | `/proofs/life-proof/life-proof.css`, `/proofs/invoice-proof/invoice-proof.css`, `/proofs/invoice-proof/invoice-proof.js` |

`app.js` imports `./lib/*.js`; those resolve against the script's own URL and load correctly. There are no other relative
paths in the HTML, CSS or scripts.

Result at 320, 390, 768 and 1440 px (`before/prototypes.json`, `after/prototypes.json`):

| URL | Before | After |
|---|---|---|
| `/life`, `/life/` | CSS 0, JS 0, 2 requests 404, no text | CSS 1, JS 55 scripts, no failures, no errors |
| `/life-proof`, `/life-proof/` | CSS 0, JS 0, 2 requests 404, bare text | CSS 1, JS 1, no failures, no errors |
| `/invoice-proof`, `/invoice-proof/` | CSS 0, JS 0, 3 requests 404, bare text | CSS 2, JS 1, no failures, no errors |
| file URLs (`/apps/life/index.html`, …) | render | render, unchanged |

**No visual change:** `compare/pixel-diff.json` compares each page after the fix, at its routed URL, its routed URL
with a trailing slash and its file URL, against the file URL before the fix. That is the only place the page rendered
before. All 36 comparisons have 0 different pixels except one: 1440 `/life-proof` had 3,770 pixels of text
anti-aliasing noise. `/life-proof/` and the file URL at 1440 were 0 in the same run, and two repeat captures of 1440
`/life-proof` were both 0. `compare/<width>/<page>.jpg` shows the routed URL before | after.

## 2. Prototype tap targets

Real tap areas are measured with `elementFromPoint`, stepping out from the centre of each control. A `::after` hit area
counts; any part above the screen edge or under another element does not.

| Control (`/life` prototype) | Box | Tap before | Tap after |
|---|---|---|---|
| Business, Personal, Back (`.life-btn`), all widths | 42 px tall | 42 | **44** |
| Header tabs Today / Needs decision / Executing / Complete, 768 and 1440 | 29 px tall, one row | 30 | **44** |
| Same tabs, 320 and 390 | 27 px tall, two rows in a 52 px bar | 25–28 | 25–28 (unchanged, see T21b-Q1) |

The fix (`apps/life/styles.css`): `.life-btn` and `.life-nav button` get `position: relative` and an empty `::after`
that is 44 px tall (or the control's height, if taller), centred on the control. It has no colour, border or size of
its own, so every pixel stays as it was; only the tap area grows. It only reaches up and down: about 1 px for the
buttons (button rows are 10 px apart) and 7.5 px for the tabs, which keeps them inside the 52 px bar. No two tap
areas overlap.

At 560 px and below the tabs wrap to two rows in the fixed 3.25rem bar, and the first row starts 2 px above the screen
edge. Two 44 px rows cannot fit there. A taller tap area would cover the neighbouring row: Complete's area would take
taps on the lower half of Executing. So the `::after` is off for the tabs at that width.

## Open question

- **T21b-Q1 (CTO/PO):** at 560 px and below, the `/life` prototype's header tabs keep a 25–28 px tap area, because a
  44 px one needs a taller bar (two rows of 44 px), which is a visible change. **Recommendation:** leave it until the
  PO decides whether `/life` redirects to the LIFE app (then there is nothing to fix). If it stays, let the bar grow to
  fit two 44 px rows on phones only, as a separate approved visual change.

## Tools

- `tools/prototypes.mjs <label> <base> [widths]`: captures the 3 pages × (routed, routed/, file URL) × widths, each in
  a fresh browser context. Fresh contexts matter because the prototype keeps its inbox in `localStorage` and grows it
  on every load.
- `tools/compare.mjs <beforeDir> <afterDir>`: produces the pixel diff and the pairs.

The before captures ran against the TASK-21 worktree at `5113154` (server :4331); the after captures against this
branch (server :4332). The full PNGs are in `scratch/website-21b-20261111/` and are not in the repo.

# TASK-21 — executia.io mobile layout fix

Branch `fix/website-mobile-20261110` from `fix/website-og-20261110` @ `9bf8da3`. No push, no deploy.
Commits: `f8a75a4` (How / Engine gutter, flow, comparison table — also carries the home-page tap-target rules, same media block),
`5601ace` (shared tap targets: header, footer, legal, calculator), evidence commit on top.

## N1 (CTO 2026-11-11 06:30): Engine card PDF button on one line

The label "DOWNLOAD SPECIFICATION PDF (EIM-1.0)" needs 326 px. The card leaves it 242 px at 320, 312 at 390 and 336 at 414, so it
wrapped at 413 px and below. The fix is CSS only, with no copy change, in `assets/institutional-readiness.css`:
- **≤ 413 px:** `white-space: nowrap`, tracking 0.08 → 0.02 em, side padding 17.6 → 12 px, icon gap 8 → 6.4 px.
- **≤ 367 px:** the same, plus 9 px text (was 10.9) and 10 px side padding.
- **414 px and wider:** unchanged.

| Width | Space | Button | Text lines | Height | scrollWidth |
|---|---|---|---|---|---|
| 320 | 242 | 240 | 1 (was 2) | 44 (was 50) | 320 |
| 360 | 282 | 240 | 1 (was 2) | 44 (was 50) | 360 |
| 375 | 297 | 290 | 1 (was 2) | 44 (was 50) | 375 |
| 390 | 312 | 290 | 1 (was 2) | 44 (was 50) | 390 |
| 414 | 336 | 326 | 1 | 44 | 414 |
| 430 | 352 | 326 | 1 | 44 | 430 |

Re-captured at 320 and 390. `compare/n1-engine-pdf-{320,390}.png` shows before | after for the card, and `compare/{320,390}/home.jpg`
the whole page. The home audit at 320 and 390 is unchanged: scrollWidth = width, gutter 14 px, edge text 0, taps under 44 px 0.
Desktop can't change, because both rules are below 414 px. `npm test` 44/44, `ARCHITECTURE_GUARD_OK`, guard tests 14/14.

## Result

On phones and tablets every page now keeps the header's side gutter, nothing scrolls sideways, no text touches the edge and every
control is at least 44 × 44 px to tap. Desktop (1440) is pixel-identical on all 26 pages; the only differing pixels are on two pages
that also differ between two captures of the unchanged code (live clock / animation).

The PO's phone screenshot, point by point:

| PO observation | Cause | Now |
|---|---|---|
| Text and boxes start at x = 0, no left gutter | `institutional-readiness.css:194` and `:201` give `.hp-how .wrap-home` and `.ea-section--emerge .wrap-home` `width: 100%` (max 52 rem), overriding the page wrap `--hp-wrap` (100 % − 28 px at ≤ 860). Below 832 px that is a 0 px gutter. | Both chapters use `--hp-wrap` at ≤ 860: 14 px gutter = header logo edge, at 320–768 |
| Flow boxes ~63 % wide, left-aligned | `institutional-readiness.css:325` `.hp-how-flow { max-width: 16rem }` with no auto margins | Flow fills the content width (`max-width: none`) |
| Divider centred, content left | `.hp-how-continue` is centred on the wrap, the flow was not | Flow, step connectors and continue line share one centre |
| ® in the wordmark | TASK-20 | Present at 390: `compare/wordmark-390.png` |

Also found in the audit and fixed:
- The comparison table (`.hp-compare-table { min-width: 520px }`, `:851`) scrolled inside its box on phones and hid the EXECUTIA column.
  At ≤ 860 it fits the width (min-width 0, cell padding 12/10 px).
- Tap targets under 44 px on every page (7–27 per page): header brand (21 px tall), menu button (40), footer links (16 px tall),
  legal back link, pill buttons, film controls (30), film CONTINUE link, text CTAs, journey labels, spec PDF button (38),
  contact buttons (42) and email link (20), calculator checkbox rows (36 at 768). Text links get 44 px of tap height with
  an equal negative margin, so they stay where they were.

## Changes (CSS only, all inside `@media (max-width: 860px)`)

| File | Change |
|---|---|
| `assets/institutional-readiness.css` | How + Engine wrap = `--hp-wrap`; flow `max-width: none`; table fits; home text links, film controls, spec PDF button 44 px |
| `assets/app.css` | Header brand, menu button, pill buttons, footer links, legal back link 44 px |
| `assets/legal.css` | Contact buttons 44 px; email link 44 px tap height, same position |
| `assets/execution-value-calculator.css` | Checkbox rows 44 px |
| `index.html` | Cache key `institutional-readiness.css?v=mobile-20261110` |

No copy, no new elements, no JS changes. Desktop rules untouched (every new rule is under the 860 px query).

## Proof

Method: `tools/audit.mjs` (Playwright, Chrome, `isMobile` + touch below 900 px, reduced motion, full scroll first so reveal
sections render) against two local servers with the Vercel routes (`evidence/website-og-20261110/tools/serve_vercel_routes.mjs`):
before = `git archive 9bf8da3` on :4330, after = this worktree on :4331. Per page it records `scrollWidth`, header gutter
(outermost header item), body text gutter (closest body text, header and footer excluded), text within 8 px of an edge,
controls under 44 × 44 px (inline links inside running text exempt, WCAG 2.5.8) and elements outside the viewport.

Files:
- `before/audit-<w>.json`, `after/audit-<w>.json` — all 26 pages at 390 and 768; home at 320, 360, 375, 414, 430.
- `compare/390/*.jpg`, `compare/768/*.jpg` — before | after, every page, full height. Home also at 320–430.
- `compare/how-it-works-{320,390,768}.png` — the How section before | after.
- `desk-diff-before-r1-after.json`, `desk-diff-before-r1-before-repeat.json`, `desk-diff-before-after.json` — desktop 1440 pixel diffs.
- Full-size PNGs (≈ 60 MB) stay outside the repo in `EXECUTIA/scratch/website-mobile-20261110/evidence-full/`.

### Home at every width

| Width | scrollWidth before → after | Body text left gutter before → after | Edge text | Taps < 44 px |
|---|---|---|---|---|
| 320 | 320 → 320 | 0 → 14 | 12 → 0 | 19 → 0 |
| 360 | 360 → 360 | 0 → 14 | 10 → 0 | 19 → 0 |
| 375 | 375 → 375 | 0 → 14 | 10 → 0 | 19 → 0 |
| 390 | 390 → 390 | 0 → 14 | 9 → 0 | 20 → 0 |
| 414 | 414 → 414 | 0 → 14 | 9 → 0 | 20 → 0 |
| 430 | 430 → 430 | 0 → 14 | 8 → 0 | 20 → 0 |
| 768 | 768 → 768 | 0 → 14 | 4 → 0 | 27 → 0 |

Header logo edge is 14 px at every width.

### Every page at 390 (768 in `after/audit-768.json`: same picture — 0 edge text and 0 small targets except the `/apps/life` prototype, 7 unchanged)

| Page | scrollWidth | Header gutter L/R | Body text gutter L/R before → after | Edge text | Taps < 44 px |
|---|---|---|---|---|---|
| `/` | 390 | 14/24 | 0/9 → 14/17 | 9 → 0 | 20 → 0 |
| `/entry/legacy` | 390 | 14/24 | 14/11 → 14/11 | 0 | 10 → 0 |
| `/engine` | 390 | 14/24 | 14/23 | 0 | 9 → 0 |
| `/docs` | 390 | 14/24 | 14/30 | 0 | 8 → 0 |
| `/pilot` | 390 | 14/24 | 14/20 | 0 | 9 → 0 |
| `/pilot/approved` | 390 | 14/24 | 19/19 | 0 | 9 → 0 |
| `/one` | 390 | 14/24 | 14/29 | 0 | 9 → 0 |
| `/proof` | 390 | 14/24 | 14/32 | 0 | 9 → 0 |
| `/support` | 390 | 14/24 | 14/23 | 0 | 10 → 0 |
| `/request` | 390 | 14/24 | 14/36 | 0 | 9 → 0 |
| `/contact` | 390 | 14/14 | 14/59 | 0 | 10 → 0 |
| `/privacy` | 390 | 14/14 | 14/14 | 0 | 7 → 0 |
| `/terms` | 390 | 14/14 | 14/15 | 0 | 7 → 0 |
| `/cookies` | 390 | 14/14 | 14/15 | 0 | 7 → 0 |
| `/gdpr` | 390 | 14/14 | 14/15 | 0 | 7 → 0 |
| `/apps/life/index.html` ¹ | 390 | 110/16 | 16/16 | 0 | 7 → 7 |
| `/proofs/life-proof/index.html` ¹ | 390 | – | 20/20 | 0 | 0 |
| `/proofs/invoice-proof/index.html` ¹ | 390 | – | 20/25 | 0 | 0 |
| `/standard` | 390 | 14/24 | 14/31 | 0 | 8 → 0 |
| `/definition` | 390 | 14/24 | 14/19 | 0 | 10 → 0 |
| `/global` | 390 | 14/24 | 14/19 | 0 | 12 → 0 |
| `/institutional` | 390 | 14/24 | 14/21 | 0 | 12 → 0 |
| `/analysis.html` | 390 | 14/24 | 14/14 | 0 | 15 → 0 |
| `/execution.html` | 390 | 14/24 | 14/31 | 0 | 12 → 0 |
| `/pilot-mode.html` | 390 | 14/24 | 14/33 | 0 | 10 → 0 |
| `/proposal.html` | 390 | 14/24 | 14/37 | 0 | 11 → 0 |

`scrollWidth == innerWidth` on all 26 pages at 390 and 768, and on home at 320–430, before and after.
The only elements past the viewport are clipped decorative layers (`hp-monitor-glow`; at 768 also the film camera layers), unchanged.
Body text right gutter is larger than 14 where lines are ragged; `/entry/legacy` has text 11 px from the right edge, unchanged
(above the 8 px edge threshold, outside the How / Engine fix).
Header right gutter 24 px on the main pages is the menu button's position, unchanged.

¹ Routed as `/life`, `/life-proof`, `/invoice-proof`. Those URLs render a blank page before and after this change — see Findings.
They are measured at their file URL, where their relative asset links resolve. They have their own CSS, not the shared CSS.

### Desktop 1440 (must stay pixel-identical)

| Diff | Pages identical | Pages with differing pixels |
|---|---|---|
| before (first capture, 9bf8da3) vs after | 21 of 23 pages (`desk-diff-before-r1-after.json`) + the 3 file-URL pages (`desk-diff-before-after.json`) = 24 of 26 | `analysis.html` 15,802 px in 0,24–1439,5802; `entry/legacy` 594 px in 589,991–682,1000 |
| before vs before-repeat (same unchanged code, captured twice) | home | `analysis.html` 16,481 px, same box; `entry/legacy` 666 px, same box |

So the two differing pages are capture noise, not this change: `analysis.html` runs a live clock, random IDs and timers
(`setInterval`, `new Date()`, `Math.random()`), and the `/entry/legacy` strip (≈ 95 × 10 px) varies the same way on unchanged code.
`desk-diff-before-after.json` is the last capture pass: there the new "before" home capture differs (63,890 px) from both the
first before capture and the before-repeat, while after = first before = before-repeat for home (0 px). That before
capture ran next to a second browser and is the outlier; the code under it is unchanged.

### Tests

- Website `npm test`: 44 / 44 pass.
- Architecture guard as in CI (`.github/workflows/architecture-guard.yml`): files changed vs `origin/main` (63, includes TASK-20) →
  `ARCHITECTURE_GUARD_OK`; `node --test scripts/architecture-guard.test.mjs` 14 / 14 pass.

## For the PO — what looks different on a phone

- Home "How it works" and "Engine": text and boxes start at the same left edge as the logo; the five flow boxes span the full
  width, the connectors and the line below them are centred on the boxes.
- Comparison table: all three columns visible without sliding the table; cells slightly tighter.
- Footer links sit in 44 px rows, so the footer is a little taller. Menu button 44 px (was 40). Watch film and film control
  buttons are larger (44 px). Contact page buttons 2 px taller.
- Nothing changes on desktop.

## Findings outside this task (not changed)

1. `/life`, `/life-proof` and `/invoice-proof` are blank. Their HTML loads `./styles.css` / `./app.js` (relative), which resolve
   against the URL (`/styles.css`, or `/life/styles.css` with a slash), not the file folder (`/apps/life/`). Same before and after;
   local route server only, production not checked. Recommendation: separate task — absolute asset URLs in those three files, or a
   PO decision to retire / redirect the old `/life` prototype to the LIFE app.
2. The `/apps/life` prototype's own header tabs (27 px) and buttons (42 px) are under 44 px and its tabs wrap above the top edge
   at 390. Its own CSS, not shared; left as is pending finding 1.

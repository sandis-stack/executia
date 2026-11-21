# BACKLOG-586 / #591 innerHTML audit (assets/*.js)

Canonical copy lives in-repo at `docs/security/innerhtml-audit.md` (portable; tests must not read BRIDGE paths).

Scope: URL params, sessionStorage, or form-derived strings must not flow into `innerHTML` unescaped. Prefer `textContent` / DOM nodes; static chrome may stay as HTML templates.

## Fixed this slice
| File | Sink | Resolution |
|------|------|------------|
| `pilot-ui.js` | `renderJourney` / `renderDeliverables` interpolated `organization`, `executionDomain`, gap/plan free-text into `innerHTML` | **fixed** — `createElement` + `textContent` only (no `innerHTML` left in file) |
| `public-funnel.js` / `public-funnel-bootstrap.js` | summary + ONE banner (from #585) | **fixed** (prior) — text nodes; empty `innerHTML = ''` clear only |

## Named sweep (CTO S1 list)
| File | Sink | Classification | Reason |
|------|------|----------------|--------|
| `organization-assessment.js` | gate chrome, QUALIFICATION_FOCUS `<li>`, slider row labels | **static-only** | Constants / app copy. Org name in flow uses `textContent` already (`renderFlow`). |
| `executive-journey.js` | `mount.innerHTML = html` / hero scenario | **static-only** | Authoring-time `SCENARIO` constants; values passed through `escapeHtml`. Not session/form/URL. |
| `living-engine-ui.js` | mission/decision `flowRoot.innerHTML` | **fixed** (escape) | User mission text enters via `escapeHtml` before HTML assemble; lifecycle chrome is static labels. |
| `homepage-hero.js` | journey meta/detail via `innerHTML` | **fixed** (escape) | Funnel-derived detail/labels go through `escapeHtml`; step hrefs are app anchors (`#…`, `/engine`). Ready banner is static copy. |

## Other assets/*.js (same sweep)
| File | Classification | Reason |
|------|----------------|--------|
| `economy-ui.js` | **fixed** (escape) / **static-only** | Stage labels static; detail value text `escapeHtml`'d. |
| `one-core-ui.js` | **fixed** (escape) | Session mission / priorityAreas / node fields use `escapeHtml` before `innerHTML`. |
| `execution-value-calculator.js` | **static-only** | `formulas.innerHTML` uses engine formula strings (numbers/templates), not free-text form fields; currency options built with `createElement` + `textContent` after clear. |
| `homepage-story-film.js` | **static-only** | Film frame copy (authored HTML snippets); not URL/session/form. `crossfadeText` may set `innerHTML` when frame text contains `<` — film script only. |
| `homepage-how-it-works.js`, `pilot-film-slot.js`, `entry-*.js`, `app.js`, `platform-*.js`, `small-business-loss.js`, `calculator-currency.js`, `organization-assessment-engine.js`, `execution-value-engine.js` | **static-only** / none | No session/form/URL → `innerHTML` sinks found in this pass. |

## S2 proof
- Test: `tests/b586-security.test.js` — organization = `<img src=x onerror=window.__x=1>` in session ctx → journey + deliverable text nodes contain the literal string; `globalThis.__x` stays undefined.
- Live check after deploy remains **PO** (hard STOP).

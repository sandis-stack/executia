# EXECUTIA MASTER PLAN

Version: **3.0**  
Status: **Highest Operational Authority**  
Owner: Product Owner  
Location: `/governance/EXECUTIA_MASTER_PLAN.md`  
Repository: `executia` (`https://github.com/sandis-stack/executia`)  
Audit baseline: CTO audit MISSION-PLAN-003 — all findings resolved in this version  
Evidence date: **2026-07-12**

This document **IS** the highest operational authority for all EXECUTIA development.  
Nothing may be implemented before this plan, its registries, and build order are satisfied.  
Only the Product Owner approves completion, deployment, and PASS/FAIL.

---

# DOCUMENT PRECEDENCE

Only one authority wins per decision. If two documents conflict, **higher rank always wins**.

| Rank | Document | Canonical location | Notes |
|---|---|---|---|
| **1** | **EXECUTIA_MASTER_PLAN.md** | `executia/governance/EXECUTIA_MASTER_PLAN.md` | This document — operational authority |
| **2** | **EXECUTIA_CONSTITUTION.md** | Target: `executia/governance/EXECUTIA_CONSTITUTION.md` · Interim: `executia-one/governance/EXECUTIA_CONSTITUTION.md` | Product principles, locked components, narrative — subordinate to Master Plan for build order and registry |
| **3** | **PRODUCT_DEFINITIONS/** | Target: `executia/governance/PRODUCT_DEFINITIONS/` · Interim: `executia-one/docs/foundation/36-EXECUTIA-PRODUCT-DEFINITION.md`, `37-HOMEPAGE-STRATEGY.md` | Category definition — migrate into `executia` governance |
| **4** | **EXECUTIA_UI_STANDARD.md** | `executia/EXECUTIA_UI_STANDARD.md` | **Deprecated for homepage hero and structure** — superseded by this plan § Homepage Strategy |
| **5** | **EXECUTIA_DESIGN_SYSTEM.md** | `executia/DESIGN_SYSTEM.md` · Reference: `executia-one/governance/EXECUTIA_DESIGN_SYSTEM_v1.0.md` | Visual tokens — subordinate to Master Plan homepage structure |
| **6** | **Technical Documentation** | Per-repository `docs/`, ADRs, README | Implementation detail only |

**Conflict resolutions (evidence-based):**

| Conflict | Resolution |
|---|---|
| Master Plan vs Constitution on homepage structure | Master Plan § Homepage Strategy wins; Constitution narrative (visibility realization) **must** be preserved in hero copy |
| Master Plan vs EXECUTIA_UI_STANDARD locked hero | UI Standard hero lock **revoked** for homepage; Master Plan P0 replace stands |
| Master Plan vs PRODUCT-010 (90-second / 8 sections) | Master Plan 9-section structure wins; PRODUCT-010 FAQ section **not** required; 90-second test retained as extended comprehension gate |
| Master Plan vs REPOSITORY-INVENTORY local paths | Canonical local path for `executia` **is** `/Users/sandis/Documents/executia-repo` |
| Multiple governance roots | `executia-one/GOVERNANCE.md` is process-only; subordinate to ranks 1–2 |

---

# 0. PRODUCT REGISTRY

| Product | Purpose | Repository | Production URL | Development URL | Owner | Current Stage | Authority Document | Status |
|---|---|---|---|---|---|---|---|---|
| **ENTRY** | Category creation — teach Execution Platform | `executia` | `https://executia.io`, `https://executia.io/entry` | Local: `executia-repo/index.html` | Product Owner | **Production** (legacy content) | This plan § Homepage Strategy | Live — replace per P0 |
| **ENGINE** | Interactive proof — governed execution | `executia-layer` (runtime) · `executia` (public funnel) | `https://execution.executia.io` · `https://executia.io/engine` | Local: `executia-layer/public/dashboard/` · `executia-repo/engine.html` | CTO | **Production** (layer stale) / **Production** (static funnel) | This plan § ENGINE Strategy | Runtime drift — 65 commits unpushed |
| **ONE** | Daily execution operating environment | `executia-one` | `https://one.executia.io` | Local: `executia-one/apps/web` | CTO | **Internal** | `PRODUCT_DEFINITIONS` (interim: doc 36) | Auth exists; E2E unverified |
| **PILOT** | Validate organization before adoption | `executia` (intake) · `executia-one` (operation) | `https://executia.io/pilot`, `https://executia.io/request` | Local: `executia-repo/pilot.html`, `request.html` | Product Owner | **Prototype** | This plan § PILOT Strategy | Email intake only |
| **STANDARD** | Global execution framework | `executia` (public docs) · `executia-layer` (records API) | `https://executia.io/standard`, `/definition` | Local: `executia-repo/standard.html` | Product Owner | **Production** (static docs) | Constitution + doc 36 | Docs only — not interactive |
| **ECONOMY** | Measurable execution value / capital | `executia-one` | — (not public) | `packages/execution-engine/src/workflows/ExecutionValueAggregator.ts` | Product Owner | **Architecture** | This plan § Capability Map | Engine class only |
| **GRAPH** | Living execution network | `executia-one` | — (ONE internal) | `packages/execution-engine/src/graph/` | CTO | **Development** | Doc 16 (interim) | Hidden route `/dashboard/graph` |
| **AI** | Prediction, learning, autonomy | `executia-one` | — (ONE internal) | `packages/execution-engine/src/brain/`, `autonomy/`, `digital-twin/` | CTO | **Development** | Doc 30 (interim) | Brain route hidden — wrong pattern |
| **ASSESSMENT** | Organization execution maturity | `executia` (target public) · `executia-layer` (partial) | Target: `executia.io` §8 · Layer: `/governance-assessment` | Local: `executia-layer/public/governance-assessment/index.html` | Product Owner | **Partial** (layer UI only) | This plan § PILOT + P0 | Not on ENTRY; not integrated |

**Git evidence (2026-07-12):**

| Repository | Branch | HEAD | Ahead of `origin/main` |
|---|---|---|---|
| `executia` | `main` | `5f1adca` | **3** (not verified as production deploy) |
| `executia-one` | `mission-001-executia-constitution` | `4ca1d16` | **2** |
| `executia-layer` | `main` | `c2dc746` | **65** |

**Automated test evidence:** `executia-one` → `pnpm test` → **235 passed** (2026-07-12).

---

# 1. COMPONENT REGISTRY

| Component | Repository | Path | Purpose | Status | Authority | Duplicate | Action |
|---|---|---|---|---|---|---|---|
| **Homepage** | `executia` | `index.html` | Public ENTRY | Production — legacy | **This plan** | `executia-one/.../entry/page.tsx` | **Replace** |
| **Homepage (Next.js)** | `executia-one` | `apps/web/app/(public)/entry/page.tsx` | Dev ENTRY | Development — unported | Reference only | **Yes** | **Delete** after P0 port |
| **Hero** | `executia` | `index.html` `.hero` | Legacy split headline | Production — legacy | **This plan** (supersedes UI Standard) | `HomepageHeroH1.tsx` | **Replace** |
| **Hero (approved dev)** | `executia-one` | `apps/web/components/homepage/HomepageHeroH1.tsx` | Deep Ocean + monitor host | Development | Spec reference | **Yes** | **Rebuild** in `executia` static |
| **Header** | `executia` | `assets/platform-nav.js` | Public platform nav | Production | **This plan** + Design System | `PlatformHeader.tsx` | **Replace** nav per plan |
| **Header (Next.js)** | `executia-one` | `apps/web/components/platform/PlatformHeader.tsx` | ONE/public header | Development | Reference | **Yes** | **Merge** spec → `executia` |
| **Header variant** | `executia-one` | `apps/web/components/platform/PlatformHeaderVariant.tsx` | Alt header | Development | — | **Yes** | **Delete** |
| **Footer** | `executia` | `assets/platform-brand.js` | Unified footer | Production | **This plan** | `EntryFooter.tsx` | **Keep** / align on port |
| **Footer (Next.js)** | `executia-one` | `apps/web/components/homepage/EntryFooter.tsx` | ENTRY footer | Development | Reference | **Yes** | **Rebuild** in `executia` |
| **Story Film** | `executia-one` | `apps/web/components/story-film/` | Narrative sections | Development — unported | Constitution narrative | None in `executia` | **Rebuild** in `executia` |
| **Execution Leak Monitor** | `executia-one` | `apps/web/components/homepage/ExecutionLeakMonitor.tsx` | Visibility demo | Development — unported | Constitution §4 | None in `executia` | **Rebuild** in `executia` |
| **Execution Calculator** | — | — | Homepage §3 | **Missing** | **This plan** | None | **Build** P0 on `executia` |
| **Execution Engine (public demo)** | `executia` | `engine.html`, `app.js` | 6-state demo | Production — partial | **This plan** | Embedded demo in `index.html` | **Merge** → Living Engine |
| **Execution Engine (runtime)** | `executia-layer` | `public/dashboard/`, `api/v1/*` | Governed execution | Production — stale deploy | **This plan** § ENGINE | `executia` demo | **Keep** runtime; sync deploy |
| **Execution Engine (Next.js)** | `executia-one` | `apps/web/app/(public)/engine/page.tsx` | Lifecycle demo | Development | — | **Yes** | **Delete** |
| **Execution Graph** | `executia-one` | `packages/execution-engine/src/graph/` | Graph engine | Development | **This plan** | `executia-layer/public/graph/` | **Keep** ONE; retire layer UI |
| **Assessment (public target)** | — | — | Homepage §8 + PILOT | **Missing** on `executia` | **This plan** | Layer assessment | **Build** + **Merge** layer learnings |
| **Assessment (layer partial)** | `executia-layer` | `public/governance-assessment/index.html` | Org assessment UI | Partial — experimental | Reference only | **Yes** | **Merge** or **Delete** after P0 |
| **Execution Score** | — | — | PILOT deliverable | **Missing** product | **This plan** | `executia-layer/public/scoreboard/` | **Build** canonical; **Delete** layer duplicate |
| **Scoreboard (layer)** | `executia-layer` | `public/scoreboard/`, `api/v1/scoreboard/` | Metrics UI/API | Partial — experimental | — | **Yes** | **Delete** after ONE canonical score |
| **Pilot intake** | `executia` | `request.html`, `api/request.js` | Email intake | Production | **This plan** | Layer `pilot-intake` API | **Keep**; **Delete** layer duplicate path |
| **Pilot pages** | `executia` | `pilot.html`, `pilot-approved.html` | Public pilot info | Production | **This plan** | `executia-one/pilot/` | **Keep**; **Delete** ONE public pilot |
| **ONE Dashboard** | `executia-one` | `apps/web/app/(dashboard)/page.tsx` | Today's Brief | Internal | **This plan** | — | **Keep** |
| **Knowledge Graph** | `executia-one` | `packages/execution-engine/src/knowledge/` | Knowledge from truth | Internal — engine package | **This plan** | Layer `api/v1/knowledge-graph/` | **Keep** ONE; layer = adapter only |
| **Certification (layer partial)** | `executia-layer` | `public/certification/`, `public/certifications/` | Cert UI | Partial — experimental | — | Future P2 product | **Delete** or **Merge** at P2 |
| **ENTRY preview routes (×14)** | `executia-one` | `apps/web/app/(public)/entry/*/` | QA previews | Development | — | **Yes** | **Delete** |
| **Public pages (executia)** | `executia` | `global.html`, `institutional.html`, `contact.html`, `support.html`, `docs.html`, `one.html`, `standard.html`, `definition.html` | Supporting public surfaces | Production | Product registry | Some duplicated in ONE | **Keep** unless orphan |
| **Public pages (ONE duplicate)** | `executia-one` | `institutional/`, `docs/`, `support/` | Public duplicates | Development | — | **Yes** | **Delete** |
| **Constitution** | `executia-one` | `governance/EXECUTIA_CONSTITUTION.md` | Product principles | Active — wrong repo | Rank 2 | — | **Merge** → `executia/governance/` |
| **Design System v1 (ONE)** | `executia-one` | `governance/EXECUTIA_DESIGN_SYSTEM_v1.0.md` | Visual spec | Reference | Rank 5 | `DESIGN_SYSTEM.md` | **Merge** |
| **Layer experimental pages (162)** | `executia-layer` | `public/**/index.html` (162 files) | Historical/experimental | Legacy | — | Internal duplication | **Delete** orphans per audit |
| **Archive clone** | `executia-updated` | — | Duplicate of `executia` | Archive | — | **Yes** | **Delete** local clone |

**Preview route evidence:** 15 `page.tsx` files under `executia-one/apps/web/app/(public)/entry/` — **1** production route + **14** preview/QA routes.

**Public HTML evidence:** **13** `.html` files at `executia-repo` root (verified 2026-07-12).

---

# 2. REPOSITORY OWNERSHIP

Every repository has exactly one responsibility. Violations **must not** ship.

## `executia`

| Field | Value |
|---|---|
| **Purpose** | Public website — ENTRY, STANDARD docs, pilot intake, public ENGINE funnel |
| **Owner** | Product Owner |
| **Production URL** | `https://executia.io` |
| **Allowed** | Static HTML/CSS/JS; `assets/`; thin serverless (`api/request.js`); governance docs; brand tokens; SEO files (`sitemap.xml`, `robots.txt`, `llms.txt`) |
| **Forbidden** | ONE authenticated UI; Next.js app; PostgreSQL; OCR; accounting; Truth/Knowledge/Reality persistence; duplicate ENGINE runtime logic |
| **Never** | ONE dashboard, auth sessions, receipt processing, execution engine domain code |

## `executia-one`

| Field | Value |
|---|---|
| **Purpose** | Authenticated product — ONE workspace, engine packages, pilot operation |
| **Owner** | CTO |
| **Production URL** | `https://one.executia.io` |
| **Allowed** | Next.js app; `@executia/execution-engine`; auth; Prisma; ONE modules; internal APIs |
| **Forbidden** | Public homepage (`/entry`); public hero; marketing homepage; production ENTRY deploy artifact |
| **Never** | Canonical public homepage, `/entry` route as production ENTRY |

## `executia-layer`

| Field | Value |
|---|---|
| **Purpose** | Execution Engine — governed execution runtime, registry, server APIs |
| **Owner** | CTO |
| **Production URL** | `https://execution.executia.io` |
| **Allowed** | `api/v1/*`; execution dashboard; demonstration runtime; build metadata |
| **Forbidden** | Marketing homepage; ENTRY hero; ONE workspace UI; new public orphan HTML pages |
| **Never** | Public marketing pages, duplicate pilot intake competing with `executia.io/request` |

## Archive / non-canonical (do not develop)

| Path | Action |
|---|---|
| `/Users/sandis/Documents/executia-updated` | **Delete** — duplicate remote of `executia` |
| `/Users/sandis/Documents/executia-system` | **Retired** — superseded by `executia-repo` |
| `/Users/sandis/Documents/executia-deploy` | Not a git repo — not canonical |
| `/Users/sandis/Documents/executia-layer-main` | Not a git repo — not canonical |

**Future repositories:** Any new repo requires a row in this section and Product Owner approval before code is written.

---

# 3. SINGLE SOURCE OF TRUTH

There must never be two authorities for the same surface.

| Domain | Single authority | Duplicate(s) | Action |
|---|---|---|---|
| **Homepage** | `executia/index.html` | `executia-one/entry/page.tsx`, 14 preview routes | **Replace** → **Delete** |
| **Hero** | `executia` (after P0) | Legacy `index.html` hero; `HomepageHeroH1.tsx`; UI Standard lock | **Replace** → **Delete** dev copies |
| **Header** | `executia/assets/platform-nav.js` (after P0) | `PlatformHeader.tsx`, `PlatformHeaderVariant.tsx` | **Replace** → **Delete** variant |
| **Story flow** | `executia` (after P0 rebuild) | `story-film/` in ONE | **Rebuild** → **Delete** ONE public |
| **Design system (public)** | `executia/DESIGN_SYSTEM.md` | `EXECUTIA_UI_STANDARD.md` (hero revoked); ONE design system v1 | **Keep** → **Merge** |
| **Product definition** | `governance/PRODUCT_DEFINITIONS/` (target) | `executia-one/docs/foundation/36-*`, `37-*` | **Merge** into `executia` |
| **ENGINE runtime** | `executia-layer` | `executia/engine.html` demo; ONE `/engine` | **Keep** layer → funnel only on `executia` → **Delete** ONE `/engine` |
| **Pilot intake** | `executia/request.html` + `api/request.js` | `executia-layer/api/v1/pilot-intake.js`; ONE `/pilot` | **Keep** → **Delete** duplicates |
| **ONE product** | `executia-one` | `executia/one.html` (static funnel only — allowed) | **Keep** both — funnel vs product |
| **Knowledge Graph engine** | `executia-one` packages | Layer `api/v1/knowledge-graph/` | **Keep** ONE → layer adapter only |
| **Assessment** | `executia` (P0 target) | Layer `governance-assessment/` | **Build** canonical → **Delete** layer |
| **Execution Score** | `executia-one` (P1 target) | Layer `scoreboard/` | **Build** canonical → **Delete** layer |
| **Operational governance** | `executia-one` `packages/execution-engine/src/governance/` | Layer approval/evidence APIs | **Keep** ONE engine → layer runtime APIs only |

---

# 4. VISION & NORTH STAR

## EXECUTIA

**The Global Execution Standard**

## Mission

Create the global infrastructure for execution.

## Vision

Every organization should be able to see, predict, execute, validate, learn and continuously improve every decision and every action.

## Constitution narrative (mandatory in hero copy)

Organizations do not fail because people stop working. Organizations fail because execution becomes invisible.

The homepage **must** create this realization:

> We do not have an execution problem. We have an execution visibility problem.

## North Star

Every feature **must** strengthen at least one of:

- **Execution Standard**
- **Execution Economy**
- **Execution Intelligence**
- **Enterprise Value**

If it strengthens none, **do not build it**.

---

# 5. HOMEPAGE STRATEGY

## 30-second outcome (one sentence)

**EXECUTIA is the Execution Platform — the global infrastructure that makes invisible execution visible and transforms governed execution into measurable enterprise value.**

## Extended gate (90 seconds)

Visitor **must** also answer (per Product Definition doc 36 / interim PRODUCT-010):

1. What problem exists? → execution breaks down; visibility is missing  
2. Why can't current software solve it? → ERP/CRM/workflow record; they do not govern  
3. What is EXECUTIA? → **Execution Platform**  
4. Why is it different? → governs execution before failures become outcomes  
5. What should I do next? → **Try the Engine** (primary CTA)

## Homepage order (only these sections)

1. **Hero** — visibility realization + Execution Leak Monitor  
2. **Problem**  
3. **Execution Value Calculator**  
4. **Living Engine** — primary CTA: Try the Engine  
5. **One Core**  
6. **Execution Economy**  
7. **Execution Standard**  
8. **Organization Assessment**  
9. **Pilot**

**No other sections.**

## Authority & current gap

| Field | Value |
|---|---|
| **Authority** | `executia/index.html` only |
| **Current production** | 7 `<section>` blocks + legacy hero + three-card hub + embedded engine demo |
| **Evidence** | `executia-repo/index.html` — sections: `.hero`, `#why`, system flow, comparison, `#live-execution`, use cases, `final-cta` |
| **Action** | **Replace** entire homepage per P0 |

## Supersession

`EXECUTIA_UI_STANDARD.md` locked hero (*"Execution is already happening. Control is missing."*) is **revoked** for homepage by this plan rank 1.

---

# 6. ENGINE STRATEGY

## Purpose

Interactive proof. User enters a mission.

## ENGINE demonstrates

Mission · Planning · Execution · Validation · Evidence · Prediction · Learning · Execution Value · Assessment

## Existing (evidence)

| Item | Location | State |
|---|---|---|
| 6-state demo | `executia/engine.html`, `app.js`, embedded in `index.html` | Production — success path only |
| Runtime dashboard | `executia-layer/public/dashboard/` | Production — deploy stale (65 ahead) |
| Mission API | `executia-layer/api/v1/mission.js` | Exists |
| Lifecycle demo | `executia-one/apps/web/app/(public)/engine/page.tsx` | Development — **Delete** |
| Governance engine | `executia-one/packages/execution-engine/src/governance/` | Internal |
| Evidence surfaces | `executia-layer/public/execution-evidence/` | Experimental |
| Prediction API | `executia-layer/api/v1/predict/` | Experimental |
| Standards API | `executia-layer/api/v1/standards.js` | Exists |

## Missing

Live mission generation (public) · scenario simulation · blocked-execution demo · Execution Value on public surface · Assessment integration · unified public ENGINE page · **production deploy of latest `executia-layer`**

## Blocked

`executia-layer` local **65** commits unpushed · public ENGINE split across 3 repos

---

# 7. ONE STRATEGY

## Purpose

Daily execution operating environment.

## Module inventory (evidence: `apps/web/lib/navigation.ts` + route files)

| Module | Route | State |
|---|---|---|
| Today's Brief | `/` | **Existing** |
| Decisions | `/decisions` | **Existing** |
| Execution | `/execution` | **Existing** |
| Organization | `/organization` | **Existing** |
| Settings | `/settings` | **Existing** |
| Auth | `/sign-in`, `/sign-up` | **Existing** |
| Configuration | `/configuration` | **Existing** |
| Mission | `/mission` | **Partial** — hidden |
| Projects | `/projects` | **Partial** — hidden |
| Tasks | `/tasks` | **Partial** — hidden |
| Finance | `/finance` | **Partial** — hidden |
| Documents | `/documents` | **Partial** — hidden |
| Receipts | `/receipts` | **Partial** — hidden |
| Customers | `/customers` | **Partial** — hidden |
| Suppliers | `/suppliers` | **Partial** — hidden |
| Governance | `/dashboard/governance` | **Partial** — hidden |
| Brain / AI | `/dashboard/brain`, `/assistant` | **Partial** — wrong pattern |
| Graph | `/dashboard/graph` | **Partial** — not primary |
| Digital Twin | `/dashboard/twin` | **Partial** — not primary |
| Autonomy | `/dashboard/autonomy` | **Legacy** — hidden |
| Analytics | `/analytics` | **Legacy** — hidden |
| Automation | `/automation` | **Legacy** — hidden |
| Notifications | `/notifications` | **Partial** — hidden |
| Recommendations | `/recommendations` | **Partial** — hidden |
| Accounting | `/accounting` | **Legacy** — hidden |
| Execution Graph (product) | — | **Missing** from primary UX |
| Execution Economy (product) | — | **Missing** |
| Prediction Workspace | — | **Missing** |
| NEXT PREVENT/DECIDE/EXECUTE/LEARN | — | **Missing** |

---

# 8. PILOT STRATEGY

## Purpose

Validate execution maturity.

## Deliverables

| Deliverable | State | Evidence |
|---|---|---|
| Execution Assessment | **Missing** (canonical) | No `executia` assessment product |
| Execution Score | **Missing** (canonical) | Layer `scoreboard/` partial — **duplicate, retire** |
| Execution Value Report | **Missing** | — |
| Execution Improvement Plan | **Missing** | — |
| ROI Forecast | **Missing** | — |
| Business Case | **Missing** | — |

## Existing infrastructure

| Item | Location | Evidence |
|---|---|---|
| Pilot info | `executia/pilot.html` | File exists |
| Request form | `executia/request.html` | File exists |
| Request API | `executia/api/request.js` | Resend email |
| Approved page | `executia/pilot-approved.html` | File exists |
| ONE sign-up | `executia-one/sign-up` | Route exists — E2E **not verified** |

---

# 9. CURRENT STATE (FACTS ONLY)

## ENTRY

| Category | Items | Evidence |
|---|---|---|
| **Completed** | Production on `executia.io`; `/entry` in `vercel.json`; brand header/footer; 13 public HTML pages; request API; sitemap/robots/llms | `vercel.json` line 11; 13 HTML files |
| **Partial** | Legacy hero; 7-section homepage; engine embed | `index.html` section count |
| **Missing** | Master Plan 9-section homepage; Calculator; Assessment section; Leak Monitor; story film | No files in `executia` |
| **Blocked** | Approved dev UI in `executia-one` only | `entry/page.tsx` exists; not in `executia` |
| **Legacy** | Three-card hub; UI Standard hero | `index.html` `.platform-hub` |
| **Duplicate** | Full ENTRY in ONE + 14 preview routes | 15 entry `page.tsx` files |

## ENGINE

| Category | Items | Evidence |
|---|---|---|
| **Completed** | Layer runtime; public demo; mission API | Files verified |
| **Partial** | Success-path demo only; stale layer prod | 65 commits ahead |
| **Missing** | Mission UX public; blocked path; Value; Assessment on public | Not in `engine.html` |
| **Blocked** | Layer deploy drift | `git rev-list --count origin/main..HEAD` = 65 |
| **Legacy** | 162 experimental layer HTML pages | `find public -name index.html \| wc -l` = 162 |
| **Duplicate** | `engine.html` + `index.html` demo + ONE `/engine` | 3 surfaces |

## ONE

| Category | Items | Evidence |
|---|---|---|
| **Completed** | Next.js 15; auth routes; 5 primary nav items; governance UI; receipt package; **235 tests pass** | `pnpm test` 2026-07-12 |
| **Partial** | Hidden modules; brain route; in-memory timeline | `navigation.ts` |
| **Missing** | NEXT rows; ambient Brain; Economy UI; Prediction Workspace; E2E pilot | Not in primary nav |
| **Blocked** | PostgreSQL E2E not verified; prod behind local | Branch not `main`; 2 ahead |
| **Legacy** | accounting, analytics, automation routes | Hidden nav |
| **Duplicate** | Public entry/engine/pilot/institutional/docs/support in ONE | Public route files |

## PILOT

| Category | Items | Evidence |
|---|---|---|
| **Completed** | Static pages; email API | `pilot.html`, `api/request.js` |
| **Partial** | Layer governance-assessment UI | `executia-layer/public/governance-assessment/index.html` |
| **Missing** | All six deliverables (canonical) | No product code on `executia` |
| **Blocked** | Assessment engine not built on canonical repo | — |
| **Legacy** | Layer pilot-intake overlap | `api/v1/pilot-intake.js` |
| **Duplicate** | ONE `/pilot`, layer pilot paths | Route files |

## STANDARD

| Category | Items | Evidence |
|---|---|---|
| **Completed** | `standard.html`, `definition.html` | Files exist |
| **Partial** | ONE governance engine | Package exists |
| **Missing** | Interactive Standard; homepage section | — |
| **Blocked** | — | — |
| **Legacy** | — | — |
| **Duplicate** | Layer standards API (complementary) | `api/v1/standards.js` |

## ECONOMY

| Category | Items | Evidence |
|---|---|---|
| **Completed** | `ExecutionValueAggregator.ts` | File exists |
| **Partial** | Layer `capital/`, `genome/` experimental | HTML exists |
| **Missing** | Public section; ONE module; ROI product | — |
| **Blocked** | Requires Calculator + verified outcomes | P0 dependency |
| **Legacy** | Layer future-market pages | In 162 set |
| **Duplicate** | Layer capital vs ONE aggregator | Two implementations |

## GRAPH

| Category | Items | Evidence |
|---|---|---|
| **Completed** | Graph + Knowledge packages in ONE | `packages/execution-engine/src/graph/`, `knowledge/` |
| **Partial** | Hidden `/dashboard/graph`; layer `public/graph/` | Routes exist |
| **Missing** | Primary ONE integration | Not in primary nav |
| **Blocked** | — | — |
| **Legacy** | — | — |
| **Duplicate** | Layer graph UI vs ONE engine | Two surfaces |

## AI

| Category | Items | Evidence |
|---|---|---|
| **Completed** | `brain/`, `autonomy/`, `digital-twin/` packages | Files exist |
| **Partial** | Hidden brain route; layer predict/genome | Routes exist |
| **Missing** | Ambient NEXT; Prediction Workspace; governed autonomy product | — |
| **Blocked** | Autonomy requires governance maturity | Policy |
| **Legacy** | Layer future-intelligence pages | In 162 set |
| **Duplicate** | Layer predict API vs ONE forecast engine | Two implementations |

## ASSESSMENT

| Category | Items | Evidence |
|---|---|---|
| **Completed** | — | — |
| **Partial** | Layer governance-assessment page | HTML exists |
| **Missing** | Canonical assessment on `executia`; Score; Report; Improvement Plan | — |
| **Blocked** | P0 build not started | — |
| **Legacy** | — | — |
| **Duplicate** | Layer scoreboard vs future ONE score | `scoreboard/` exists |

---

# 10. CAPABILITY MAP

| Capability | Purpose | Priority | Owner | Current state | Definition of Done |
|---|---|---|---|---|---|
| Execution Visibility | Make invisible execution visible | P0 | Core | **Partial** — monitor unported | Leak Monitor on `executia.io`; visibility realization in 30s; PO approval |
| Execution Value | Calculate loss and enterprise value | P0 | Core | **Not started** (public); aggregator exists | Calculator on homepage; quantified output; PO approval |
| Execution Standard | Govern execution consistently | P0 | Core | **Partial** — static docs + engine | Standard on homepage + ENGINE demo; PO approval |
| Execution Assessment | Evaluate organization pre-implementation | P0 | Platform | **Partial** — layer UI only | Assessment on `executia` §8; feeds score; PO approval |
| Governance | Maintain execution integrity | P0 | Core | **Partial** — ONE engine strong | Blocked execution on public ENGINE; PO approval |
| Evidence | Verify every execution | P0 | Core | **Partial** — receipt pipeline | Evidence required in pilot path; E2E verified; PO approval |
| Execution Graph | Living execution network | P1 | Platform | **Development** | Graph in ONE primary UX; live data; PO approval |
| Execution Intelligence | Insights and recommendations | P1 | AI | **Partial** — brain package | Ambient on NEXT; no Brain nav; PO approval |
| Execution Economy | Execution as measurable capital | P1 | Core | **Architecture** | Economy section + ONE metric; verified data; PO approval |
| Knowledge Graph | Connect organizational knowledge | P1 | AI | **Partial** — engine package | ONE integration; truth-sourced; PO approval |
| Prediction | Forecast outcomes | P2 | AI | **Partial** — engines exist | NEXT PREVENT row; PO approval |
| Learning | Improve execution quality | P2 | AI | **Partial** — workflow updater | NEXT LEARN row; PO approval |
| Digital Twin | Mirror organizational execution | P2 | Platform | **Prototype** — engines + partial UI | Twin workspace; no prod mutation; PO approval |
| Certification | Certify execution maturity | P2 | Core | **Partial** — layer UI only | Canonical workflow; layer retired; PO approval |
| Autonomous Execution | Execute approved work autonomously | P3 | AI | **Development** — autonomy engine exists | Gated by governance score; audit; PO approval |

---

# 11. BUILD ORDER

Nothing may be developed outside this order.

## P0 — Foundation

| Task | Business value | Dependencies | Owner | Definition of done |
|---|---|---|---|---|
| **Inventory locked** | Prevents wrong-repo work | This plan v3.0 approved | Product Owner | §0 + §1 complete; PO sign-off |
| **Authority locked** | Single precedence | Document precedence § | Product Owner | Constitution merge scheduled; PO sign-off |
| **Homepage (9 sections)** | Category creation | `executia` repo; hero spec from ONE reference; Constitution narrative | Engineering → `executia` | `index.html` matches §5; legacy sections removed; PO approval |
| **Execution Value Calculator** | Executive business case | Homepage §3 slot; Value Aggregator spec | Engineering → `executia` | Calculator live; output visible; PO approval |
| **Organization Assessment (public)** | Pilot qualification | Homepage §8; layer assessment reviewed for merge | Engineering → `executia` | Assessment completable on `executia.io`; PO approval |
| **Living Engine section** | Interactive proof | Homepage §4; `executia-layer` deploy sync; Try the Engine CTA | Engineering → `executia` + CTO → layer | Primary CTA to ENGINE; demo embedded or linked; layer prod synced; PO approval |
| **Delete ONE public ENTRY duplicates** | Stops authority conflict | Homepage live on `executia` | CTO → `executia-one` | `entry/page.tsx` + 14 previews removed or disabled; PO approval |

**P0 does not include:** Execution Graph, Economy product, Prediction, Certification, Autonomous Execution, Execution Cloud.

## P1 — Operational intelligence

| Task | Business value | Dependencies | Owner | Definition of done |
|---|---|---|---|---|
| **Execution Graph (ONE primary)** | Relationship visibility | P0 complete | CTO → `executia-one` | Graph in primary UX; live data; PO approval |
| **Execution Economy (ONE + public section)** | ROI narrative | P0 Calculator; verified outcomes | Core + CTO | §6 homepage + ONE metric; PO approval |
| **Execution Standard (interactive)** | Category authority | P0 homepage §7; ENGINE demo | Core | Standard experienced on ENGINE; PO approval |
| **Knowledge Graph (ONE integration)** | Compounding intelligence | Graph P1; truth layer | AI + CTO | Integrated in ONE; PO approval |
| **ONE E2E pilot verification** | Pilot readiness | P0 complete; PostgreSQL staging; migrations; OCR config | CTO | Sign-up → receipt → execution → governance persists; documented; PO approval |
| **Execution Score (canonical)** | PILOT deliverable | Assessment P0 | Platform | Score generated; layer scoreboard retired; PO approval |
| **Layer production sync** | ENGINE truth | P0 Living Engine | CTO → `executia-layer` | Prod commit matches approved staging; ≤0 unapproved drift |

## P2 — Enterprise optimization

| Task | Business value | Dependencies | Owner | Definition of done |
|---|---|---|---|---|
| **Prediction** | Failure prevention | P1 Graph + AI | AI | NEXT PREVENT populated; PO approval |
| **Learning** | Compounding capability | P1 Knowledge Graph | AI | NEXT LEARN populated; PO approval |
| **Digital Twin** | Safe simulation | P1 Graph; reality layer | Platform | Twin workspace; no prod mutation; PO approval |
| **Certification** | Standard authority | P1 Standard interactive | Core | Canonical cert workflow; layer cert pages retired; PO approval |
| **ONE Integration (NEXT rows)** | Daily operating vision | P1 modules | CTO | PREVENT/DECIDE/EXECUTE/LEARN live; PO approval |
| **PILOT deliverables complete** | Enterprise sales | P0 Assessment + P1 Score | Product Owner | Value Report, Improvement Plan, ROI Forecast, Business Case; PO approval |

## P3 — Global infrastructure

| Task | Business value | Dependencies | Owner | Definition of done |
|---|---|---|---|---|
| **Execution Cloud** | Global scale | P2 complete | Product Owner | Defined in registry; PO approval |
| **Execution Index** | Category leadership | P2 Economy | Product Owner | Published index; PO approval |
| **Execution DNA** | Organizational identity | P2 Graph + AI | Product Owner | Product defined; PO approval |
| **Autonomous Execution (governed)** | Platform end-state | P2 governance maturity; autonomy engine | AI + Product Owner | Gated autonomy; full audit; PO approval |

**P3 items require rows in Component Registry before implementation.**

---

# 12. DEVELOPMENT PROTOCOL

Every Cursor task **must** begin with:

```
Repository:        [executia | executia-one | executia-layer]
Branch:            [named branch]
Working Directory: [absolute path — must match repository]
Product:           [ENTRY | ENGINE | ONE | PILOT | STANDARD | ECONOMY | GRAPH | AI | ASSESSMENT]
Mission:           [approved mission ID]
Target Page:       [exact file or URL from §1 Component Registry]
```

**If any mismatch → STOP. No implementation.**

Additional rules:

- No repository switching mid-task  
- No scope changes without new PO mission  
- No self QA  
- No Mission Complete  
- Every task must map to §11 Build Order  
- Public homepage work **only** in `executia`

---

# 13. TASK TEMPLATE

```
Repository:
Branch:
Working Directory:
Product:
Mission:
Target Page:
Goal:
Scope:
Files:
Expected Result:
Definition of Done:
```

Nothing else in the task header.

---

# 14. REVIEW GATE

| Cursor / Engineering | Product Owner |
|---|---|
| Produces evidence | Judges evidence |
| Reports observations | Declares PASS or FAIL |
| Never declares READY | Declares READY |
| Never declares MISSION COMPLETE | Declares MISSION COMPLETE |

**Cursor is forbidden to decide:** PASS · FAIL · READY · MISSION COMPLETE

---

# 15. DEFINITION OF DONE

A task is complete **only** when:

- **Working** — real data paths, not mock-only  
- **Integrated** — connected per §3 Single Source of Truth  
- **Reviewed** — evidence attached  
- **Approved** — Product Owner explicit approval  

Additionally:

- No duplicated functionality  
- No orphan pages  
- No temporary code without tracked removal  
- No dead code  
- Supports North Star (§4)  
- Strengthens ≥1 pillar: Execution Standard · Execution Economy · Execution Intelligence · Enterprise Value  

---

# 16. NORTH STAR VALIDATION

Before any feature is approved, answer:

| Question | Required answer |
|---|---|
| Does it strengthen **Execution Standard**? | Yes / No |
| Does it strengthen **Execution Economy**? | Yes / No |
| Does it strengthen **Execution Intelligence**? | Yes / No |
| Does it strengthen **Enterprise Value**? | Yes / No |

**If all four are No → do not build it.**

---

*End of EXECUTIA Master Plan — Product Authority v3.0*

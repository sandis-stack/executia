# EXECUTIA Registry

Version: 1.0  
Status: **Operational Control Center**  
Owner: Product Owner  
Location: `/governance/EXECUTIA_REGISTRY.md`  
Repository: `executia`  
Evidence date: **2026-07-12** · Cleanup: **IQ-P0-02** (2026-07-12)

Inventory-only document. No implementation. All rows verified against local repositories unless noted.

**Authority hierarchy:** `EXECUTIA_PRODUCT_MODEL.md` (product identity) → `EXECUTIA_MASTER_PLAN.md` (build order) → **this registry** (inventory + queue) → Constitution → Product Definitions.

**Git evidence:**

| Repository | Branch | HEAD | Ahead of `origin/main` |
|---|---|---|---|
| `executia` | `main` | `5f1adca` | 3 |
| `executia-one` | `mission-001-executia-constitution` | `4ca1d16` | 2 |
| `executia-layer` | `main` | `c2dc746` | 65 |

**Test evidence:** `executia-one` → `pnpm test` → **235 passed** (2026-07-12).

---

# SECTION 1 — PRODUCT REGISTRY

| Product | Purpose | Repository | Production URL | Development URL | Current Stage | Owner | Authority Document | Master Plan Phase | Status | Progress | Dependencies | Definition of Done |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **ENTRY** | Category creation — teach Execution Platform | `executia` | `https://executia.io`, `https://executia.io/entry` | `/Users/sandis/Documents/executia-repo/index.html` | Production (legacy) | Product Owner | Master Plan §5 · Product Model §5 | P0 | Live — replace required | **0/9** target sections; **1** canonical homepage; ONE duplicate ENTRY **removed** (IQ-P0-02) | Brand assets; Constitution narrative; Product Model | 9 sections live on `executia.io`; legacy sections removed; PO approval |
| **ENGINE** | Interactive proof — governed execution | `executia-layer` (runtime), `executia` (funnel) | `https://execution.executia.io`, `https://executia.io/engine` | `executia-layer/public/dashboard/`, `executia-repo/engine.html` | Production (layer stale) + Production (static demo) | CTO | Master Plan §6 · Product Model §5 | P0 (Living Engine), P1 (sync) | Runtime drift — 65 commits unpushed | Demo: **6/10** ENGINE demonstration areas (Mission, Planning, Execution, Validation, Evidence partial; Prediction, Learning, Value, Assessment missing on public) | Layer deploy sync; Standard governance | Public mission flow; blocked path demo; layer prod synced; PO approval |
| **ONE** | Daily execution operating environment | `executia-one` | `https://one.executia.io` | `/Users/sandis/Documents/executia-one/apps/web` | Internal | CTO | Product Model §5 · Master Plan §7 | P1 (E2E), P2 (NEXT) | Auth exists; E2E unverified | **5/5** primary nav routes exist; **0/4** NEXT rows; **14** hidden/legacy modules | PostgreSQL; execution-engine; auth | E2E pilot verified; NEXT rows live; PO approval |
| **PILOT** | Validate organization before adoption | `executia` (intake), `executia-one` (operation) | `https://executia.io/pilot`, `https://executia.io/request` | `executia-repo/pilot.html`, `request.html` | Prototype | Product Owner | Master Plan §8 · Product Model §7 | P0 (intake), P2 (deliverables) | Email intake only | **3/3** static intake pages; **0/6** PILOT deliverables | Assessment P0; ONE sign-up | All six deliverables + business case; PO approval |
| **EXECUTION STANDARD** | Global execution framework | `executia` (docs), `executia-layer` (API), `executia-one` (engine) | `https://executia.io/standard`, `/definition` | `executia-repo/standard.html`, `definition.html` | Production (static docs) | Product Owner | Product Model §5 · Master Plan §10 | P0 (homepage §7), P1 (interactive) | Docs only — not interactive | **2/2** public doc pages; **0/1** interactive experience | Governance engine; ENGINE demo | Standard on homepage + experienced on ENGINE; PO approval |
| **EXECUTION ECONOMY** | Measurable execution value / capital | `executia-one` | — (not public) | `packages/execution-engine/src/workflows/ExecutionValueAggregator.ts` | Architecture | Product Owner | Product Model §4 · Master Plan §10 | P1 | Engine class only | **1/1** aggregator class; **0/3** surfaces (public §6, ONE module, ROI) | Calculator P0; verified outcomes | Economy section + ONE metric from verified data; PO approval |
| **EXECUTION GRAPH** | Living execution network | `executia-one` | — (ONE internal) | `packages/execution-engine/src/graph/` | Development | CTO | Product Model §5 · Master Plan §10 | P1 | Hidden route only | **1/1** engine package; **0/1** primary UX integration | Knowledge Graph; Truth layer | Graph in ONE primary UX; live data; PO approval |
| **EXECUTION INTELLIGENCE** | Prediction, learning, insights | `executia-one` | — (ONE internal) | `brain/`, `autonomy/`, `digital-twin/` under `packages/execution-engine/src/` | Development | CTO | Product Model §5 · Master Plan §10 | P1 (ambient), P2 (Prediction/Learning) | Brain hidden — wrong pattern | **3/3** engine dirs exist; **0/1** ambient NEXT integration | Knowledge Graph; Governance maturity | Insights on NEXT without Brain nav; PO approval |
| **EXECUTION ASSESSMENT** | Organization execution maturity | `executia` (canonical), `executia-layer` (partial) | Target: `executia.io` §8 · Layer: `execution.executia.io/governance-assessment` | `executia-repo/index.html` §8, `organization-assessment-engine.js` | Partial → canonical built | Product Owner | Product Model §5 · Master Plan §10 | P0 (public), P1 (Score) | Layer duplicate — merge only | **1/1** canonical UI built; layer pending merge/delete | Calculator | PO verification pending |
| **KNOWLEDGE GRAPH** | Knowledge from verified truth | `executia-one` | — (ONE internal) | `packages/execution-engine/src/knowledge/` | Internal (engine package) | CTO | Product Model §3 · Master Plan §10 | P1 | Engine package complete — UI partial | **1/1** knowledge package; layer API adapter exists | TruthGraph; Execution Graph | ONE integration; truth-sourced only; PO approval |
| **DIGITAL TWIN** | Mirror organizational execution | `executia-one` | — (ONE internal) | `packages/execution-engine/src/digital-twin/`, route `/dashboard/twin` | Prototype | CTO | Product Model §10 · Master Plan §10 | P2 | Engines + partial UI | **1/1** engine package; **1/1** hidden UI route | Execution Graph; Reality layer | Twin workspace; no prod mutation; PO approval |
| **EXECUTION CLOUD** | Global multi-org execution infrastructure | — | — | — | Concept | Product Owner | Product Model §10 · Master Plan §11 P3 | P3 | Not started | **0/1** product defined in code | P2 complete; platform maturity | Registry row + PO-approved definition | Product defined in registry; PO approval |

**Progress key:** Fractions count verified artifacts vs Master Plan / Product Model requirements — not effort estimates.

---

# SECTION 2 — FEATURE REGISTRY

| Feature | Product | Repository | Path | Status | Duplicate | Authority | Dependencies | Owner | Action |
|---|---|---|---|---|---|---|---|---|---|
| Public homepage | ENTRY | `executia` | `index.html` | Production — legacy | Yes | Master Plan §5 | — | Product Owner | **Replace** |
| `/entry` route alias | ENTRY | `executia` | `vercel.json` | Production | No | Master Plan | `index.html` | Product Owner | **Keep** |
| ENTRY Next.js page | ENTRY | `executia-one` | `apps/web/app/(public)/entry/page.tsx` | Development | Yes | — (wrong repo) | — | CTO | **Delete** after P0 |
| ENTRY preview routes (×14) | ENTRY | `executia-one` | `apps/web/app/(public)/entry/*/page.tsx` | Development | Yes | — | — | CTO | **Delete** |
| Execution Leak Monitor | ENTRY | `executia-one` | `components/homepage/ExecutionLeakMonitor.tsx` | Development — unported | Yes | Constitution §4 | Hero | Product Owner | **Rebuild** in `executia` |
| Story film | ENTRY | `executia-one` | `components/story-film/` | Development — unported | Yes | Constitution | — | Product Owner | **Rebuild** in `executia` |
| Final proof / pilot sections | ENTRY | `executia-one` | `components/homepage/FinalEntrySections.tsx` | Development — unported | Yes | Master Plan | — | Product Owner | **Merge** into static homepage |
| Execution Value Calculator | ENTRY | `executia` | `assets/execution-value-engine.js`, `execution-value-calculator.js` | Production — demo model | No | Master Plan §5 | Value model | Product Owner | **Keep** |
| Living Engine section | ENTRY | `executia` | `engine.html`, `index.html#live-execution` | Partial | Yes | Master Plan §5 | Layer runtime | Product Owner | **Merge** |
| Public ENGINE demo (6-state) | ENGINE | `executia` | `engine.html`, `assets/app.js` | Production — partial | Yes | Master Plan §6 | — | CTO | **Replace** |
| ENGINE runtime dashboard | ENGINE | `executia-layer` | `public/dashboard/` | Production — stale | Partial | Master Plan §6 | — | CTO | **Keep** |
| Mission API | ENGINE | `executia-layer` | `api/v1/mission.js` | Exists | No | Master Plan §6 | — | CTO | **Keep** |
| ENGINE Next.js lifecycle demo | ENGINE | `executia-one` | `apps/web/app/(public)/engine/page.tsx` | Development | Yes | — | — | CTO | **Delete** |
| Governance engine | ENGINE / ONE | `executia-one` | `packages/execution-engine/src/governance/` | Internal | Partial (layer APIs) | Master Plan | Standard | CTO | **Keep** |
| Evidence surfaces (layer) | ENGINE | `executia-layer` | `public/execution-evidence/` | Experimental | Yes | — | — | CTO | **Retire** |
| Prediction API (layer) | ENGINE / AI | `executia-layer` | `api/v1/predict/` | Experimental | Yes | Product Model | ONE brain | CTO | **Merge** |
| Standards API | STANDARD | `executia-layer` | `api/v1/standards.js` | Exists | Complementary | Product Model | — | Product Owner | **Keep** |
| Today's Brief | ONE | `executia-one` | `apps/web/app/(dashboard)/page.tsx` | Existing | No | Product Model | auth | CTO | **Keep** |
| Decisions inbox | ONE | `executia-one` | `apps/web/app/(dashboard)/decisions/page.tsx` | Existing | No | Product Model | governance | CTO | **Keep** |
| Execution queue | ONE | `executia-one` | `apps/web/app/(dashboard)/execution/page.tsx` | Existing | No | Product Model | — | CTO | **Keep** |
| Governance dashboard | ONE | `executia-one` | `apps/web/app/(dashboard)/dashboard/governance/` | Partial | No | Product Model | governance engine | CTO | **Keep** |
| Receipt workflow | ONE | `executia-one` | `packages/receipt-engine/`, `/receipts` | Partial | No | Product Model | PostgreSQL | CTO | **Keep** |
| Brain dashboard | EXECUTION INTELLIGENCE | `executia-one` | `/dashboard/brain`, `components/brain/` | Partial — wrong pattern | No | Product Model | — | CTO | **Replace** (ambient) |
| Graph view | EXECUTION GRAPH | `executia-one` | `/dashboard/graph` | Partial | Yes | Master Plan | graph package | CTO | **Replace** (primary UX) |
| Digital twin view | DIGITAL TWIN | `executia-one` | `/dashboard/twin` | Partial | Yes | Master Plan | twin package | CTO | **Keep** until P2 |
| Auth sign-up / sign-in | ONE / PILOT | `executia-one` | `apps/web/app/(public)/sign-in`, `sign-up` | Existing | No | Master Plan §8 | PostgreSQL | CTO | **Keep** |
| Pilot request form | PILOT | `executia` | `request.html` | Production | No | Master Plan §8 | Resend API | Product Owner | **Keep** |
| Pilot request API | PILOT | `executia` | `api/request.js` | Production | Yes | Master Plan §8 | — | Product Owner | **Keep** |
| Pilot info pages | PILOT | `executia` | `pilot.html`, `pilot-approved.html` | Production | Yes | Master Plan §8 | — | Product Owner | **Keep** |
| Pilot Next.js page | PILOT | `executia-one` | `apps/web/app/(public)/pilot/page.tsx` | Development | Yes | — | — | CTO | **Delete** |
| Layer pilot intake API | PILOT | `executia-layer` | `api/v1/pilot-intake.js` | Exists | Yes | Master Plan §8 | — | CTO | **Delete** |
| Layer governance assessment | ASSESSMENT | `executia-layer` | `public/governance-assessment/index.html` | Partial | Yes | Master Plan P0 | — | Product Owner | **Merge** then **Delete** |
| Layer scoreboard | ASSESSMENT | `executia-layer` | `public/scoreboard/`, `api/v1/scoreboard/` | Partial | Yes | Master Plan P1 | Assessment | Product Owner | **Delete** after canonical Score |
| Execution Value Aggregator | ECONOMY | `executia-one` | `workflows/ExecutionValueAggregator.ts` | Architecture | No | Product Model §8 | Outcomes | Product Owner | **Keep** |
| Layer capital / genome pages | ECONOMY | `executia-layer` | `public/capital/`, `public/genome/` | Experimental | Yes | — | — | CTO | **Retire** |
| Knowledge graph engine | KNOWLEDGE GRAPH | `executia-one` | `packages/execution-engine/src/knowledge/` | Internal | Yes (layer API) | Master Plan | TruthGraph | CTO | **Keep** |
| Knowledge graph API | KNOWLEDGE GRAPH | `executia-layer` | `api/v1/knowledge-graph/` | Exists | Yes | Master Plan | ONE engine | CTO | **Merge** (adapter only) |
| Graph engine | EXECUTION GRAPH | `executia-one` | `packages/execution-engine/src/graph/` | Development | Yes | Master Plan | Knowledge | CTO | **Keep** |
| Layer graph UI | EXECUTION GRAPH | `executia-layer` | `public/graph/` | Experimental | Yes | Master Plan | — | CTO | **Retire** |
| Autonomy engine | EXECUTION INTELLIGENCE | `executia-one` | `packages/execution-engine/src/autonomy/` | Development | Partial | Product Model | Governance | CTO | **Keep** |
| Standard public docs | STANDARD | `executia` | `standard.html`, `definition.html` | Production | No | Product Model | — | Product Owner | **Keep** |
| Supporting public pages | ENTRY | `executia` | `global.html`, `institutional.html`, `contact.html`, `support.html`, `docs.html`, `one.html` | Production | Partial (ONE dup) | Master Plan | — | Product Owner | **Keep** |
| Public pages (ONE dup) | ENTRY | `executia-one` | `institutional/`, `docs/`, `support/` | Development | Yes | — | — | CTO | **Delete** |
| SEO / AI files | ENTRY | `executia` | `sitemap.xml`, `robots.txt`, `llms.txt` | Production | No | — | — | Product Owner | **Keep** |
| Constitution | Governance | `executia-one` | `governance/EXECUTIA_CONSTITUTION.md` | Active — wrong repo | Yes | Doc precedence rank 2 | — | Product Owner | **Merge** → `executia/governance/` |
| Product Model | Governance | `executia` | `governance/EXECUTIA_PRODUCT_MODEL.md` | Active | No | Rank 1 product | — | Product Owner | **Keep** |
| Master Plan | Governance | `executia` | `governance/EXECUTIA_MASTER_PLAN.md` | Active | No | Rank 1 operational | — | Product Owner | **Keep** |
| Layer experimental pages (162) | Various | `executia-layer` | `public/**/index.html` | Legacy | Internal | — | — | CTO | **Retire** (audit) |

---

# SECTION 3 — COMPONENT REGISTRY

Shared UI and design components. Authority = canonical owner per Master Plan §3.

| Component | Authority | Repository | Path | Status | Duplicate | Replacement |
|---|---|---|---|---|---|---|
| **Header** | `executia` (target) | `executia` | `assets/platform-nav.js` | Production | `PlatformHeader.tsx`, `PlatformHeaderVariant.tsx` | Rebuild nav per Master Plan §5 |
| **Header (ONE/public)** | Reference only | `executia-one` | `components/platform/PlatformHeader.tsx` | Development | Yes | Delete after port |
| **Header variant** | None | `executia-one` | `components/platform/PlatformHeaderVariant.tsx` | Development | Yes | Delete |
| **Footer** | `executia` | `executia` | `assets/platform-brand.js` (`[data-platform-footer]`) | Production | `EntryFooter.tsx`, `PlatformFooter.tsx` | Keep; align on port |
| **Hero** | `executia` (target) | `executia` | `index.html` `.hero` | Production — legacy | `HomepageHeroH1.tsx`, `HomepageHero.tsx` | Replace |
| **Hero (dev)** | Reference only | `executia-one` | `components/homepage/HomepageHeroH1.tsx` | Development | Yes | Rebuild static |
| **Story Film** | `executia` (target) | `executia-one` | `components/story-film/` (4 files + timeline) | Development — unported | None in `executia` | Rebuild in `executia` |
| **Execution Calculator** | `executia` | `assets/execution-value-engine.js` | Homepage §3 | Production — demo | `execution-value-calculator.js` | Keep |
| **Execution Graph (UI)** | `executia-one` (target) | `executia-one` | `/dashboard/graph` | Partial | `executia-layer/public/graph/` | Primary UX P1 |
| **Execution Score (UI)** | `executia-one` (target P1) | — | — | Missing | `executia-layer/public/scoreboard/` | Build; delete layer |
| **Assessment (UI)** | `executia` | `assets/organization-assessment-engine.js` | Homepage §8 | Production — demo | `executia-layer` partial | Keep canonical; merge/delete layer |
| **Pilot (UI)** | `executia` | `executia` | `pilot.html`, `request.html`, `pilot-approved.html` | Production | ONE `/pilot` | Keep; delete ONE |
| **Dashboard (ONE)** | `executia-one` | `executia-one` | `apps/web/app/(dashboard)/page.tsx` | Existing | — | Keep |
| **Navigation (ONE)** | `executia-one` | `executia-one` | `lib/navigation.ts`, `BusinessSidebar.tsx` | Existing | Multiple layout nav components | Keep primary |
| **Navigation (public)** | `executia` | `executia` | `assets/platform-nav.js` | Production | `GlobalExecutiaNav.tsx`, `OneTopNav.tsx` | Keep public; ONE separate |
| **Buttons** | `executia` | `executia` | `assets/app.css` (`.pill-btn`) | Production | Tailwind in ONE | Keep per surface |
| **Typography** | `executia` | `executia` | `DESIGN_SYSTEM.md`, `assets/app.css` | Production | `design-system-v1.ts`, ONE Tailwind tokens | Merge specs |
| **Color System** | `executia` | `executia` | `DESIGN_SYSTEM.md`, `assets/app.css` | Production | `hero-palettes.ts` (ONE), `design-system-v1.ts` | Public: DESIGN_SYSTEM; port hero palette on rebuild |
| **Animation System** | `executia-one` (reference) | `executia-one` | `ExecutionLeakMonitor.tsx`, `story-film-timeline.ts` | Development | None in `executia` | Rebuild in static P0 |
| **Brand tokens (JS)** | `executia` | `executia` | `assets/platform-brand.js` | Production | `executia-brand.ts` | Keep public |
| **Leak Monitor** | `executia` (target) | `executia-one` | `components/homepage/ExecutionLeakMonitor.tsx` | Development | None | Rebuild P0 |
| **Engine lifecycle demo** | `executia-layer` (runtime) | `executia-one` | `components/engine/ExecutionLifecycleDemo.tsx` | Development — wrong repo | `app.js` demo | Delete ONE; merge public demo |

---

# SECTION 4 — DUPLICATE REGISTRY

| Asset | Location A | Location B | Reason | Authority | Action | Deadline |
|---|---|---|---|---|---|---|
| Homepage | `executia/index.html` | `executia-one/.../entry/page.tsx` | Wrong-repo development | Master Plan §3 | Replace A; Delete B | P0 |
| Homepage previews | — | `executia-one/.../entry/*/` (14 routes) | QA surfaces | Master Plan §1 | Delete | P0 |
| Hero | `executia/index.html` `.hero` | `executia-one/HomepageHeroH1.tsx` | Unported approved dev | Master Plan §3 | Replace A; Rebuild from B spec; Delete B | P0 |
| Header | `executia/assets/platform-nav.js` | `executia-one/PlatformHeader.tsx` | Split public/authenticated | Master Plan §3 | Replace A; Delete public use of B | P0 |
| Header variant | — | `executia-one/PlatformHeaderVariant.tsx` | Experimental | — | Delete | P0 |
| Footer | `executia/assets/platform-brand.js` | `executia-one/EntryFooter.tsx` | Unported | Master Plan §3 | Keep A; Rebuild; Delete B | P0 |
| Story film | — | `executia-one/components/story-film/` | Wrong repo | Master Plan §3 | Rebuild in A; Delete B | P0 |
| ENGINE public demo | `executia/engine.html` | `executia/index.html#live-execution` | Embedded duplicate | Master Plan §5 | Merge to Living Engine | P0 |
| ENGINE public demo | `executia/engine.html` | `executia-one/engine/page.tsx` | Wrong repo | Master Plan §3 | Keep funnel A; Delete B | P0 |
| ENGINE runtime | `executia-layer/public/dashboard/` | Multiple layer demo pages | Experimental sprawl | Master Plan §2 | Keep dashboard; Retire orphans | P1 |
| Pilot intake | `executia/request.html` + `api/request.js` | `executia-layer/api/v1/pilot-intake.js` | Parallel intake | Master Plan §3 | Keep A; Delete B | P0 |
| Pilot pages | `executia/pilot.html` | `executia-one/pilot/page.tsx` | Wrong repo | Master Plan §3 | Keep A; Delete B | P0 |
| Assessment UI | Target: `executia` | `executia-layer/public/governance-assessment/` | Experimental partial | Master Plan §3 | Build A; Merge/Delete B | P0 |
| Execution Score | Target: `executia-one` P1 | `executia-layer/public/scoreboard/` | Experimental partial | Master Plan §3 | Build canonical; Delete B | P1 |
| Knowledge Graph | `executia-one/packages/.../knowledge/` | `executia-layer/api/v1/knowledge-graph/` | Engine vs API adapter | Master Plan §3 | Keep ONE; Adapter only in layer | P1 |
| Execution Graph UI | `executia-one/dashboard/graph` | `executia-layer/public/graph/` | Engine vs orphan UI | Master Plan §3 | Keep ONE; Retire layer UI | P1 |
| Prediction | `executia-one/digital-twin/` | `executia-layer/api/v1/predict/` | Engine vs API | Master Plan §3 | Merge to ONE | P2 |
| Public institutional/docs/support | `executia/*.html` | `executia-one/(public)/` routes | Wrong repo copies | Master Plan §2 | Keep A; Delete B | P0 |
| Constitution | Target: `executia/governance/` | `executia-one/governance/EXECUTIA_CONSTITUTION.md` | Wrong repo | Doc precedence | Merge → A | P0 |
| Design system docs | `executia/DESIGN_SYSTEM.md` | `executia-one/governance/EXECUTIA_DESIGN_SYSTEM_v1.0.md` | Split | Doc precedence | Merge | P1 |
| UI Standard (hero lock) | Revoked by Master Plan | `executia/EXECUTIA_UI_STANDARD.md` | Superseded | Master Plan rank 1 | Retire hero sections | P0 |
| Git clone | `executia-repo` | `executia-updated` | Duplicate remote | — | Delete local clone | P0 |
| Layer experimental HTML | — | 162 `public/**/index.html` | Historical experiments | Master Plan §1 | Retire after audit | P2 |

---

# SECTION 5 — CLEANUP PLAN

## P0 — Critical duplicates / wrong repositories / wrong ownership

| ID | Item | Evidence | Action | Owner |
|---|---|---|---|---|
| CL-P0-01 | ENTRY homepage in `executia-one` | 15 entry `page.tsx` files → **2** preview routes remain | **Done** 2026-07-12 | CTO |
| CL-P0-02 | 14 ENTRY preview routes | 12 deleted; **2 kept** (`final-preview`, `007c-qa`) | **Done** 2026-07-12 | CTO |
| CL-P0-03 | Public ENGINE in ONE | `engine/page.tsx` exists | **Done** 2026-07-12 | CTO |
| CL-P0-04 | Public PILOT in ONE | `pilot/page.tsx` exists | **Done** 2026-07-12 | CTO |
| CL-P0-05 | Duplicate public pages in ONE | `institutional`, `docs`, `support`, `one` routes | **Done** 2026-07-12 | CTO |
| CL-P0-06 | Layer pilot-intake API | `api/v1/pilot-intake.js` | Delete or disable | CTO |
| CL-P0-07 | `executia-updated` clone | Same remote as `executia` | Delete local directory | Product Owner |
| CL-P0-08 | Constitution wrong repo | Only in `executia-one/governance/` | Merge to `executia/governance/` | Product Owner |
| CL-P0-09 | PlatformHeaderVariant | File exists | **Done** 2026-07-12 | CTO |
| CL-P0-10 | Legacy homepage engine embed on `executia` | Duplicate `#live-execution` in `index.html` | **Done** 2026-07-12 | Product Owner |
| CL-P0-11 | Legacy homepage sections on `executia` | 6 sections vs 9 target | **Migrated** — legacy at `index.legacy.html`; PO verification pending | Product Owner → Engineering |

## P1 — Legacy pages / unused components / deprecated documentation

| ID | Item | Evidence | Action | Owner |
|---|---|---|---|---|
| CL-P1-01 | Layer scoreboard duplicate | `public/scoreboard/` | Delete after canonical Score | Platform |
| CL-P1-02 | Layer graph UI | `public/graph/` | Retire | CTO |
| CL-P1-03 | EXECUTIA_UI_STANDARD hero lock | File § locked hero | **Done** 2026-07-12 — deprecation banner added | Product Owner |
| CL-P1-04 | Design system split | Two MD files | Merge to `executia` | Product Owner |
| CL-P1-05 | Hidden legacy ONE modules | `accounting`, `analytics`, `automation` in nav | Retire or archive | CTO |
| CL-P1-06 | Layer capital/genome experimental | HTML exists | Retire | CTO |

## P2 — Dead code / experimental assets / old previews

| ID | Item | Evidence | Action | Owner |
|---|---|---|---|---|
| CL-P2-01 | 162 layer experimental pages | `find public -name index.html \| wc -l` = 162 | Audit + retire orphans | CTO |
| CL-P2-02 | Layer certification pages | `public/certification/`, `certifications/` | Merge at P2 or delete | Core |
| CL-P2-03 | QA preview components | `QaComparisonPanel`, `PlatformHeaderBaseline0046ec2` | Delete with previews | CTO |
| CL-P2-04 | Old hero variants | `HomepageHero.tsx`, `InvisibleLossHero.tsx` | Delete after port | CTO |
| CL-P2-05 | Brand board / design-system-v1 preview routes | Preview `page.tsx` files | **Done** 2026-07-12 | CTO |

---

# SECTION 6 — IMPLEMENTATION QUEUE

Generated from Master Plan §11. Effort = relative scope only (S/M/L/XL) — not time estimates.

## P0 — Foundation

| ID | Goal | Repository | Dependencies | Effort | Definition of Done |
|---|---|---|---|---|---|
| **IQ-P0-01** | Lock inventory (this registry) | `executia` | Master Plan v3.0 | S | Registry approved by PO |
| **IQ-P0-02** | Lock document precedence + repository cleanup | `executia`, `executia-one` | IQ-P0-01 | S | Duplicates removed 2026-07-12; Constitution merge pending; PO sign-off |
| **IQ-P0-03** | Homepage — 9 sections | `executia` | IQ-P0-02; hero spec in ONE (reference) | XL | **APPROVED** — PO 2026-07-13 |
| **IQ-P0-04** | Execution Value Calculator | `executia` | IQ-P0-03 §3 slot | L | **APPROVED** — PO 2026-07-13 |
| **IQ-P0-05** | Organization Assessment (public) | `executia` | IQ-P0-03 §8; layer assessment reviewed | L | **IN REVIEW** — canonical product + funnel integration (IQ-P0-05A); PO sign-off pending |
| **IQ-P0-06** | Living Engine section | `executia`, `executia-layer` | IQ-P0-03 §4; layer deploy sync | L | Try the Engine CTA; layer prod synced; PO approval |
| **IQ-P0-07** | Delete ONE public ENTRY duplicates | `executia-one` | IQ-P0-03 live | M | `entry/page.tsx` + 14 previews removed/disabled; PO approval |
| **IQ-P0-08** | Delete ONE public ENGINE/PILOT/institutional/docs/support dupes | `executia-one` | IQ-P0-03, IQ-P0-07 | M | Routes removed; PO approval |
| **IQ-P0-09** | Delete layer pilot-intake duplicate | `executia-layer` | IQ-P0-05 | S | Single intake path on `executia.io/request`; PO approval |
| **IQ-P0-10** | Merge Constitution to `executia/governance/` | `executia`, `executia-one` | IQ-P0-02 | S | Single canonical path; PO approval |

## P1 — Operational intelligence

| ID | Goal | Repository | Dependencies | Effort | Definition of Done |
|---|---|---|---|---|---|
| **IQ-P1-01** | Execution Graph — ONE primary UX | `executia-one` | P0 complete | L | Graph in primary nav; live data; PO approval |
| **IQ-P1-02** | Execution Economy — public §6 + ONE metric | `executia`, `executia-one` | IQ-P0-04; verified outcomes | L | Homepage section + ONE metric; PO approval |
| **IQ-P1-03** | Execution Standard — interactive | `executia`, `executia-layer` | IQ-P0-06 | M | Experienced on ENGINE; PO approval |
| **IQ-P1-04** | Knowledge Graph — ONE integration | `executia-one` | IQ-P1-01 | L | Truth-sourced; PO approval |
| **IQ-P1-05** | ONE E2E pilot verification | `executia-one` | P0 complete; PostgreSQL staging; migrations; OCR | L | Sign-up → governance persists; documented; PO approval |
| **IQ-P1-06** | Execution Score (canonical) | `executia-one` | IQ-P0-05 | M | Score generated; layer scoreboard retired; PO approval |
| **IQ-P1-07** | Layer production sync | `executia-layer` | IQ-P0-06 | M | Prod matches approved staging; ≤0 unapproved drift |

## P2 — Enterprise optimization

| ID | Goal | Repository | Dependencies | Effort | Definition of Done |
|---|---|---|---|---|---|
| **IQ-P2-01** | Prediction — NEXT PREVENT | `executia-one` | P1 Graph + AI | L | PREVENT row populated; PO approval |
| **IQ-P2-02** | Learning — NEXT LEARN | `executia-one` | IQ-P1-04 | L | LEARN row populated; PO approval |
| **IQ-P2-03** | Digital Twin workspace | `executia-one` | IQ-P1-01; reality layer | L | Twin workspace; no prod mutation; PO approval |
| **IQ-P2-04** | Certification workflow | `executia` / `executia-one` | IQ-P1-03 | M | Canonical workflow; layer cert pages retired; PO approval |
| **IQ-P2-05** | ONE NEXT integration (4 rows) | `executia-one` | P1 modules | XL | PREVENT/DECIDE/EXECUTE/LEARN live; PO approval |
| **IQ-P2-06** | PILOT deliverables complete | `executia`, `executia-one` | IQ-P0-05; IQ-P1-06 | L | Value Report, Improvement Plan, ROI Forecast, Business Case; PO approval |
| **IQ-P2-07** | Layer experimental page cleanup | `executia-layer` | IQ-P1-07 | XL | Orphan pages retired per audit; PO approval |

## P3 — Global infrastructure

| ID | Goal | Repository | Dependencies | Effort | Definition of Done |
|---|---|---|---|---|---|
| **IQ-P3-01** | Execution Cloud — product definition | `executia` | P2 complete | M | Registry + Product Model updated; PO approval |
| **IQ-P3-02** | Execution Index — published | TBD | IQ-P1-02 Economy | L | Index published; PO approval |
| **IQ-P3-03** | Execution DNA — product defined | `executia-one` | IQ-P1-01; IQ-P2-01 | L | Product defined; PO approval |
| **IQ-P3-04** | Autonomous Execution (governed) | `executia-one` | P2 governance maturity; autonomy engine exists | XL | Gated autonomy; full audit; PO approval |

---

# REGISTRY RULES

1. No feature development until the relevant row exists in Section 2 or 3.  
2. No duplicate may ship without a row in Section 4 and an approved Action.  
3. No task starts outside Section 6 queue order without Product Owner exception.  
4. Progress fractions must be updated with evidence when inventory changes.  
5. Cursor must not declare PASS, FAIL, READY, or MISSION COMPLETE — Product Owner only.

---

*End of EXECUTIA Registry v1.0*

# EXECUTIA Constitution

| Field | Value |
|---|---|
| **Status** | **Mandatory — Highest authority for AI agents and product development** |
| **Version** | 1.0 |
| **Location** | `/governance/EXECUTIA_CONSTITUTION.md` |
| **Scope** | All AI agents, engineering, and product work affecting executia.io and the EXECUTIA platform |

Every AI agent **MUST** read this document before implementation.  
Product direction belongs to **Founder + CTO only**. Engineering implements. Engineering does not redefine the product.

On conflict between this document and explicit Founder or Product Owner instruction, **Founder / Product Owner instruction wins** — but the conflict **MUST** be recorded in the mission evidence.

Cross-reference: [docs/CONSTITUTION.md](../docs/CONSTITUTION.md) (ecosystem architecture) · [GOVERNANCE.md](../GOVERNANCE.md) (development process)

---

## 1. Authority

| Role | Responsibility | MUST | MUST NOT |
|---|---|---|---|
| **Founder / Product Owner** | Product direction, category, narrative, locked components, deployment approval, Definition of Done | Approve or reject all public-facing changes; define missions | Delegate product direction to engineering or AI without explicit written mission |
| **CTO** | Technical direction aligned with product; architecture within Founder vision; release readiness | Align engineering with product constitution; enforce quality gate | Redefine product category, narrative, or customer journey |
| **Engineering** | Implement approved missions; produce evidence; maintain quality | Build to spec; attach screenshots; report PASS/FAIL honestly | Change product direction; modify locked components; mark work Complete without PO approval |
| **AI Agents** | Execute missions under this constitution; produce verifiable evidence | Read this document first; follow quality gate; optimize for clarity and trust | Override Product Owner decisions; deploy without authorization; claim PASS without evidence |

**Product direction belongs only to Founder + CTO.**  
**Engineering implements.**  
**Engineering does not redefine the product.**

---

## 2. Product Principles

These principles are **mandatory**. Violation is **FAIL**.

| # | Principle |
|---|---|
| 1 | **EXECUTIA® is a brand.** The registered mark is part of identity, not decoration. |
| 2 | **EXECUTIA® is never a navigation item.** The brand appears as wordmark or logo — never as a nav pill alongside ENTRY, ENGINE, PILOT, ONE. |
| 3 | **No black backgrounds.** Public surfaces use approved palettes (e.g. Deep Ocean, enterprise light shells). Pure `#000000` page backgrounds are prohibited. |
| 4 | **Enterprise-first design.** Calm, authoritative, minimal. No startup gimmicks on public entry surfaces. |
| 5 | **One message per screen.** Each screen earns one realization or one action — not a feature list. |
| 6 | **Recognition before explanation.** The visitor must feel the problem before reading the solution. |
| 7 | **Visibility before governance.** Show where execution breaks before explaining how EXECUTIA governs. |
| 8 | **Governance before autonomy.** Autonomy is earned only after visibility and governance are understood. |
| 9 | **Reduce complexity.** Every implementation must reduce complexity. If a solution adds explanations, documentation, or UI instead of reducing user complexity, it is the wrong solution. EXECUTIA removes complexity — it never relocates it. |

---

## 3. Customer Journey

The customer journey **IS** permanent. Each environment serves **exactly one stage**.

```
Recognition
    ↓
Understanding
    ↓
Validation
    ↓
Operation
```

Mapped permanently to:

```
ENTRY
    ↓
ENGINE
    ↓
PILOT
    ↓
ONE
```

| Stage | Environment | Purpose |
|---|---|---|
| Recognition | **ENTRY** | Visitor recognizes they have an execution visibility problem |
| Understanding | **ENGINE** | Visitor understands how governed execution works |
| Validation | **PILOT** | Organization validates EXECUTIA in a controlled pilot |
| Operation | **ONE** | Organization operates on the Execution Platform daily |

A page **MUST NOT** serve multiple journey stages. Mixed-stage surfaces are **FAIL**.

---

## 4. Narrative

The permanent story **IS**:

> Organizations do not fail because people stop working.  
> Organizations fail because execution becomes invisible.

The homepage exists to create **one realization**:

> **"We don't have an execution problem.  
> We have an execution visibility problem."**

All public ENTRY copy, hero narratives, and story films **MUST** serve this realization.  
Copy that reframes the category as governance-only, AI-only, or ERP-adjacent **MUST NOT** ship without Product Owner mission approval.

---

## 5. Locked Components

**Locked Components** cannot change without an explicit mission approved by the Product Owner.

| Component | Scope |
|---|---|
| **Header** | Platform header layout, spacing, nav items, brand placement |
| **Footer** | ENTRY footer structure, links, legal strip |
| **Hero** | ENTRY hero layout, palette, headline system, demonstration panel |
| **Logo** | EXECUTIA® wordmark, mark, and ® usage |
| **Brand palette** | Approved color tokens for public surfaces |
| **Typography** | Approved type scale and weights for public surfaces |

To change a Locked Component:

1. Product Owner issues an explicit mission (e.g. MISSION-007D).
2. Before/after evidence **MUST** include side-by-side comparison.
3. Product Owner approval **MUST** be recorded before the change is marked Done.
4. Until approval: status **MUST** remain **Review Ready** — not PASS, not Complete.

---

## 6. Quality Gate

**Mandatory before any deployment affecting executia.io.**

No task **MAY** be marked **COMPLETE** unless **ALL** conditions are satisfied:

| # | Condition |
|---|---|
| 1 | Preview available |
| 2 | Product Owner **can access** preview (not localhost-only without alternative) |
| 3 | Evidence attached |
| 4 | Screenshots attached |
| 5 | QA completed with requirement-by-requirement PASS / FAIL |
| 6 | Product Owner approval recorded |

**Simplicity rule:** One mission · one preview · one comparison · one QA table · one Product Owner decision.

**Verification rule:** Evidence is screenshots and side-by-side comparison — not code, commits, or builds.

**Status rule:** If **ANY** required condition is false:

- **Overall Status = FAIL**
- **Deployment prohibited**
- Agents **MUST NOT** write: Complete, Fixed, Restored, Ready, Production Ready

**Product Owner rule:** If the Product Owner requested *"Restore the approved header"*, anything visually different = **FAIL**. Partial PASS is not allowed for explicit Product Owner requirements.

---

## 7. Deployment Rules

| Rule | Requirement |
|---|---|
| Production | **No production deployment** without explicit Product Owner approval |
| Preview | Preview deployments **MAY** be used for PO review; **MUST** be PO-accessible |
| Evidence | Deployment SHA or Vercel Deployment ID **MUST** be recorded when deployed |
| Prohibited | Agents **MUST NOT** deploy because implementation "looks correct" |

---

## 8. Definition of Done

**Done** means:

> The Product Owner has reviewed the implementation and approved it.

Nothing else qualifies as Done.

| Status | Meaning |
|---|---|
| **Review Ready** | Evidence attached; awaiting PO review |
| **FAIL** | One or more requirements or quality gate checks failed |
| **PASS** | PO explicitly approved after reviewing evidence |
| **Done** | PO signed off — equivalent to PASS with deployment authorization if requested |

Code merged, builds green, and agent confidence **DO NOT** constitute Done.

---

## 9. AI Rules

Every AI agent working on EXECUTIA **MUST**:

1. **Read** `/governance/EXECUTIA_CONSTITUTION.md` before implementation.
2. **Never override** Product Owner decisions.
3. **Never change** Locked Components without authorization.
4. **Never optimize** for more code, features, or abstraction (see §2.9).

Agents **MUST NOT**:

- Mark missions Complete without PO approval
- Use localhost URLs as PO review evidence without stating local-only limitation
- Claim "restored" or "matches baseline" without side-by-side screenshot against approved commit
- Introduce Variant labels (A/B/C) as shipped product without PO selection mission
- Redefine navigation, narrative, or journey architecture without mission

---

## 10. Repository Integration

This document **MUST** be referenced by:

| File | Requirement |
|---|---|
| `AGENTS.md` | First instruction: read this constitution |
| `.cursor/rules/` | Always-applied rule requiring constitution compliance |
| Mission evidence docs | Reference constitution sections violated or satisfied |

When amending this constitution, Product Owner approval **IS REQUIRED**.

---

## Amendment

| Version | Date | Change | Approved by |
|---|---|---|---|
| 1.0 | 2026-07-11 | Initial constitution — MISSION-001 | Pending Product Owner approval |

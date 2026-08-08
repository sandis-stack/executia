# EXECUTIA Execution Inbox Constitution v1.0

**Status:** Permanent constitutional document  
**Scope:** Shared execution interaction model for LIFE, ONE, and GOV  
**Authority:** Governs every future Inbox design and engineering decision across EXECUTIA products  
**Not:** A LIFE-only document · not a UI specification · not an implementation plan  
**Date:** 2026-08-08  

The Execution Inbox is the primary human interface to the EXECUTIA Engine.

---

## 1. Mission

People should never manage processes.  
People should only make decisions.

The Engine executes everything else.

---

## 2. Purpose

The Execution Inbox is the universal interaction model for EXECUTIA.

It is the place where human judgement meets automated execution.

The Inbox is **not**:

- a task manager  
- an email inbox  
- a notification centre  

Those metaphors manage work, messages, or interruptions.  
The Execution Inbox surfaces only what requires human judgement — and shows execution as it completes.

---

## 3. Core Principle

Every execution object follows exactly one lifecycle:

```
Arrives
    ↓
Needs Decision (only if required)
    ↓
Engine Executes
    ↓
Execution Complete
    ↓
Archived
```

The lifecycle never changes.  
Only the execution object changes.

If a design invents a second lifecycle, parallel workflow language, or a permanent “in progress with the person” state that is not a decision, it violates this constitution.

---

## 4. Execution Objects

The Engine remains identical.  
Only execution objects differ by product surface.

### LIFE

- Invoice  
- Receipt  
- Payment  
- Income  
- Expense  
- Subscription  

### ONE

- Purchase Order  
- Invoice  
- Contract  
- Project  
- Approval  
- Employee Request  
- Asset  

### GOV

- Permit  
- Application  
- Inspection  
- Procurement  
- Tax Declaration  
- Public Record  

Objects may grow over time.  
The Inbox model must not.

---

## 5. Inbox States

Only three visible states exist.

### Needs Decision

Human judgement is required.  
Nothing else about this object waits on the person except that decision.

### Executing

The Engine is completing execution.  
The person is not managing steps.  
They may observe completion; they do not operate a process.

### Complete

Execution finished.  
Evidence preserved.  
Nothing left to do.

No fourth primary state.  
No “waiting on system” theatre.  
No task backlog disguised as status.

---

## 6. Decision Principle

The Inbox is never a task list.  
It is a **decision list**.

| Belongs to | Content |
|---|---|
| **People** | Decisions that require human judgement |
| **Engine** | Tasks, steps, routing, filing, reconciliation, consequence propagation |

If an item asks a person to perform work the Engine could complete, it must not appear as Inbox work.

---

## 7. Automation Principle

Everything that can be automated should disappear.  
Everything requiring judgement should surface.

Absence of an item is success when no judgement is needed.  
Presence of an item is justified only by genuine ambiguity, authority, or approval that a person alone can resolve.

---

## 8. Experience Principle

Opening the Inbox should answer one question only:

> **What needs my attention?**

Nothing more.  
Nothing less.

Not: what is interesting.  
Not: what the product can do.  
Not: what happened everywhere.  
Only: what still requires this person’s judgement — and, when relevant, what is completing or already complete for closure and trust.

---

## 9. Silence Principle

When no decision is required, the Inbox should remain quiet.

Silence indicates health.  
Noise indicates uncertainty.

Alerts, badges, and activity streams that compete for attention without a decision violate this principle.

---

## 10. Completion Principle

**Execution Complete** means:

- Evidence exists  
- Consequences have propagated  
- Nothing remains to reconcile  
- Nothing remains to remember  

Complete is not “filed somewhere.”  
Complete is residue-free.

---

## 11. Scaling Principle

```
LIFE
 ↓
ONE
 ↓
GOV
```

must all use the same Inbox model.

Only execution objects evolve.  
The interaction model never changes.

A designer moving from LIFE to ONE or GOV should recognize the same Inbox — not learn a new product category.

---

## 12. Lifecycle Diagram

```
                    ┌─────────────┐
                    │   Arrives   │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │ Decision required?      │
              └────────────┬────────────┘
                     yes/no│
            ┌──────────────┼──────────────┐
            │ yes          │              │ no
            ▼              │              ▼
   ┌────────────────┐      │     ┌────────────────┐
   │ Needs Decision │      │     │Engine Executes │
   └────────┬───────┘      │     └────────┬───────┘
            │ decide       │              │
            ▼              │              │
   ┌────────────────┐      │              │
   │Engine Executes │◄─────┘              │
   └────────┬───────┘                     │
            │                             │
            └──────────────┬──────────────┘
                           ▼
                  ┌─────────────────┐
                  │Execution Complete│
                  └────────┬────────┘
                           ▼
                  ┌─────────────────┐
                  │    Archived     │
                  └─────────────────┘
```

Visible to people primarily as: **Needs Decision** · **Executing** · **Complete**.  
Arrives and Archived are lifecycle facts; they do not invent extra Inbox modes.

---

## 13. Relationship to LIFE / ONE / GOV

| Layer | Role relative to the Inbox |
|---|---|
| **ENTRY** | Explains why execution integrity matters |
| **ENGINE** | Defines verification, evidence, governance, and consequence logic |
| **Execution Inbox** | Primary human interface to the Engine — shared across products |
| **LIFE** | Personal execution objects in the same Inbox |
| **ONE** | Enterprise execution objects in the same Inbox |
| **GOV** | Public-sector execution objects in the same Inbox |

LIFE proofs (purchase, invoice) are early demonstrations of objects moving through this Inbox lifecycle.  
They are not a separate interaction philosophy.

---

## 14. Success Metric

The ideal end of every day is:

```
Needs Decision    0
Executing         0
Complete          Today finished.
```

That is health.  
A full Inbox at day’s end is not productivity — it is unresolved judgement or incomplete execution.

---

## 15. Product Test

Before adding any Inbox feature, ask:

> **Does this reduce administration by replacing process management with decision making?**

If no,  
**do not build it.**

---

*EXECUTIA Execution Inbox Constitution v1.0 — permanent. After this document, philosophy is closed; product construction proceeds from this model.*

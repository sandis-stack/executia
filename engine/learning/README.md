# Engine · Learning v0.1

Deterministic execution learning from **confirmed** truth only.

Purpose: silence — not intelligence, not chat, not ML infrastructure.

## Principle

People should never answer the same administrative question twice unless reality has changed.

## Modules

| File | Role |
|---|---|
| `rules-store.js` | Persist learned rules (Engine-owned) |
| `confidence.js` | Confidence, bands, strengthen / contradict |
| `supplier-learning.js` | Supplier / merchant / context / counterparty |
| `classification-learning.js` | Category, VAT, payment, recurring |
| `index.js` | Apply + confirm orchestration |

## Product test

Before storing: *Will this confirmation reduce future administration?*  
If not — do not store (holds, unknown-supplier accepts, resumes).

## Decision rule

| Band | Behaviour |
|---|---|
| High (≥ 0.85) | Do not interrupt |
| Medium (≥ 0.55) | Do not interrupt (optional verify deferred) |
| Low | Needs Decision |

## Core Laws

Learning belongs to the Engine. No adapter coupling.

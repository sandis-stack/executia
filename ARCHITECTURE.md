# EXECUTIA Repository Architecture

Technical map of the repository. Beliefs live in `/core`. This file describes structure only.

```
Core
  ↓
Engine
  ↓
Adapters
  ↓
Apps
```

**Proofs** validate behaviour.  
**Governance** applies Core.  
**Schemas** define shared execution objects.

---

## Layers

| Path | Role |
|---|---|
| `/core` | Immutable platform beliefs and principles |
| `/engine` | Execution truth — decisions, evidence, rules, synchronization, objects |
| `/adapters` | Capability boundaries to external systems (no business decisions) |
| `/schemas` | Canonical execution-object contracts (LIFE / ONE / GOV) |
| `/apps` | Product surfaces — LIFE, ONE, GOV, shared |
| `/proofs` | Constrained demonstrations of Core + Engine behaviour |
| `/governance` | Constitutions and standards that apply Core |

---

## Rules

1. The Engine never depends on an external system.  
2. External systems connect only through adapters.  
3. Adapters contain no business decisions.  
4. Apps consume Engine + schemas; they do not own execution truth.  
5. Proofs must not duplicate Engine logic as a second product.

See `/core/PRINCIPLES.md` Core Laws for the permanent statement of (1)–(3).

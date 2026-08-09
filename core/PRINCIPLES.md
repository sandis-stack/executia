# EXECUTIA Principles

**Status:** Immutable  
**Location:** `/core/PRINCIPLES.md`  

These principles govern every product surface — LIFE, ONE, GOV — and every feature proposal.

---

1. **People never manage processes.**  
   Process management is Engine work.

2. **People make decisions.**  
   Only genuine human judgement surfaces.

3. **The Engine executes.**  
   Verification, evidence, governance, and consequence propagation belong to the Engine.

4. **Administration should disappear.**  
   Everything that can be automated must not remain as human work.

5. **Evidence should preserve itself.**  
   Proof of what happened is captured and bound — not reconstructed later from memory.

6. **Execution should leave no residue.**  
   Complete means nothing left to reconcile, re-enter, or remember.

7. **Silence means health.**  
   When no decision is required, the system does not compete for attention.

8. **Trust comes from completion.**  
   Not from notifications, dashboards, or activity noise.

9. **Everything should become simpler over time.**  
   Complexity is failure. More screens are not progress.

10. **No feature may increase administrative work.**  
    If a proposal adds process management for people, it is rejected — regardless of demand or revenue.

11. **External systems are replaceable. The Engine is not.**  
    The Engine never depends on an external system.  
    External systems depend on adapters.  
    Adapters isolate change.  
    The Engine remains stable.

---

## External systems and adapters

Banks change.  
Accounting systems change.  
Governments change.  
Tax rules change.  
Email providers change.  
Calendars change.  
Document storage changes.

The Engine must not.

The Engine communicates only through adapters.  
Every external platform is an implementation detail.  
Never a dependency.

### Architectural rule

Never allow business logic inside an adapter.

Adapters only:

- receive information  
- normalize information  
- send information  
- receive responses  

All decisions belong to the Engine.

### Examples

```
Gmail            → Email Adapter        → Engine
Outlook          → Email Adapter        → Engine
Fiken            → Accounting Adapter   → Engine
Tripletex        → Accounting Adapter   → Engine
DNB              → Bank Adapter         → Engine
Google Calendar  → Calendar Adapter     → Engine
```

### Replacement rule

Replacing Fiken with another accounting platform must require changing only the Accounting Adapter.  
Never the Engine.

Replacing Gmail must require changing only the Email Adapter.  
Never the Engine.

Replacing a bank must require changing only the Bank Adapter.  
Never the Engine.

### Adapter product test

If removing an external platform requires changing the Engine,  
the architecture is wrong.

### Success

The Engine should be able to survive for decades,  
while external systems evolve around it.

---

## Test

Before any feature ships, ask:

> Does this reduce administration while increasing execution integrity?

If no — do not build it.

Before any integration ships, ask:

> Can this external platform be removed without changing the Engine?

If no — the architecture is wrong.

Core never changes to justify a feature.

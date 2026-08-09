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

11. **People experience events.**  
    The Engine executes consequences.

---

## Core Laws

These are platform laws.  
They must never be changed to accommodate implementation.  
Implementation must adapt to the laws.

### Core Law 1 — External systems are replaceable. The Engine is not.

The Engine never depends on an external system.  
External systems connect through adapters.  
Adapters isolate change.  
The Engine remains stable.

#### Why

Banks evolve.  
Accounting platforms evolve.  
Governments evolve.  
Tax regulations evolve.  
Email providers evolve.  
Calendars evolve.  
AI models evolve.

The Engine must remain independent.

#### Architectural rule

Adapters never contain business logic.

Adapters only:

- receive events  
- normalize data  
- deliver data  
- synchronize results  

Every decision belongs to the Engine.

### Core Law 2 — The Engine owns truth. External systems own synchronization.

The Engine is the single source of execution truth.

External systems are:

- event sources  
- execution destinations  
- synchronization endpoints  

Never the source of truth.

#### Examples

```
Email
  → Email Adapter
  → Engine
  → Execution Truth
  → Accounting Adapter
  → Fiken

Receipt
  → Camera
  → Evidence Adapter
  → Engine
  → Execution Truth
  → Archive
  → Government
```

#### Synchronization rule

External systems may become unavailable.  
The Engine must continue to preserve truth.

Synchronization happens when available.  
Truth never depends on synchronization.

#### Replacement rule

Replacing any external platform must require changing only its adapter.  
Never the Engine.

#### Future rule

The Engine must survive technology generations.  
Adapters are expected to change.  
The Engine is expected to endure.

#### Integration product test

Ask before every integration:

> If this external system disappeared tomorrow,  
> would the Engine still understand reality?

If not,  
the architecture is wrong.

### Core Law 3 — The Engine executes intent, not interfaces.

A person expresses intent.  
The Engine determines execution.  
Adapters communicate with external systems.

The person must never be required to think in terms of:

- Fiken  
- Skatteetaten  
- bank APIs  
- email systems  
- accounting interfaces  
- government portals  
- technical workflows  

Those are implementation details.

#### Example

Wrong:

> “Create this invoice entry in Fiken.”

Correct:

> “Pay this invoice.”

The Engine then determines what must follow:

- validate evidence  
- classify the transaction  
- calculate tax consequences  
- update accounting truth  
- schedule or execute payment  
- update cashflow  
- update forecast  
- synchronize with accounting systems  
- synchronize with government systems when required  
- preserve evidence  
- complete execution  

The person expresses one intent.  
The Engine owns the execution path.

#### Separation of responsibility

```
PERSON
  Defines intent.
    ↓
ENGINE
  Determines and governs execution.
    ↓
ADAPTERS
  Communicate with external systems.
```

#### Interface independence

Human intent must remain valid even if external systems change.

Example:

> “Pay this invoice”

must mean the same thing whether accounting uses Fiken, Tripletex, Visma, Xero,  
or a future system that does not exist today.

The intent is stable.  
Interfaces are replaceable.

#### Product rule

Never expose an external system’s workflow as the LIFE workflow.  
LIFE should express human intent.  
Adapters should absorb external complexity.

#### Architecture test

Ask:

> If we replaced every external system tomorrow,  
> would the person’s intent and the Engine’s execution model remain unchanged?

If no,  
the architecture is wrong.

### Core Law 4 — People experience events. The Engine executes consequences.

People naturally understand reality as events.

Examples:

- “I bought fuel.”  
- “I received my salary.”  
- “I signed a contract.”  
- “I moved house.”  
- “I received an invoice.”  

The Engine never experiences events.  
The Engine receives execution objects and performs every required consequence.

Examples:

- evidence  
- classification  
- payment  
- tax  
- forecast  
- accounting  
- compliance  
- archive  
- truth  
- completion  

People experience events.  
The Engine executes consequences.

#### Architectural consequence

Every product built on EXECUTIA must follow:

```
Reality
  ↓
Event
  ↓
Execution Object
  ↓
Engine
  ↓
Consequences
  ↓
Truth
  ↓
Complete
```

Never expose Engine modules as the primary human mental model.

People should never think in:

- Tax  
- Accounting  
- Document Layer  
- Finance Module  

Instead they think:

- “I bought fuel.”  
- “I paid an invoice.”  
- “I received income.”  

The Engine transforms those events into execution.

#### Relationship to existing Core

This law complements but does not replace:

- Replace administration with execution.  
- The Engine owns truth.  
- External systems are replaceable.  
- The Engine never depends on external systems.  

No conflicts.

#### Product rule

LIFE, ONE, and GOV must present human events — not Engine modules — as the primary mental model.  
A team reading only Core must independently arrive at the same architecture.

#### Architecture test

Ask:

> Would a person describe this as an event in their life,  
> or as a module in the Engine?

If the product leads with modules,  
the architecture is wrong.

### How the Core Laws work together

| Law | Statement |
|---|---|
| **1** | External systems are replaceable. The Engine is not. |
| **2** | The Engine owns truth. External systems own synchronization. |
| **3** | The Engine executes intent. Adapters execute interfaces. |
| **4** | People experience events. The Engine executes consequences. |

```
Reality
  ↓
Event / Intent
  ↓
Execution Object
  ↓
Engine
  ↓
Consequences + Execution Truth
  ↓
Adapters
  ↓
External systems
  ↓
Complete
```

These laws should still be correct in twenty years,  
regardless of which banks, governments, accounting systems,  
AI providers, or communication platforms exist.

Core changes only if the philosophy changes.  
Technology changes around Core.

---

## Test

Before any feature ships, ask:

> Does this reduce administration while increasing execution integrity?

If no — do not build it.

Before any integration ships, ask:

> If this external system disappeared tomorrow, would the Engine still understand reality?

If no — the architecture is wrong.

Before any human workflow ships, ask:

> If we replaced every external system tomorrow, would the person’s intent and the Engine’s execution model remain unchanged?

If no — the architecture is wrong.

Before any product surface ships, ask:

> Would a person describe this as an event in their life, or as a module in the Engine?

If the product leads with modules — the architecture is wrong.

Core never changes to justify a feature.

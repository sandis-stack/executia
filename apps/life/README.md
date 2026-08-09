# App · LIFE

Personal execution surface — first living implementation of the Engine.

**Live path:** `/life` → `apps/life/index.html`

## What this is

Smallest real product: one invoice end-to-end through the Execution Inbox.

Primary navigation:

- Today
- Needs Decision
- Executing
- Complete

Default screen answers: **What needs my attention?**

## Architecture

```
Upload / camera
  → documents adapter (local evidence)
  → Engine invoice object + advanceInvoice()
  → human decision only when required
  → VAT / accounting / payment / forecast consequences (Engine)
  → accounting adapter (Fiken stub) + government stub
  → Execution Complete
```

Core Laws:

1. Engine never depends on external systems (adapters injected at the edge).
2. Engine owns truth; adapters own synchronization.
3. Engine executes intent, not interfaces.

## Ownership

| Location | Role |
|---|---|
| `apps/life/` | In-repo LIFE product foundation (this app) |
| `engine/` | Invoice object, decisions, execution flow |
| `adapters/` | Email / accounting / banking / calendar / government / documents |
| External `executia-life` | Separate Next.js product — not this surface |

## Stubbed / blocked

- Fiken: stub translator only — no API credentials
- Email ingestion: stub adapter (no Gmail coupling)
- Banking / calendar / government: stubs

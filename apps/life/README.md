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
  → AccountingIntent (Engine)
  → Fiken adapter synchronizes (when credentials present)
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

## Email intake

- Default provider: `adapters/email/local-mailbox` (fixtures)
- Gmail boundary: `adapters/email/gmail` — **blocked** without OAuth/API credentials
- LIFE is not an email client — only execution objects surface
- Check arrivals on Today (also runs automatically on open)

## Bank intake (payment truth)

- Default provider: `adapters/banking/local-bank` (fixtures)
- Open Banking boundary: `adapters/banking/open-banking` — **blocked** without credentials
- Engine matches bank events to obligations — no finance dashboard, no bank feed UI
- Quiet signal only: “Payment confirmed”
- Check arrivals also drains bank fixtures (automatic on open)

## Accounting sync (Fiken)

- Quiet signals only: “Accounting synchronized” / “Synchronization waiting”
- No Fiken screens, journals, or bookkeeping UI
- Credentials: `FIKEN_API_TOKEN` + `FIKEN_COMPANY_SLUG` (never committed)

## Stubbed / blocked

- Fiken live sync: blocked without API credentials (Engine truth still completes)
- Gmail live sync: adapter boundary ready, credentials not configured
- Open Banking live sync: adapter boundary ready, credentials not configured
- Calendar / government: stubs

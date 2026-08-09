# Adapter · Fiken (accounting) v0.1

Fiken is a **synchronization destination** only.

## Credentials (required for live sync)

Never commit secrets. Configure locally:

```bash
export FIKEN_API_TOKEN="..."
export FIKEN_COMPANY_SLUG="your-company-slug"
# optional
export FIKEN_EXPENSE_ACCOUNT="6800"
export FIKEN_BASE_URL="https://api.fiken.no/api/v2"
```

Or set `globalThis.__FIKEN_CONFIG__ = { token, companySlug }` / `localStorage['executia.fiken.config.v1']` for browser.

Missing credentials → sync status `failed` with `metadata.reason = credentials_missing`. Success is never faked.

## Responsibilities

- Authenticate
- Translate `AccountingIntent` → Fiken purchase
- Create/update purchase idempotently (`executionObjectId` → `purchaseId`)
- Attach evidence when bytes are available via `getEvidence` port
- Return normalized sync result (`synchronized` / `failed` / `requires_attention`)

No VAT decisions. No classification. No business/personal logic.

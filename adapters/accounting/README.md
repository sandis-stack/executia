# Adapter · accounting

Accounting platforms. Vendors under this capability, e.g. `fiken/`.

Current: `fiken/` — Fiken API v2 synchronization destination for Engine `AccountingIntent`.

- Live when `FIKEN_API_TOKEN` + `FIKEN_COMPANY_SLUG` are configured
- Missing credentials → `failed` / blocked (never faked success)
- Idempotent: `executionObjectId` → Fiken `purchaseId`

No business decisions. LIFE must not contain Fiken workflow logic.

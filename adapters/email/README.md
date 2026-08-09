# Adapter · email

Email is an **event source** only. No Engine business logic.

## Contract

See `contract.js` — `NormalizedEmailEvent`.

Provider-specific fields stay inside vendor adapters.

## Providers

| Path | Mode | Notes |
|---|---|---|
| `local-mailbox/` | fixture | Default production-path intake without live credentials |
| `gmail/` | blocked | Real boundary; OAuth/API credentials not configured |
| `stub.js` | stub | Empty receive (legacy) |

Do not fake a successful live Gmail connection.

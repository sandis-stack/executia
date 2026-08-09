# Adapter · banking

Banks synchronize **payment facts**. The Engine owns execution truth.

## Contract

See `contract.js` — `NormalizedBankTransaction`.

## Providers

| Path | Mode | Notes |
|---|---|---|
| `local-bank/` | fixture | Default payment-truth intake without live credentials |
| `open-banking/` | blocked | Real boundary; credentials not configured |
| `stub.js` | stub | Legacy empty sync |

Do not fake a successful live bank connection.

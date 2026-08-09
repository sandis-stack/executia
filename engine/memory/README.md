# Engine · Execution Memory v0.1

Learning remembers confirmed decisions.  
Memory remembers execution context.

## Mission

Remember enough administrative context so the same work never needs to be reconstructed.

## Memory vs Learning

| | Learning | Memory |
|---|---|---|
| Knows | Circle K → Business | Circle K → Business → Vehicle → Project → Cost centre → Recurring → Typical VAT → Payment method → Deadline behaviour |
| Purpose | Silence repeated questions | Restore full execution context |

## Objects

Supplier · Counterparty · Project · Vehicle · Property · Subscription · Customer · Employee

## Rules

1. Never ask again if context is known and confidence is high.  
2. Every completed execution enriches Memory.  
3. Memory is Engine-owned — adapters never own Memory.  
4. Memory is built only from confirmed execution — never assumptions.

## Modules

| File | Role |
|---|---|
| `memory-objects.js` | Memory object shapes |
| `memory-store.js` | Engine persistence |
| `restore.js` | Apply known context onto execution objects |
| `enrich.js` | Write confirmed context after decisions / completion |
| `index.js` | Public Engine API |

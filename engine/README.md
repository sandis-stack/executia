# EXECUTIA Engine

Home of execution truth.

The Engine owns decisions, evidence, rules, synchronization policy, and execution objects.  
It never depends on an external system.

---

## Domain folders

| Folder | Intended ownership |
|---|---|
| `decision/` | Decision and approval logic |
| `execution/` | Execution lifecycle and completion |
| `evidence/` | Evidence binding and preservation |
| `rules/` | Validation and governance rules |
| `synchronization/` | Sync policy toward adapters (truth stays here) |
| `objects/` | Execution-object behaviour at Engine layer |
| `learning/` | Confirmed-truth learning (silence over time) |

---

## Existing runtime inventory (not moved)

Moving live Engine code in this pass would risk production regressions. Ownership is documented here until an unambiguous migration.

| Location | Contents | Status |
|---|---|---|
| `packages/execution-engine-core/` | Packaged Engine modules (decision, evidence, validation, …) | **Canonical package candidate** — leave in place |
| `assets/vendor/execution-intelligence-core/` | Vendored Engine copy for site runtime | Leave in place (deployed with site) |
| `assets/living-engine/` | Living-engine orchestration / planning / prediction | Leave in place |
| `assets/execution-value-*.js` + related | Value calculator (product UI engine, not Inbox) | Leave in place |

No Engine logic was duplicated into `/engine` during structure normalization.  
Future moves must be one-way (no dual ownership) and covered by tests before cutover.

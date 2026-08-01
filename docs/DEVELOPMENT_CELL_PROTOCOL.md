# Development Cell Protocol

## Mandate

Every execution MUST produce a Development Cell assessment:

- observed failure (or none)
- repeated pattern
- missing rule
- proposed improvement
- evidence
- approval status: `NO_CHANGE` | `PROPOSED` | `REQUIRES_APPROVAL`

## Hard limit

The Development Cell MAY propose Constitution changes.  
It MUST NOT silently modify Core laws or unlock a `ConstitutionVersion`.

Proposals persist as `DevelopmentProposal` with `applied: false` until an explicit human/governance approval path (outside automatic runtime) applies them under a new version.

## Output shape (report field)

```json
{
  "finding": "string",
  "proposal": "string or null",
  "status": "NO_CHANGE | PROPOSED | REQUIRES_APPROVAL"
}
```

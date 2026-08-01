# Response Gate Protocol

## Sole delivery gateway

There is exactly one delivery gateway: **ResponseGate**.

Only `ResponseGate.deliver()` may return user-facing content. Pipeline internals return internal results only.

## Reject delivery unless all hold

1. Primary goal was loaded
2. Current task was identified
3. Goal alignment was classified
4. Pre-validation passed (`APPROVED` or `CORRECTED`)
5. Post-validation passed (`APPROVED` or `APPROVED_WITH_WARNINGS`)
6. Response contains no raw provider output
7. EXECUTIA report is complete
8. Progress is evidence-based **or** marked `NOT_MEASURABLE`
9. Next priority action exists
10. Execution ledger write succeeded

## Blocked deliveries

When gates fail, ResponseGate may still return a **blocked** payload that includes a complete report explaining the block — never raw provider envelopes, never invented progress percentages.

# Memory Protocol

## Principle

Do not rely only on AI conversation context. Persistent structured memory is authoritative.

## Required entities

| Entity | Purpose |
|---|---|
| ConstitutionVersion | Locked law set for an execution era |
| PrimaryGoal | Permanent primary result |
| GoalMilestone | Weighted milestones + acceptance criteria |
| DecisionRecord | Decisions taken during executions |
| CompletedExecution | Approved execution summaries |
| PendingTask | Unresolved work |
| Constraint | Hard limits that must be honored |
| ErrorRecord | Failures and blocks |
| CorrectionRecord | Correction attempts and outcomes |
| DevelopmentProposal | Cell proposals (never auto-applied to laws) |
| ExecutionState | Continuity pointer — latest approved state |

## Load order (every execution)

1. ConstitutionVersion (active, locked)
2. PrimaryGoal + milestones
3. ExecutionState (latest approved)
4. PendingTask, Constraint, DecisionRecord (recent)
5. ErrorRecord / CorrectionRecord relevant to continuity

## Write rules

- **Approved path:** update ExecutionState, CompletedExecution, PendingTask, DecisionRecord, progress evidence as applicable.
- **Blocked / failed path:** write ErrorRecord + ledger; do **not** invent progress or mark milestones complete.
- Memory updates that claim completion require evidence records.

## Continuity Law

New executions MUST seed context from `ExecutionState` (current objective, completed, remaining, next priority action). Restarting from empty context is forbidden when a prior approved state exists.

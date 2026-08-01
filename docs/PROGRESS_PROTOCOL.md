# Progress Protocol

## Deterministic Progress Engine

Progress MUST NOT be estimated by the language model.

Inputs only:

- milestone `weight`
- milestone `status`
- acceptance criteria
- evidence records

## Formulas

When milestones exist and measurement is possible:

```
overallProgressPercent = floor(100 * sum(weight of COMPLETED) / sum(all weights))
```

Task progress (optional): fraction of current-task-linked milestones completed by weight, or `null` when not attributable.

## NOT_MEASURABLE

If milestones are missing, weights are invalid (sum ≤ 0), or evidence is required but absent for claimed completion:

```
progressStatus: "NOT_MEASURABLE"
overallProgressPercent: null
taskProgressPercent: null
```

Never invent a percentage.

## Evidence rule

Marking a milestone complete requires a non-empty evidence record. Without evidence, status stays unchanged and progress does not increase.

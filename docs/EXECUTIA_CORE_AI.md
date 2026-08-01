# EXECUTIA Core AI

| Field | Value |
|---|---|
| **Package** | `packages/executia-core-ai` |
| **Role** | Provider-independent execution constitution, memory, validation, focus, learning, reporting |

## What it is

EXECUTIA Core AI makes any connected AI:

- preserve the primary goal permanently;
- never lose focus across requests;
- interpret every request relative to the goal;
- remember decisions, work, errors, constraints, and development direction;
- mandatorily pre- and post-validate;
- never expose unvalidated provider output;
- learn via Development Cell (propose only);
- continue from prior approved state;
- calculate progress only from milestones + evidence;
- include a mandatory EXECUTIA report in every delivered response.

## Pipeline

```
User Request
→ Load EXECUTIA Constitution
→ Load Persistent Goal and Execution Memory
→ Interpret Current Task
→ Determine Goal Alignment
→ Pre-Validation
→ Build Validated Execution Context
→ AI Provider Execution
→ Post-Validation
→ Correction Loop
→ Update Memory
→ Development Cell Analysis
→ Generate Mandatory EXECUTIA Report
→ ResponseGate → Deliver Verified Response
```

## Modules

ExecutiaConstitution · LawEngine · GoalMemory · ExecutionMemory · ContextAssembler · FocusEngine · TaskInterpreter · PreValidationEngine · ProviderAdapter · PostValidationEngine · CorrectionLoop · ProgressEngine · DevelopmentCell · ResponseGate · ExecutionLedger · ExecutiaReportBuilder

## Delivery rule

**Only ResponseGate** may return content to the user.

## Relationship to Life

`packages/executia-life` product UI is **postponed**. Core AI must work independently before any Life product work resumes.

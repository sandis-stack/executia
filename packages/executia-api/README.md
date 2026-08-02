# EXECUTIA Live API (`@executia/api`)

Minimal HTTP API that makes **EXECUTIA Core MVP 1.0** the only path to OpenAI.

## Architecture

```
Client
  → POST /execute (Bearer auth)
  → Zod request validation
  → executeCoreRequest (Core)
      → PRE → Focus → Development Cell → AI Executor
      → OpenAI Responses adapter (transport only)
      → POST → Progress → Development Update → User Response
  → HTTP response (Core result; never raw OpenAI)
```

Core is unchanged. The OpenAI adapter lives in this package and is invoked only through Core’s AI Executor.

## HTTP status mapping

| Code | Meaning |
|------|---------|
| 200 | APPROVED |
| 400 | Invalid request schema |
| 401 | Missing/invalid `EXECUTIA_API_KEY` |
| 409 | Clarification / context block (PRE, Development Cell, clarification) |
| 422 | Rejected (Focus / POST) |
| 502 | AI provider failure |
| 500 | Unexpected internal error |

## Local setup

### 1. Install dependencies

From repo root worktree:

```bash
cd packages/executia-core-ai
npm install
npx prisma generate
npx prisma db push   # requires DATABASE_URL

cd ../executia-api
npm install
```

### 2. Environment

Copy the example file (do not commit a real `.env`):

```bash
cp .env.example .env
```

Fill in:

- `DATABASE_URL` — same Postgres Core uses
- `EXECUTIA_API_KEY` — bearer token for clients
- `OPENAI_API_KEY` — server-side only (never send to client)
- `OPENAI_MODEL` — e.g. `gpt-4o-mini`
- `PORT` — default `3000`

### 3. Start API

```bash
cd packages/executia-api
npm start
```

### 4. Health check

```bash
curl -s http://127.0.0.1:3000/health
```

### 5. Execute (safe example)

```bash
curl -s http://127.0.0.1:3000/execute \
  -H "Authorization: Bearer $EXECUTIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mission": "Live EXECUTIA OpenAI Integration",
    "currentGoal": "Ship live /execute API",
    "currentFocus": "Prove /execute through Core only",
    "developmentCell": {
      "mission": "Live EXECUTIA OpenAI Integration",
      "currentGoal": "Ship live /execute API",
      "currentFocus": "Prove /execute through Core only",
      "completedTasks": ["PRE Validation", "Focus Validator"],
      "remainingTasks": ["POST Validation", "User Response"],
      "lessonsLearned": ["Adapter is transport only"],
      "openDecisions": ["Keep Core unchanged"],
      "knownRisks": ["Direct OpenAI calls"],
      "nextStep": "Run full HTTP pipeline"
    },
    "permissions": { "aiExecutionAllowed": true },
    "userRequest": "Advance Prove /execute through Core only for Live EXECUTIA OpenAI Integration"
  }'
```

## Tests

```bash
cd packages/executia-api && npm test && npm run typecheck
cd ../executia-core-ai && npm test
```

Automated tests use a mocked OpenAI provider. They do not call the real OpenAI API.

## OpenAPI

See `openapi.yaml` (`operationId: executeThroughExecutia`) for Custom GPT Action wiring.
Server URL placeholder: `https://api.executia.io`.

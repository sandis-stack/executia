# EXECUTIA — Payment Execution Control System

EXECUTIA is a payment execution control system that stops bad financial decisions before money leaves the company.

## Structure

```
executia-system/
├── public/          → UI layer (ENTRY / DEMO / REQUEST)
├── api/             → Serverless functions (Vercel)
├── lib/             → Execution engine
└── vercel.json      → Routing
```

## Core concept

```
INPUT → VALIDATION → DECISION → AUTHORIZATION → LEDGER
```

## API

```
POST /api/authorize-payment   → APPROVED / BLOCKED / REQUIRES_REVIEW
POST /api/send-email          → Decision notice delivery
GET  /api/status?id=...       → Execution status lookup
```

## Deployment

1. Push to GitHub
2. Import to Vercel
3. Set environment variables (see .env.example)
4. Deploy

## Environment

See `.env.example` for required variables.

---

EXECUTIA™ — PCT/IB2026/050141 — control@executia.io

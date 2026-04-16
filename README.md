# EXECUTIA — Payment Execution Control System

EXECUTIA is a payment execution control system that stops bad financial decisions before money leaves the company.

## Repo structure

```
/
├── index.html              ← Homepage (ENTRY)
├── execution.html          ← Execution engine / demo
├── request.html            ← Request access / pilot
├── status.html             ← Execution status lookup
├── protocol.html           ← Technical specification
├── institutional.html      ← Partner/institutional landing
├── financial.html          ← CFO layer
├── dashboard.html          ← Operator panel (protected)
├── 404.html                ← Error page
│
├── global.css              ← Design system
├── vercel.json             ← Routing + cache headers
├── package.json            ← Dependencies
├── supabase-setup.sql      ← DB schema (run in Supabase SQL Editor)
│
└── api/
    ├── send-email.js       ← Lead intake + dual email + Supabase insert
    ├── leads.js            ← Dashboard lead list (auth required)
    ├── lead-update.js      ← Status/notes update + operator activity log
    ├── lead-detail.js      ← Lead + merged timeline (lead_activity + operator_activity)
    ├── lead-activity.js    ← Activity log endpoint
    ├── authorize-payment.js← Risk validation → Supabase payment_gates
    ├── status.js           ← Execution ID lookup ← Supabase payment_gates
    └── lead-activity.js    ← Lead activity log endpoint
```

## Core concept

```
PAYMENT REQUEST → EXECUTIA VALIDATION → APPROVED / BLOCKED / REQUIRES_REVIEW
```

## API

```
POST /api/send-email        → Lead intake, dual email, Supabase insert
GET  /api/leads             → All leads (x-dashboard-key required)
POST /api/lead-update       → Status/notes update (x-dashboard-key required)
GET  /api/lead-detail       → Lead + timeline (x-dashboard-key required)
POST /api/authorize-payment → Risk validation → Supabase payment_gates
GET  /api/status?id=...     → Execution status lookup ← Supabase payment_gates
GET  /api/lead-activity      → Lead activity log (x-dashboard-key required)
```

## Environment variables (Vercel)

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
DASHBOARD_ACCESS_KEY
INTERNAL_NOTIFICATION_EMAIL
```

## Database (Supabase)

Run `supabase-setup.sql` in Supabase → SQL Editor to create:
- `leads` — main lead records
- `lead_activity` — system events (email sent, request received)
- `operator_activity` — operator actions (status changes, notes)

## Deployment

1. Push to GitHub
2. Import to Vercel → set environment variables
3. Run `supabase-setup.sql` in Supabase SQL Editor
4. Redeploy after ENV changes

## Architecture

All data lives in **Supabase** (no Firestore). Single unified data model:
- `payment_gates` — validation records (authorize-payment + status)
- `leads` — lead/contact records (send-email + dashboard)
- `lead_activity` — system events
- `operator_activity` — operator actions

---

EXECUTIA™ — PCT/IB2026/050141 — control@executia.io

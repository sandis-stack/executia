# EXECUTIA™ — DEPLOYMENT GUIDE

## GITHUB REPO STRUKTŪRA

```
executia/                          ← repo sakne
│
├── index.html                     ← Entry / Homepage
├── execution.html                 ← Core — control layer entry
├── request.html                   ← Control gate — intake
├── status.html                    ← Registry state view
├── institutional.html             ← Authority layer
├── operator.html                  ← Internal control console
├── global.css                     ← Design sistēma
│
├── vercel.json                    ← Route maping
├── package.json                   ← Dependencies
│
├── api/
│   ├── _shared-risk.js            ← SHARED ENGINE (verdict vienīgais avots)
│   ├── execute.js                 ← POST /api/execute
│   ├── request-validation.js      ← POST /api/request-validation
│   ├── status.js                  ← GET  /api/status
│   ├── operator-cases.js          ← GET  /api/operator/cases
│   ├── operator-case.js           ← GET  /api/operator/case
│   └── operator-update.js         ← POST /api/operator/update
│
├── engine/                        ← PHASE 2 — iesaldēts
│   ├── executia-condition-engine-v2.js
│   └── executia-orchestrator-v1.js
│
└── schema.sql                     ← Supabase — palaiž vienreiz
```

---

## 1. GITHUB

```bash
git init
git remote add origin https://github.com/USERNAME/executia.git

# .gitignore — PIRMS commit
echo ".env" >> .gitignore
echo "node_modules/" >> .gitignore
echo ".vercel/" >> .gitignore

git add .
git commit -m "EXECUTIA core system"
git push -u origin main
```

`SUPABASE_SERVICE_KEY` un visi secrets — tikai Vercel dashboard, nekad Git.

---

## 2. SUPABASE

1. **supabase.com** → New project → `executia`
2. Reģions: **EU (Frankfurt)** vai **UAE (Bahrain)**
3. **SQL Editor** → ieliec `schema.sql` → **Run**
4. Pārbaudi: `SELECT id, verdict, status FROM cases LIMIT 1;`
5. **Settings → API** → kopē `Project URL` + `service_role` key

---

## 3. RESEND

1. **resend.com** → Create API key
2. Domains → Add `executia.io` → pievieno DNS ierakstus
3. Bez domēna testēšanai: `to: delivered@resend.dev`

---

## 4. VERCEL

```bash
npm i -g vercel
vercel login
vercel --prod
```

Vai: **vercel.com** → New Project → Import from GitHub

### ENV MAINĪGIE

Vercel → Project → Settings → Environment Variables:

```
SUPABASE_URL          = https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY  = eyJ...
RESEND_API_KEY        = re_...
OPERATOR_EMAIL        = control@executia.io
OPERATOR_TOKEN        = [random secret, min 32 chars]
ALLOWED_ORIGIN        = https://executia.io
EMAIL_FROM            = EXECUTIA Control <control@executia.io>
```

Pēc ENV → **Redeploy**.

### CUSTOM DOMAIN

Vercel → Settings → Domains → `executia.io` → pievieno DNS.

---

## 5. ROUTE MAP

```
/                  → index.html
/execution         → execution.html
/request           → request.html
/status            → status.html
/institutional     → institutional.html
/operator          → operator.html

/api/execute             → api/execute.js
/api/request-validation  → api/request-validation.js
/api/status              → api/status.js
/api/operator/cases      → api/operator-cases.js
/api/operator/case       → api/operator-case.js
/api/operator/update     → api/operator-update.js
```

---

## 6. 10 TESTI PĒC DEPLOY

```bash
BASE=https://executia.io
TOKEN=TAVS_OPERATOR_TOKEN

# Execute
curl -X POST $BASE/api/execute \
  -H "Content-Type: application/json" \
  -d '{"processType":"payment","country":"Norway","value":"2000000","risk":"contract penalty","timeline":"6"}'

# Request (izmanto delivered@resend.dev pirms domēna verifikācijas)
curl -X POST $BASE/api/request-validation \
  -H "Content-Type: application/json" \
  -d '{"email":"delivered@resend.dev","name":"Test","company":"Test AS","processType":"Project Delivery","country":"Norway","value":"1000000","risk":"contract penalty","consequence":"delay liability"}'

# Status (ID no iepriekšējā)
curl "$BASE/api/status?id=REQ-XXXXXXXX"

# Operator
curl "$BASE/api/operator/cases?limit=5" -H "x-operator-token: $TOKEN"
```

**Manuālie testi:**
- [ ] Client email pienāk
- [ ] Operator email pienāk
- [ ] `/status?id=REQ-...` rāda pareizu verdict
- [ ] `/operator` → auth → case list → detail → APPROVE
- [ ] Mobile nav visās lapās

---

## 7. SISTĒMAS LIKUMI

```
cases tabula     = vienīgā patiesība
/api/status      = vienīgais publiskais reader
_shared-risk.js  = vienīgais verdict avots

Frontend         nedrīkst lasīt Supabase tieši
Operator API     darbojas caur /api/operator/*
engine/          iesaldēts līdz Phase 2
```

---

## 8. PHASE 2 (pēc pirmā pilota)

`engine/executia-condition-engine-v2.js` + `engine/executia-orchestrator-v1.js`

Pieslēdz tikai pēc:
- pirmais reālais pilots ir pabeigts
- `cases` tabula ir ar reāliem datiem
- operator review flow ir pārbaudīts dzīvē

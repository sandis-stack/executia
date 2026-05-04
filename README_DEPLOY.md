# EXECUTIA ENTRY — FINAL READY DEPLOY

Deploy target: `executia.io`

## What this package includes
- Locked EXECUTIA header and compact footer.
- Homepage funnel: ENTRY → EXECUTION LAYER → REQUEST.
- Full pages: Global, Institutional, Definition, Standard, Contact, Request.
- AI files: `llms.txt`, `robots.txt`, `sitemap.xml`.
- Hardened request API: no false success if email delivery is not confirmed.
- Live status strip with UTC time and rotating system states.
- No black backgrounds.

## Required Vercel environment variables
```bash
RESEND_API_KEY=
FROM_EMAIL=EXECUTIA <no-reply@mail.executia.io>
OPERATOR_EMAIL=control@executia.io
```

Optional engine forward:
```bash
ENGINE_REQUEST_TOKEN=
ENGINE_CONTROL_REQUEST_URL=https://execution.executia.io/api/v1/control-request
```

## Deploy
```bash
rm -rf *
unzip executia_ENTRY_FINAL_READY_DEPLOY.zip -d .
git add .
git commit -m "EXECUTIA ENTRY FINAL READY DEPLOY"
git push
```

## Post-deploy tests
- https://executia.io/
- https://executia.io/llms.txt
- https://executia.io/robots.txt
- https://executia.io/sitemap.xml
- https://executia.io/global
- https://executia.io/institutional
- https://executia.io/request
- Submit request form and confirm both applicant + operator emails.

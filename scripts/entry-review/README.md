# ENTRY automated review workflow

Public preview project (no Vercel SSO on production alias):

**https://executia-entry-review.vercel.app**

## One command

```bash
npm run review:entry
```

This will:
1. Deploy to `executia-entry-review` (public alias)
2. Verify HTTP 200 without authentication
3. Run ENTRY acceptance tests
4. Check routes/assets
5. Capture Playwright screenshots (desktop / tablet / mobile + sections + mobile nav)
6. Run a11y + performance probes (Lighthouse best-effort)
7. Write `evidence/entry-review/latest/REPORT.md`

## Commands

| Command | Purpose |
|---|---|
| `npm run review:entry` | Full publish + validate + screenshots + report |
| `npm run review:entry:publish` | Publish public preview only |
| `npm run review:entry:visual` | Screenshots only (`ENTRY_URL` required) |
| `npm run verify:preview` | Confirm URL is public (no SSO) |
| `npm run verify:production` | Post-approval checks against `https://executia.io` |

## Skip re-publish

```bash
ENTRY_SKIP_PUBLISH=1 ENTRY_URL=https://executia-entry-review.vercel.app npm run review:entry
```

## Evidence layout

```
evidence/entry-review/latest/          # most recent package
evidence/entry-review/YYYY-MM-DD-HHMM/ # timestamped archive
evidence/production-verification/YYYY-MM-DD-HHMM/
```

## Important

- Do **not** use deployment-hash `*.vercel.app` URLs for review — team SSO may protect them.
- Use the stable alias: `https://executia-entry-review.vercel.app`
- Production (`executia.io` / `executia-new`) is separate; promote only after explicit approval.

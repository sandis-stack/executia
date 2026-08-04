# ENTRY automated review workflow

Public preview (no Vercel SSO on production alias):

**https://executia-entry-review.vercel.app**

Public screenshot gallery (published every review):

**https://executia-entry-review-gallery.vercel.app**

## One command

```bash
npm run review:entry
```

This will:
1. Deploy ENTRY to `executia-entry-review` (public alias)
2. Verify HTTP 200 without authentication
3. Run ENTRY acceptance tests
4. Check routes/assets
5. Capture Playwright screenshots
6. **Publish screenshots to a public gallery URL** (required — review fails without it)
7. Run a11y + performance probes
8. Write report with **public HTTPS screenshot links only**

## Commands

| Command | Purpose |
|---|---|
| `npm run review:entry` | Full publish + validate + screenshots + public gallery + report |
| `npm run review:entry:publish` | Publish public preview only |
| `npm run review:entry:visual` | Screenshots + publish public gallery (`ENTRY_URL` required) |
| `npm run review:entry:gallery` | Re-publish existing screenshots to public gallery |
| `npm run verify:preview` | Confirm URL is public (no SSO) |
| `npm run verify:production` | Post-approval checks against `https://executia.io` |

## Skip re-publish of ENTRY

```bash
ENTRY_SKIP_PUBLISH=1 ENTRY_URL=https://executia-entry-review.vercel.app npm run review:entry
```

## Completeness rule

A review is complete only when another reviewer can open the **public gallery URL** and see the PNGs without local machine or Vercel login.

Never cite local `evidence/...` paths as the review deliverable.

# EXECUTIA website — deploy

Production host: `executia.io` (Vercel project `executia-new`).

## Release flow (TASK-35 / after TASK-29)

A push or merge into `main` **is** a production deploy (Vercel Git integration). Therefore:

1. Open a **pull request to `main`** with the approved SHA so GitHub runs `architecture-guard`.
2. **Preview** = the Vercel Git preview for that PR (open while signed in to Vercel). Check phone + desktop.
3. After an explicit **PO GO**, merge the PR. That merge is production.
4. Do **not** `git push` directly to `main` outside a PO GO (TASK-29’s direct push bypassed the required check).

Emergency CLI archive deploy (optional): `evidence/website-rounded-20261114/WEBSITE-DEPLOY.sh` — preview, then `--prod` with typed confirmation. The script never pushes git. It ignores a trailing `Aliased https://executia.io` line from Vercel CLI and keeps the `*.vercel.app` URL.

## What ships

`.vercelignore` excludes `evidence/`, `tools/`, and `*.md` so Git builds do not publish local paths. Site HTML does not link those files.

## Post-deploy checks

- https://executia.io/ and https://executia.io/engine return 200
- Wordmark shows EXECUTIA® (no ™)
- `/evidence/...` returns 404
- `/life` → 308 to https://life.executia.io

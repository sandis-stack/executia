# T21b-Q1 — `/life` → 308 to LIFE (CTO 2026-11-11 07:55)

Branch `fix/website-life-308-20261111`, stacked on TASK-21b (`fix/website-21b-20261111` @ 4336b40) so it ships with TASK-20/21.
Not pushed, not deployed.

## Change

`vercel.json`: the `/life` route no longer serves the old prototype (`/apps/life/index.html`). `/life`, `/life/` and the
prototype's own file URLs (`/apps/life`, `/apps/life/`, `/apps/life/index.html`) answer **308 → https://life.executia.io**.
No page, link or copy changed. `/life-proof` and `/invoice-proof` stay as they are. The prototype files stay in the repo.

**Destination:** the home "LIFE · Available now" card has no link (on this branch, on `origin/main` and on the TASK-20 branch).
The home page's one LIFE link is the header item `LIFE` → `https://life.executia.io`, the same address privacy and terms give.
The redirect uses that address.

## Proof (local)

`http-local.txt`, from the local route server (`evidence/website-og-20261110/tools/serve_vercel_routes.mjs`, applies `vercel.json`
routes in order):

```
/                        200
/life                    308 https://life.executia.io/
/life/                   308 https://life.executia.io/
/apps/life               308 https://life.executia.io/
/apps/life/              308 https://life.executia.io/
/apps/life/index.html    308 https://life.executia.io/
/apps/life/styles.css    200
/life-proof              200
/life-proof/             200
/invoice-proof           200
/engine                  200
```

Production is not checked (no deploy).

## Tests

- `npm test`: 53/53. New `tests/life-redirect.test.js` (9) reads the home LIFE link and checks that every `/life` path redirects
  there with 308, that `/life-proof` and `/invoice-proof` keep their pages, and that prototype assets are not redirected.
- Architecture guard on changed and untracked files: `ARCHITECTURE_GUARD_OK`. Guard tests: 14/14.

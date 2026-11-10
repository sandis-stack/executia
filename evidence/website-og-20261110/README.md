# TASK-20 — link previews and the registered mark (executia.io)

Branch `fix/website-og-20261110` from `origin/main` `072e272` (= production). Not pushed, not deployed.

## A. Open Graph
- `assets/brand/executia-og-1200x630-v2.png` and `assets/brand/executia-og-engine-1200x630.png`: the two provided images
  (2400×1254) scaled by 630/1254 with `sips`, then centre-cropped to 1200×630. That removes 2–3 px of background per side and
  nothing is stretched. `executia-og-1200x630.png` (old path) now holds the same image as `-v2` (sha256 identical), so old links
  show the new picture too; every page references `-v2` for the LinkedIn cache.
- Every routed page plus the four unrouted `.html` pages has all 10 tags (`og:title/description/url/type/image/image:width/
  image:height/image:alt`, `twitter:card/image`). `/engine` uses the engine image, all others the main image.
- `/`, `/engine`, `/request`: texts copied from the task. `/pilot`, `/one`, `/standard`, `/contact`: `<Page> — EXECUTIA®` and the
  lead sentence of the page. `/contact` drops "through the available contact channel below" (meaningless in a preview).
  Pages outside the task table: the existing `<title>` and `meta description`, nothing new.

## B. Registered mark
EXECUTIA™ → EXECUTIA® in every `<title>`, `og:title`, the `.brand-tm` wordmark (HTML, `platform-brand.js`,
`platform-nav.js`), the homepage film labels, one CSS comment and the two UI standard documents. The CSS is unchanged.

PO decision 14:40: Execution Integrity Model is registered too, so it now reads "Execution Integrity Model®" in the footer
(`platform-brand.js`) and in the homepage film label (`index.html`, `homepage-story-film.js`, both texts changed together so
the film's text comparison still matches). Aria-labels, code comments and governance documents were not changed.

The only ™ left (`after/grep-tm.txt`) are the 5 in `scripts/generate-eim-spec-pdf.py`. That file is the source of the spec PDF,
which switches to ® only with the next spec version (PO). The PDF and its generator are untouched.

## C. `execution.executia.io` → `https://executia.io/engine` (PO decision 14:40)
- `vercel.json`: the first route sends every path and method on host `execution.executia.io` to the fixed URL
  `https://executia.io/engine` (308, path not kept). `/test` and `/dashboard` now go straight to `https://executia.io/engine`
  (302 as before), so nothing bounces through the subdomain and nothing can loop.
- Links: "Open Execution Layer ↗" on `/global` (2), `/institutional` (2), `/definition` (1) and `/entry/legacy` (1) → `/engine`.
  "Request Controlled Execution" on `/institutional` (2) → `/request`, the same as on `/global` (PO in chat). The `/request`
  confirmation e-mail lists `ENGINE https://executia.io/engine`.
- `after/subdomain-redirect-local.txt`: the route table tested locally with `Host:` headers (`tools/serve_vercel_routes.mjs`
  now honours `has` host conditions).
- The route only takes effect once the domain is attached to this project; see the bridge report.

## Files
- `before/head-meta-{local,production}.{txt,json}`: the meta block of every page before the change (production = local `072e272`).
- `after/head-meta-local-http.{txt,json}`: the same block served over HTTP by `tools/serve_vercel_routes.mjs` (vercel.json routes).
- `after/checks.txt`: `tools/check_after.py`, 191 checks, 0 failures.
- `after/rendered-dom-marks.txt`: ™/® and links counted in the rendered DOM of 15 pages: no ™, no link to `execution.executia.io`.
- `after/grep-tm.txt`: grep proof.
- `screens/`: each OG image at 1200×630 (also the old path), the header at 1440 px and a 3× crop of the wordmark before/after.
- `tools/apply_mechanical.py`: the count-checked bulk replacement (image URL, alt, ™ → ®).

Website tests 44/44, architecture guard OK (14/14 tests).

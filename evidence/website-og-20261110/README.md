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

Intentional exceptions (`after/grep-tm.txt`, 6 occurrences):
- `assets/platform-brand.js:37` "Execution Integrity Model™": a separate mark. The registration covers EXECUTIA, and ® on an
  unregistered mark would be a false claim. PO to confirm.
- `scripts/generate-eim-spec-pdf.py` (5): the generator of the spec PDF, whose contents must not change. Left as is, and the
  PDF is untouched.

## Files
- `before/head-meta-{local,production}.{txt,json}`: the meta block of every page before the change (production = local `072e272`).
- `after/head-meta-local-http.{txt,json}`: the same block served over HTTP by `tools/serve_vercel_routes.mjs` (vercel.json routes).
- `after/checks.txt`: `tools/check_after.py`, 191 checks, 0 failures.
- `after/rendered-dom-marks.txt`: ™/® counted in the rendered DOM of 14 pages; the only ™ is Execution Integrity Model™.
- `after/grep-tm.txt`: grep proof.
- `screens/`: each OG image at 1200×630 (also the old path), the header at 1440 px and a 3× crop of the wordmark before/after.
- `tools/apply_mechanical.py`: the count-checked bulk replacement (image URL, alt, ™ → ®).

Website tests 44/44, architecture guard OK (14/14 tests).

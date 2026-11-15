#!/bin/bash
# Checks WEBSITE-DEPLOY.sh without Vercel or any network: vercel and curl are fakes, git is real but works on a temp clone of
# this repository whose origin is a local bare copy (ls-remote stays local). PATH holds nothing else outside /usr/bin:/bin.
# Each run gets its own folder; nothing is removed.
#   bash evidence/website-rounded-20261114/test-WEBSITE-DEPLOY-with-fakes.sh
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
script="${WEBSITE_DEPLOY:-$here/WEBSITE-DEPLOY.sh}"
repo="$(cd "$here/../.." && pwd)"
SHA=65029477a3b8dfa83738265e1070f2a136f73c69
LIVE=072e2726569b27e81b7404d7bda15fe0ce0d880a
ROLLBACK=dpl_9aocT1MUQr95bEd6Qz3yUrdmP2X9
H="$(mktemp -d)"
echo "harness: $H"
mkdir -p "$H/bin" "$H/home" "$H/site"
for t in python3 git; do ln -s "$(command -v "$t")" "$H/bin/$t"; done

common="$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir)"
git clone --quiet --no-checkout "$common" "$H/clone"
git clone --quiet --bare "$common" "$H/origin.git"
git -C "$H/origin.git" update-ref refs/heads/main "$LIVE"
MOVED="$(git -C "$H/origin.git" commit-tree "$LIVE^{tree}" -p "$LIVE" -m "someone else's commit on main")"
git -C "$H/clone" remote set-url origin "$H/origin.git"
mkdir -p "$H/clone/evidence/website-rounded-20261114"
cp "$script" "$H/clone/evidence/website-rounded-20261114/WEBSITE-DEPLOY.sh"
echo "local change that must not reach the deployment" > "$H/clone/dirty-marker.txt"
run_script="$H/clone/evidence/website-rounded-20261114/WEBSITE-DEPLOY.sh"
git -C "$repo" ls-tree -r --name-only "$SHA" | grep -vE '^evidence/' | grep -vE '(^|/)\.env' > "$H/expected-files.txt"
echo ".vercel/project.json" >> "$H/expected-files.txt"
sort -o "$H/expected-files.txt" "$H/expected-files.txt"
git -C "$repo" show "$SHA:index.html" > "$H/site/index.html"
git -C "$repo" show "$SHA:engine.html" > "$H/site/engine.html"

# Like Vercel CLI 65: `link --yes --project` writes .vercel/project.json and a .env.local holding VERCEL_OIDC_TOKEN;
# `inspect` prints its fields on stderr; a --prod deploy moves executia.io to the new deployment.
cat > "$H/bin/vercel" <<'S'
#!/bin/bash
echo "cwd=$PWD :: $*" >> "$HARNESS/vercel.log"
PREV=https://executia-new-prev123-executia.vercel.app
PROD=https://executia-new-prod123-executia.vercel.app
card() { printf '  General\n\n    id\t\t%s\n    name\t%s\n    target\t%s\n    status\t%s\n' "$1" "$2" "$3" "$4" >&2; }
case "$1" in
  whoami) echo someone ;;
  link)
    proj=""; while [ $# -gt 0 ]; do [ "$1" = --project ] && proj="$2"; shift; done
    mkdir -p .vercel
    printf '{"projectName":"%s","projectId":"prj_FAKEID9","orgId":"team_FAKEORG9"}\n' "${FAKE_LINK_NAME:-$proj}" > .vercel/project.json
    printf 'VERCEL_OIDC_TOKEN=oidc-SECRET9\n' > .env.local ;;
  deploy)
    printf '%s\n' "$@" > "$HARNESS/deploy-args.txt"
    (cd "$2" && find . -type f | sed 's#^\./##' | sort) > "$HARNESS/src-files.txt"
    [ -n "${FAKE_DEPLOY_FAIL:-}" ] && { echo "Error: Command \"npm install\" exited with 1" >&2; exit 1; }
    prod=no; for a in "$@"; do [ "$a" = --prod ] && prod=yes; done
    if [ "$prod" = yes ]; then
      [ -n "${FAKE_ALIAS_STUCK:-}" ] || echo dpl_new123 > "$HARNESS/domain-now"
      # CLI 65 order: Production line, *.vercel.app URL, then "Aliased https://executia.io" last.
      echo "Production: $PROD [40s]" >&2
      echo "$PROD"
      echo "Aliased https://executia.io"
    else
      echo "Preview: $PREV [40s]" >&2; echo "$PREV"
    fi ;;
  inspect)
    case "$2" in
      "$PREV") card dpl_prev123 executia-new "${FAKE_TARGET:-preview}" "${FAKE_STATUS:-● Ready}" ;;
      "$PROD") card dpl_new123 executia-new "${FAKE_TARGET:-production}" "${FAKE_STATUS:-● Ready}" ;;
      executia.io) card "$(cat "$HARNESS/domain-now" 2>/dev/null || echo "${FAKE_LIVE_ID:-dpl_9aocT1MUQr95bEd6Qz3yUrdmP2X9}")" "${FAKE_LIVE_NAME:-executia-new}" production "● Ready" ;;
      *) echo "Error: Can't find the deployment" >&2; exit 1 ;;
    esac ;;
  *) echo "unexpected: $*" >> "$HARNESS/unexpected.log"; exit 3 ;;
esac
S
# curl: -o <file> drops the body, -w prints %{http_code}; the live pages are the git files of APPROVED_SHA.
cat > "$H/bin/curl" <<'S'
#!/bin/bash
echo "$*" >> "$HARNESS/curl.log"
out=""; fmt=""; url=""
while [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift 2 ;; -w) fmt="$2"; shift 2 ;; --max-time) shift 2 ;; -s) shift ;; *) url="$1"; shift ;; esac; done
case "$url" in
  https://executia.io/) body="$HARNESS_SITE/index.html"; code=200
    [ -n "${FAKE_SERVED_OTHER:-}" ] && { printf '<!-- other build -->\n' > "$HARNESS/other.html"; cat "$body" >> "$HARNESS/other.html"; body="$HARNESS/other.html"; } ;;
  https://executia.io/engine) body="$HARNESS_SITE/engine.html"; code="${FAKE_ENGINE_CODE:-200}" ;;
  https://executia.io/assets/brand/*) body=/dev/null; code="${FAKE_OG_CODE:-200}" ;;
  https://execution.executia.io/*) body=/dev/null; code=404 ;;
  *) echo "unexpected curl $url" >> "$HARNESS/unexpected.log"; exit 6 ;;
esac
[ -n "$out" ] || cat "$body"
[ -z "$fmt" ] || printf '%s' "${fmt//%\{http_code\}/$code}"
S
chmod +x "$H/bin/"*

fails=0; n=0; R=""
check() { if eval "$2"; then echo "PASS $1"; else echo "FAIL $1"; fails=$((fails + 1)); fi; }
run() { # $1 script option ("" or --prod), $2 answers, rest: extra env
  n=$((n + 1)); R="$H/r$n"; mkdir -p "$R"; : > "$R/vercel.log"
  local opt="$1" answers="$2"; shift 2
  printf '%b' "$answers" | env -i HOME="$H/home" PATH="$H/bin:/usr/bin:/bin" HARNESS="$R" HARNESS_SITE="$H/site" \
    WEBSITE_KEEP_TMP=1 WEBSITE_ALIAS_WAIT=0 "$@" /bin/bash "$run_script" $opt > "$R/out.txt" 2>&1
  echo $? > "$R/exit"
  cat "$R/out.txt" >> "$H/out-all.txt"; cat "$R/vercel.log" >> "$H/vercel-all.log"
}
one_stop() { [ "$(cat "$R/exit")" = 1 ] && [ "$(grep -c '^STOP:' "$R/out.txt")" = 1 ] && grep -qF "STOP: $1" "$R/out.txt" && ! grep -q Traceback "$R/out.txt"; }
not_deployed() { [ ! -e "$R/deploy-args.txt" ]; }
no_ids() { ! grep -qE "prj_FAKEID9|team_FAKEORG9|oidc-SECRET9" "$R/out.txt"; }
GO='DEPLOY WEBSITE 6502947\n'

run '' ''
check "preview exits 0 and prints the preview URL" '[ "$(cat "$R/exit")" = 0 ] && grep -qx "Deployment URL: https://executia-new-prev123-executia.vercel.app" "$R/out.txt" && grep -q "^Preview ready" "$R/out.txt"'
check "preview: no --prod, team executia, meta commit = APPROVED_SHA and task=TASK-29, no env passed" '! grep -qx -- "--prod" "$R/deploy-args.txt" && grep -qx "commit=$SHA" "$R/deploy-args.txt" && grep -qx "task=TASK-29" "$R/deploy-args.txt" && [ "$(grep -A1 -x -- "--scope" "$R/deploy-args.txt" | tail -1)" = executia ] && ! grep -qxE -- "-e|--env|-b|--build-env" "$R/deploy-args.txt"'
check "copy = git tree of APPROVED_SHA without evidence/ and .env*, plus .vercel/project.json" 'diff -q "$H/expected-files.txt" "$R/src-files.txt" >/dev/null && grep -q "^Copy ready: 6502947 · $(wc -l < "$H/expected-files.txt" | tr -d " ") files" "$R/out.txt"'
check "link ran in its own folder: its .env.local (OIDC token) is not in the copy" 'grep -qE "^cwd=/.+/link :: link --yes --project executia-new --scope executia$" "$R/vercel.log" && ! grep -qE "(^|/)\.env" "$R/src-files.txt"'
check "local working-tree change does not reach the deployment" '! grep -q dirty-marker "$R/src-files.txt"'
check "origin/main = 072e272 shown; executia.io on executia-new = rollback target" 'grep -q "^origin/main = 072e272 (live today); 6502947 is 11 commits on top of it" "$R/out.txt" && grep -qx "executia.io → $ROLLBACK (project executia-new, 072e272) = the rollback target" "$R/out.txt"'
check "preview does no production check and no curl" '! grep -q "Production checks" "$R/out.txt" && [ ! -s "$R/curl.log" ]'
check "no project id, team id or OIDC token in the output" 'no_ids'

run --prod "$GO"
check "production exits 0, all checks passed" '[ "$(cat "$R/exit")" = 0 ] && grep -qx "RESULT: executia.io serves 6502947; all checks passed." "$R/out.txt"'
check "production: --prod, team executia, meta commit = APPROVED_SHA" 'grep -qx -- "--prod" "$R/deploy-args.txt" && grep -qx "commit=$SHA" "$R/deploy-args.txt" && [ "$(grep -A1 -x -- "--scope" "$R/deploy-args.txt" | tail -1)" = executia ]'
check "id, target production, status Ready printed" 'grep -qx "  id      dpl_new123" "$R/out.txt" && grep -qx "  target  production" "$R/out.txt" && grep -qx "  status  Ready" "$R/out.txt"'
check "prod URL parser ignores trailing Aliased https://executia.io" 'grep -qx "Deployment URL: https://executia-new-prod123-executia.vercel.app" "$R/out.txt" && ! grep -qx "Deployment URL: https://executia.io" "$R/out.txt"'
check "executia.io → the new deployment" 'grep -qx "executia.io → dpl_new123 (the new deployment)" "$R/out.txt"'
check "GET / and /engine 200, both og:image 200" 'grep -qx "GET https://executia.io/: 200" "$R/out.txt" && grep -qx "GET https://executia.io/engine: 200" "$R/out.txt" && [ "$(grep -cE "^  og:image https://executia.io/assets/brand/[a-z0-9-]+\.png: 200$" "$R/out.txt")" = 2 ]'
check "/ and /engine served bytes = git at 6502947" 'grep -qx "  / bytes = git index.html at 6502947" "$R/out.txt" && grep -qx "  /engine bytes = git engine.html at 6502947" "$R/out.txt"'
check "rollback printed, never run" 'grep -q "vercel rollback $ROLLBACK --scope executia" "$R/out.txt" && ! grep -qE ":: (rollback|promote|alias|env|domains|remove)" "$R/vercel.log"'
check "production output has no ids or token" 'no_ids'

run --prod 'DEPLOY 6502947\n'
check "confirmation not typed exactly → nothing deployed" 'one_stop "You did not type DEPLOY WEBSITE 6502947" && not_deployed'
run --extra ''
check "unknown option → STOP before anything" 'one_stop "unknown option" && [ ! -s "$R/vercel.log" ]'

git -C "$H/origin.git" update-ref refs/heads/main "$MOVED"
run --prod "$GO"
check "origin/main moved to a commit 6502947 lacks → STOP before deploy" 'one_stop "origin/main moved to ${MOVED:0:7}, which 6502947 does not contain" && not_deployed'
run '' ''
check "preview with origin/main moved → CHECK line, preview still made" '[ "$(cat "$R/exit")" = 0 ] && grep -q "^CHECK: origin/main moved to ${MOVED:0:7}" "$R/out.txt" && [ -e "$R/deploy-args.txt" ]'
git -C "$H/origin.git" update-ref refs/heads/main "$SHA"
run --prod "$GO"
check "origin/main = APPROVED_SHA is fine" '[ "$(cat "$R/exit")" = 0 ] && grep -qx "origin/main = 6502947" "$R/out.txt"'
git -C "$H/origin.git" update-ref refs/heads/main "$LIVE"
git -C "$H/clone" remote set-url origin "$H/missing.git"
run --prod "$GO"
check "origin unreachable → STOP for production" 'one_stop "Could not read origin/main" && not_deployed'
run '' ''
check "origin unreachable → shown only, preview made" '[ "$(cat "$R/exit")" = 0 ] && grep -q "^origin/main: unreachable" "$R/out.txt"'
git -C "$H/clone" remote set-url origin "$H/origin.git"

run --prod "$GO" FAKE_LIVE_NAME=executia-layer
check "executia.io on another project → STOP" 'one_stop "executia.io is served by project '"'"'executia-layer'"'"', not executia-new" && not_deployed'
run --prod "$GO" FAKE_LIVE_ID=dpl_other777
check "executia.io not on the rollback target → STOP for production" 'one_stop "executia.io serves dpl_other777, not $ROLLBACK" && not_deployed'
run '' '' FAKE_LIVE_ID=dpl_other777
check "executia.io not on the rollback target → CHECK for the preview" '[ "$(cat "$R/exit")" = 0 ] && grep -q "^CHECK: executia.io serves dpl_other777" "$R/out.txt"'
run --prod "$GO" FAKE_LINK_NAME=executia-layer
check "link to another project → STOP" 'one_stop "vercel link did not link project executia-new" && not_deployed'

run --prod "$GO" FAKE_DEPLOY_FAIL=1
check "deploy fails → one STOP line with the rollback" 'one_stop "vercel deploy --prod failed" && grep -q "vercel rollback $ROLLBACK" "$R/out.txt"'
run --prod "$GO" FAKE_TARGET=preview
check "target not production → STOP with the rollback" 'one_stop "target is '"'"'preview'"'"', not production" && grep -q "vercel rollback $ROLLBACK" "$R/out.txt"'
run --prod "$GO" 'FAKE_STATUS=● Error'
check "not Ready → STOP with the rollback" 'one_stop "the deployment is not Ready" && grep -q "vercel rollback $ROLLBACK" "$R/out.txt"'
run '' '' 'FAKE_STATUS=● Error'
check "preview not Ready → STOP" 'one_stop "The preview is not Ready"'
run --prod "$GO" FAKE_ALIAS_STUCK=1
check "executia.io still on the old deployment → CHECK, exit 1" '[ "$(cat "$R/exit")" = 1 ] && grep -q "^CHECK: executia.io → $ROLLBACK, not the new deployment dpl_new123" "$R/out.txt" && grep -q "^RESULT: 1 check(s) failed" "$R/out.txt"'
run --prod "$GO" FAKE_ENGINE_CODE=500
check "/engine 500 → CHECK, exit 1" '[ "$(cat "$R/exit")" = 1 ] && grep -qx "CHECK: GET https://executia.io/engine: 500 (expected 200)" "$R/out.txt"'
run --prod "$GO" FAKE_OG_CODE=404
check "og:image 404 → two CHECK lines" '[ "$(cat "$R/exit")" = 1 ] && [ "$(grep -c "^CHECK: og:image of " "$R/out.txt")" = 2 ]'
run --prod "$GO" FAKE_SERVED_OTHER=1
check "served / differs from git → CHECK" '[ "$(cat "$R/exit")" = 1 ] && grep -qx "CHECK: / served bytes differ from git index.html at 6502947" "$R/out.txt"'

check "vercel: only whoami, inspect, link, deploy in the whole suite" '! grep -vE ":: (whoami --scope executia|inspect (https://executia-new-(prev|prod)123-executia.vercel.app|executia.io) --scope executia|link --yes --project executia-new --scope executia|deploy /.+/src (--prod )?--scope executia --yes --meta commit=$SHA --meta task=TASK-29)$" "$H/vercel-all.log" && [ -z "$(ls "$H"/r*/unexpected.log 2>/dev/null)" ]'
check "no Python traceback in any run" '! grep -q Traceback "$H/out-all.txt"'

echo "$fails failed"
[ "$fails" = 0 ]

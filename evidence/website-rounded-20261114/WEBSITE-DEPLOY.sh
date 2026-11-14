#!/bin/bash
# TASK-35 — executia.io release helper (URL-parse fix + PR release flow). Sandis runs this; Cursor never runs vercel/push.
#
# Preferred release (CTO 2026-11-14 19:48):
#   1. Open a pull request to `main` with the approved SHA (architecture-guard must run on the PR).
#   2. Preview = the Vercel Git preview for that PR (open while signed in). Phone + desktop check.
#   3. After PO GO, merge the PR (ff/merge on GitHub). A push/merge to `main` = production deploy
#      (Vercel Git integration). Do not `git push` to main from a laptop outside that PO GO.
#   4. This script's CLI --prod path is the emergency/archive path only (git archive of APPROVED_SHA).
#
# Emergency CLI path (same as TASK-29, with URL-parse fix for "Aliased https://executia.io"):
#   bash …/evidence/website-rounded-20261114/WEBSITE-DEPLOY.sh          # preview archive deploy
#   bash …/evidence/website-rounded-20261114/WEBSITE-DEPLOY.sh --prod    # type DEPLOY WEBSITE <short>
#
# Sign in yourself first: `vercel login` (team executia). The script signs in to nothing, reads no secret and passes no env.
#
# What the CLI path does, in order. It stops at the first failure; nothing is deployed before step 2.
#   0. Checks: APPROVED_SHA (below) is in this repository; origin/main (git ls-remote) is shown; executia.io is served by
#      Vercel project executia-new, and for --prod by the deployment ROLLBACK_DPL.
#   1. `git archive` of exactly APPROVED_SHA into a private temp folder; evidence/ and .env* are left out.
#      `vercel link --yes --project executia-new` runs in a separate empty folder; only .vercel/project.json is copied.
#   2. Preview: `vercel deploy` (never --prod) → *.vercel.app URL, target, status. Stops.
#      --prod: `vercel deploy --prod`; picks the last *.vercel.app URL (ignores trailing "Aliased https://executia.io");
#      then checks Ready, domain, GET / and /engine, og:image, bytes = git.
#   3. Prints the rollback. It never runs it. It never pushes git.
#
# Optional env: VERCEL_SCOPE (default executia), WEBSITE_ALIAS_WAIT (seconds to wait for executia.io to move, default 60).
set -euo pipefail
umask 077

APPROVED_SHA=65029477a3b8dfa83738265e1070f2a136f73c69
LIVE_SHA=072e2726569b27e81b7404d7bda15fe0ce0d880a
PROJECT=executia-new
DOMAIN=executia.io
ROLLBACK_DPL=dpl_9aocT1MUQr95bEd6Qz3yUrdmP2X9

mode=preview
case "${1:-}" in
  "") ;;
  --prod) mode=production ;;
  *) echo "STOP: unknown option '$1'. Run without options for the preview, or with --prod for production."; exit 1 ;;
esac

here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
scope="${VERCEL_SCOPE:-executia}"
alias_wait="${WEBSITE_ALIAS_WAIT:-60}"
short="${APPROVED_SHA:0:7}"
log_dir="$HOME/EXECUTIA/scratch/website-release-20261114"
mkdir -p "$log_dir"
log="$log_dir/WEBSITE-DEPLOY-$mode-$(date +%Y%m%d-%H%M%S).txt"
exec > >(tee -a "$log") 2>&1

tmp=""
cleanup() { if [ -n "$tmp" ] && [ "${WEBSITE_KEEP_TMP:-}" != 1 ]; then rm -rf "$tmp"; fi; }
trap cleanup EXIT
trap 'echo; echo "Stopped by you. Nothing more is done."; exit 130' INT TERM

step() { echo; echo "== $*"; }
die() { echo "STOP: $*"; exit 1; }
rollback() {
  echo "Rollback (PO only): vercel rollback $ROLLBACK_DPL --scope $scope"
  echo "                    vercel rollback status --scope $scope"
  echo "  $ROLLBACK_DPL is 072e272, the deployment executia.io served before this release."
}
inspect_field() { # $1 inspect output, $2 field → value
  printf '%s\n' "$1" | grep -E "^[[:space:]]*$2[[:space:]]" | head -1 | sed -E "s/^[[:space:]]*$2[[:space:]]+//; s/^● //" || true
}
http_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$1" || true; }
og_image() { # $1 page URL → og:image URL from the served HTML
  curl -s --max-time 30 "$1" | python3 -c '
import re, sys
m = re.search(r"<meta[^>]+property=\"og:image\"[^>]+content=\"([^\"]+)\"", sys.stdin.read())
print(m.group(1) if m else "")' 2>/dev/null || true
}

# ---------------------------------------------------------------------------------------------------------------
step "0. Checks ($mode)"
for t in git tar python3 curl vercel shasum; do
  command -v "$t" >/dev/null || die "$t not found. Nothing was done."
done
vercel whoami --scope "$scope" >/dev/null 2>&1 || die "Not signed in to Vercel team $scope. Run 'vercel login' yourself. Nothing was done."
[ "$(git -C "$repo" cat-file -t "$APPROVED_SHA" 2>/dev/null || true)" = commit ] || die "Commit $APPROVED_SHA is not in this repository. Nothing was done."
echo "Commit: $(git -C "$repo" log -1 --format='%h %s' "$APPROVED_SHA" | cut -c1-110)"
echo "This checkout: HEAD $(git -C "$repo" rev-parse --short HEAD) · tracked changes $(git -C "$repo" status --porcelain --untracked-files=no | wc -l | tr -d ' ') (not used: the deployment is the archive of $short)"

origin_main="$(git -C "$repo" ls-remote origin refs/heads/main 2>/dev/null | awk 'NR==1 {print $1}' || true)"
if [ -z "$origin_main" ]; then
  [ "$mode" = production ] && die "Could not read origin/main (git ls-remote). Check the network and run again. Nothing was deployed."
  echo "origin/main: unreachable (shown only for the preview)"
elif [ "$origin_main" = "$LIVE_SHA" ]; then
  echo "origin/main = ${LIVE_SHA:0:7} (live today); $short is $(git -C "$repo" rev-list --count "$LIVE_SHA..$APPROVED_SHA") commits on top of it"
elif [ "$origin_main" = "$APPROVED_SHA" ]; then
  echo "origin/main = $short"
elif git -C "$repo" merge-base --is-ancestor "$origin_main" "$APPROVED_SHA" 2>/dev/null; then
  echo "origin/main = ${origin_main:0:7}, an ancestor of $short"
else
  [ "$mode" = production ] && die "origin/main moved to ${origin_main:0:7}, which $short does not contain. Tell the CTO (a rebase may be needed). Nothing was deployed."
  echo "CHECK: origin/main moved to ${origin_main:0:7}, which $short does not contain. Tell the CTO before step 2."
fi

live="$(vercel inspect "$DOMAIN" --scope "$scope" 2>&1 || true)"
live_name="$(inspect_field "$live" name)"
live_id="$(inspect_field "$live" id)"
[ "$live_name" = "$PROJECT" ] || die "$DOMAIN is served by project '${live_name:-?}', not $PROJECT. Nothing was deployed."
if [ "$live_id" = "$ROLLBACK_DPL" ]; then
  echo "$DOMAIN → $live_id (project $PROJECT, 072e272) = the rollback target"
elif [ "$mode" = production ]; then
  die "$DOMAIN serves ${live_id:-?}, not $ROLLBACK_DPL (072e272). Something was deployed since; tell the CTO. Nothing was deployed."
else
  echo "CHECK: $DOMAIN serves ${live_id:-?}, not $ROLLBACK_DPL (072e272). Tell the CTO before step 2."
fi

# ---------------------------------------------------------------------------------------------------------------
step "1. Clean copy of $short"
tmp="$(mktemp -d)"
chmod 700 "$tmp"
src="$tmp/src"
linkdir="$tmp/link"
mkdir -p "$src/.vercel" "$linkdir"
git -C "$repo" archive --format=tar "$APPROVED_SHA" -- . ':(exclude)evidence' ':(exclude,glob)**/.env*' | tar -x -C "$src"
(cd "$linkdir" && vercel link --yes --project "$PROJECT" --scope "$scope" >/dev/null 2>&1) \
  || die "vercel link --project $PROJECT failed. Nothing was deployed."
python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); sys.exit(0 if d.get("projectName")==sys.argv[2] and d.get("projectId") and d.get("orgId") else 1)' \
  "$linkdir/.vercel/project.json" "$PROJECT" 2>/dev/null || die "vercel link did not link project $PROJECT. Nothing was deployed."
cp "$linkdir/.vercel/project.json" "$src/.vercel/project.json"
files="$(find "$src" -type f | wc -l | tr -d ' ')"
expected="$(( $(git -C "$repo" ls-tree -r --name-only "$APPROVED_SHA" | grep -vE '^evidence/' | grep -vcE '(^|/)\.env' || true) + 1 ))"
[ "$files" = "$expected" ] || die "The copy has $files files, expected $expected. Nothing was deployed."
[ -z "$(find "$src" -name '.env*' -print -quit)" ] || die "A .env file is in the copy. Nothing was deployed."
echo "Copy ready: $short · $files files (incl. .vercel/project.json) · $(du -sh "$src" | cut -f1) · project $PROJECT"

# ---------------------------------------------------------------------------------------------------------------
if [ "$mode" = preview ]; then
  step "2. Preview deploy"
  deploy_out="$(vercel deploy "$src" --scope "$scope" --yes --meta "commit=$APPROVED_SHA" --meta "task=TASK-29")" \
    || die "vercel deploy (preview) failed (see above). Production is unchanged."
else
  step "2. Production deploy"
  echo "This deploys $short to PRODUCTION ($DOMAIN, project $PROJECT)."
  read -r -p "Type DEPLOY WEBSITE $short to continue: " answer
  [ "$answer" = "DEPLOY WEBSITE $short" ] || die "You did not type DEPLOY WEBSITE $short. Nothing was deployed."
  echo "Deploying. Build output follows; vercel waits until the deployment is Ready."
  deploy_out="$(vercel deploy "$src" --prod --scope "$scope" --yes --meta "commit=$APPROVED_SHA" --meta "task=TASK-29")" \
    || { echo "STOP: vercel deploy --prod failed (see above). $DOMAIN still serves $ROLLBACK_DPL unless Vercel says otherwise."; rollback; exit 1; }
fi
# Vercel CLI 65+ prints "Aliased https://executia.io" after a --prod deploy. That must not win over *.vercel.app.
url="$(printf '%s\n' "$deploy_out" | python3 -c '
import re, sys
text = sys.stdin.read()
vercel = re.findall(r"https://[a-z0-9.-]+\.vercel\.app", text)
print(vercel[-1] if vercel else "")' 2>/dev/null || true)"
case "$url" in
  https://*.vercel.app) ;;
  *) [ "$mode" = production ] && { echo "STOP: no deployment URL from vercel deploy. Check the dashboard."; rollback; exit 1; }
     die "Could not read a *.vercel.app URL from vercel deploy. Check the Vercel dashboard." ;;
esac
inspect="$(vercel inspect "$url" --scope "$scope" 2>&1 || true)"
dpl_id="$(inspect_field "$inspect" id)"
target="$(inspect_field "$inspect" target)"
status="$(inspect_field "$inspect" status)"
echo "Deployment URL: $url"
echo "  id      ${dpl_id:-?}"
echo "  target  ${target:-?}"
echo "  status  ${status:-?}"
echo "  commit  $APPROVED_SHA (meta commit=…)"

if [ "$mode" = preview ]; then
  [ "$target" = preview ] || die "Vercel reports target '${target:-?}' for the preview. Tell the CTO."
  [[ "$status" == *Ready* ]] || die "The preview is not Ready. Look at its build log in the dashboard."
  echo
  echo "Preview ready. Open $url (signed in to Vercel) on the phone and at 1440: home 'How it works' keeps the page gutter,"
  echo "flow boxes full width, EXECUTIA®, /life → life.executia.io. Then run step 2: the same command with --prod."
  echo "This output (no secrets) is saved in: $log"
  exit 0
fi

# ---------------------------------------------------------------------------------------------------------------
step "3. Production checks"
if [ "$target" != production ]; then echo "STOP: target is '${target:-?}', not production. Tell the CTO."; rollback; exit 1; fi
if [[ "$status" != *Ready* ]]; then echo "STOP: the deployment is not Ready. If $DOMAIN serves it, roll back."; rollback; exit 1; fi
checks=0
domain_id=""
waited=0
while :; do
  domain_id="$(inspect_field "$(vercel inspect "$DOMAIN" --scope "$scope" 2>&1 || true)" id)"
  [ "$domain_id" = "$dpl_id" ] || [ "$waited" -ge "$alias_wait" ] && break
  sleep 10; waited=$((waited + 10))
done
if [ -n "$dpl_id" ] && [ "$domain_id" = "$dpl_id" ]; then
  echo "$DOMAIN → $domain_id (the new deployment)"
else
  echo "CHECK: $DOMAIN → ${domain_id:-?}, not the new deployment ${dpl_id:-?} after ${waited}s. Look at the dashboard; tell the CTO."
  checks=$((checks + 1))
fi
for page in / /engine; do
  code="$(http_code "https://$DOMAIN$page")"
  if [ "$code" = 200 ]; then echo "GET https://$DOMAIN$page: 200"; else echo "CHECK: GET https://$DOMAIN$page: ${code:-no answer} (expected 200)"; checks=$((checks + 1)); fi
  og="$(og_image "https://$DOMAIN$page")"
  og_code="$([ -n "$og" ] && http_code "$og" || true)"
  if [ "$og_code" = 200 ]; then echo "  og:image $og: 200"; else echo "CHECK: og:image of $page '${og:-none}': ${og_code:-no answer} (expected 200)"; checks=$((checks + 1)); fi
done
for pair in "/:index.html" "/engine:engine.html"; do
  served="$(curl -s --max-time 30 "https://$DOMAIN${pair%%:*}" | shasum -a 256 | cut -d' ' -f1)"
  git_sum="$(git -C "$repo" show "$APPROVED_SHA:${pair#*:}" | shasum -a 256 | cut -d' ' -f1)"
  if [ "$served" = "$git_sum" ]; then echo "  ${pair%%:*} bytes = git ${pair#*:} at $short"; else echo "CHECK: ${pair%%:*} served bytes differ from git ${pair#*:} at $short"; checks=$((checks + 1)); fi
done
sub="$(http_code "https://execution.$DOMAIN/dashboard")"
echo "Info: https://execution.$DOMAIN/dashboard → ${sub:-no answer}. 308 only after the TASK-20 domain move (executia-layer → $PROJECT), a separate PO step."

echo
rollback
if [ "$checks" = 0 ]; then
  echo "RESULT: $DOMAIN serves $short; all checks passed."
else
  echo "RESULT: $checks check(s) failed — see the CHECK lines. Decide on the rollback above with the CTO."
fi
echo "Temp folder removed at exit. This output (no secrets) is saved in: $log"
[ "$checks" = 0 ]

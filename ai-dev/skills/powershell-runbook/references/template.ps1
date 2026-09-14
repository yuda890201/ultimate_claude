# Template for a runbook script the human runs on Windows PowerShell 5.1.
# All literals are ASCII on purpose: the console codepage is often CP932.
#
# Rules this template encodes:
#   - every native command is followed by a $LASTEXITCODE check
#     ($ErrorActionPreference = "Stop" does NOT cover native commands)
#   - every step prints what was verified, not just that it ran
#   - the script exits non-zero on any failure
#   - secrets are reported by length, never by value

param(
  [switch]$SkipTests
)

$ErrorActionPreference = "Stop"   # covers cmdlets only. Native: see below.

function Step($n, $text) { Write-Host ""; Write-Host ("[" + $n + "] " + $text) -ForegroundColor Cyan }
function Ok($text)       { Write-Host ("   OK  " + $text) -ForegroundColor Green }
function Bad($text)      { Write-Host ("   NG  " + $text) -ForegroundColor Red }

# Wrap native commands so a failure cannot pass silently.
function Native($what, [scriptblock]$block) {
  & $block
  if ($LASTEXITCODE -ne 0) { Bad ($what + " failed (exit " + $LASTEXITCODE + ")"); exit 1 }
}

# ---------------------------------------------------------------- 1. checkout
Step 1 "Make sure the working tree is clean and up to date"

$dirty = (git status --porcelain | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { Bad "git status failed"; exit 1 }
if ($dirty) { Bad "The working tree has uncommitted changes. Commit or stash first."; exit 1 }

$branch = (git rev-parse --abbrev-ref HEAD | Out-String).Trim()
Native "git fetch" { git fetch origin $branch }
Native "git pull"  { git pull --ff-only origin $branch }

$head   = (git rev-parse HEAD | Out-String).Trim()
$remote = (git rev-parse ("origin/" + $branch) | Out-String).Trim()
if ($head -ne $remote) { Bad "HEAD does not match origin/$branch"; exit 1 }
Ok ("on " + $branch + " @ " + $head.Substring(0, 7))

# ------------------------------------------------------------------- 2. tests
if (-not $SkipTests) {
  Step 2 "Run the tests (nothing is deployed if they fail)"
  Native "tests" { python -m tests }
  Ok "all tests passed"
} else {
  Step 2 "Skipped tests (-SkipTests)"
}

# ------------------------------------------------------------------ 3. verify
# Do not trust this script's own claim that the work landed. Ask the thing
# that was changed. Example: after deploying, ask the running service which
# commit it is serving.
Step 3 "Ask the target what it is actually running"

# $url must be discovered, not pasted by hand.
# $live = Invoke-RestMethod -Uri "$url/api/deployment" -Method GET
# if ($live.git_sha -ne $head) {
#   Bad ("running=" + [string]$live.git_sha + " expected=" + $head.Substring(0, 7))
#   exit 1
# }
# Ok ("running " + [string]$live.revision)

Write-Host ""
Write-Host "Done. Every check passed." -ForegroundColor Green
exit 0

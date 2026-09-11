# One-shot installer for gcp-devops-setup-mcp on Windows: clones (or
# updates) this repository, builds the server, and registers it into a
# Claude Code or Claude Desktop config. Safe to re-run.
#
# Usage:
#   .\install.ps1 -Target claude-code [-Cwd C:\path\to\project]
#   .\install.ps1 -Target claude-desktop
#
# Set $env:GCP_DEVOPS_MCP_HOME to change where the repo is cloned
# (default: $HOME\.gcp-devops-setup-mcp).

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("claude-code", "claude-desktop")]
  [string]$Target,

  [string]$Cwd
)

$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/yuda890201/ultimate_claude.git"
$InstallDir = if ($env:GCP_DEVOPS_MCP_HOME) { $env:GCP_DEVOPS_MCP_HOME } else { Join-Path $HOME ".gcp-devops-setup-mcp" }

foreach ($cmd in @("git", "node", "npm")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Error "Required command `"$cmd`" was not found on PATH."
    exit 1
  }
}

if (Test-Path (Join-Path $InstallDir ".git")) {
  Write-Host "Updating existing checkout at $InstallDir..."
  git -C $InstallDir pull --ff-only
} else {
  Write-Host "Cloning $RepoUrl into $InstallDir..."
  git clone --depth 1 $RepoUrl $InstallDir
}

$ServerDir = Join-Path $InstallDir "gcp-devops-setup-mcp"

Write-Host "Installing dependencies and building..."
npm --prefix $ServerDir install

Write-Host "Registering MCP server..."
$configureArgs = @("--target", $Target)
if ($Cwd) { $configureArgs += @("--cwd", $Cwd) }
node (Join-Path $ServerDir "scripts\configure-mcp.js") @configureArgs

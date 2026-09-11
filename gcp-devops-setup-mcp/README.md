# gcp-devops-setup-mcp

MCP (Model Context Protocol) server that automates the repetitive setup chores that come up
when developing and deploying a Cloud Run + GitHub application (e.g. App Studio):

- Checking `gcloud`/`gh`/`git`/`claude` installation and auth status
- Enabling required GCP APIs
- Looking up a Cloud Run service's runtime service account
- Creating/updating Secret Manager secrets and granting IAM access to them
- Auditing a Cloud Run service for plaintext env vars that look like secrets
- Initializing a Git repository
- Deploying a Cloud Run service using `--set-secrets` instead of `--set-env-vars`

It works both as a tool Claude Code (CLI) can call from Google Cloud Shell, and as a server
Claude Desktop connects to from your local Mac/Windows machine.

> **Status**: this package is not yet published to the npm registry, so `npx -y
> gcp-devops-setup-mcp` does not work yet. Until it is (see
> [Publishing to npm](#publishing-to-npm-maintainers)), use the one-shot installer scripts below
> — they clone this repo, build it, and register it into your `.mcp.json` / Claude Desktop
> config for you. Once published, the `npx`-based config shown in each section becomes the
> simpler option and the installer scripts are no longer necessary.

## Security model

- `gcloud`, `gh`, and `git` are invoked with Node's `child_process.execFile` (never `exec`),
  so arguments are never interpolated into a shell string — command injection via project
  IDs, secret IDs, paths, etc. is not possible.
- Secret values passed to `create_or_update_secret` are piped to `gcloud` over stdin. They are
  never written to logs, never included in a tool's text response, and never placed on the
  process argument list (which would otherwise be visible via `ps`).
- `gcloud auth login` is never run by this server — it requires an interactive browser flow.
  `gcloud_auth_status` only detects whether you're logged in and tells you to run the login
  command yourself if not.
- Every tool whose description says **DESTRUCTIVE** changes real cloud state (IAM bindings,
  secrets, deployments) or your local Git history. Review the arguments Claude proposes before
  approving these tool calls.

## Prerequisites

Both environments are assumed to already have `gcloud`, `gh`, and `git` installed and
authenticated. This server detects missing/expired auth and tells you what to run — it does not
install these tools or perform interactive login for you.

- Node.js >= 18
- `gcloud` CLI, logged in (`gcloud auth login`) with a default project set
- `gh` CLI, logged in (`gh auth login`) if you'll use GitHub-related workflows alongside this
- `git`

## Setup: Google Cloud Shell + Claude Code CLI

1. Cloud Shell already has Node.js, `gcloud`, and `git` preinstalled. Confirm gcloud is
   authenticated:

   ```bash
   gcloud auth list
   gcloud config get-value project
   ```

2. Run the installer from your project directory. It clones this repo into
   `~/.gcp-devops-setup-mcp` (override with `$GCP_DEVOPS_MCP_HOME`), builds it, and
   merges a `gcp-devops-setup` entry into `.mcp.json` in the current directory:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/yuda890201/ultimate_claude/main/gcp-devops-setup-mcp/scripts/install.sh | bash -s -- --target claude-code
   ```

   Re-running it later (e.g. to pick up updates) just `git pull`s and rebuilds; it won't
   clobber other entries already in your `.mcp.json`.

   <details>
   <summary>Once the package is published to npm, use this instead</summary>

   ```bash
   cat > .mcp.json <<'EOF'
   {
     "mcpServers": {
       "gcp-devops-setup": {
         "command": "npx",
         "args": ["-y", "gcp-devops-setup-mcp"]
       }
     }
   }
   EOF
   ```

   (see `.mcp-config-examples/claude-code.json`). No clone/build needed — `npx` fetches and
   caches the package itself.
   </details>

3. Start Claude Code from the same directory:

   ```bash
   claude
   ```

4. Ask Claude to run `check_environment` or `gcloud_auth_status` to confirm the server is wired
   up correctly.

## Setup: Local machine (Mac/Windows) + Claude Desktop

1. Make sure `gcloud`, `git`, and Node.js >= 18 are installed and on your `PATH`, and that you're
   logged in:

   ```bash
   gcloud auth login
   gcloud config set project <YOUR_PROJECT_ID>
   ```

2. Run the installer, which clones, builds, and registers the server directly into your Claude
   Desktop config:

   **macOS/Linux:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/yuda890201/ultimate_claude/main/gcp-devops-setup-mcp/scripts/install.sh | bash -s -- --target claude-desktop
   ```

   **Windows (PowerShell):**
   ```powershell
   irm https://raw.githubusercontent.com/yuda890201/ultimate_claude/main/gcp-devops-setup-mcp/scripts/install.ps1 -OutFile install.ps1
   .\install.ps1 -Target claude-desktop
   ```

   <details>
   <summary>Once the package is published to npm, use this instead</summary>

   Add (or merge) into your Claude Desktop config (macOS:
   `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows:
   `%APPDATA%\Claude\claude_desktop_config.json`; see `.mcp-config-examples/claude-desktop.json`):

   ```json
   {
     "mcpServers": {
       "gcp-devops-setup": {
         "command": "npx",
         "args": ["-y", "gcp-devops-setup-mcp"]
       }
     }
   }
   ```
   </details>

3. Restart Claude Desktop to pick up the new server.

## Local development (this repo)

```bash
npm install
npm run build
npm start   # runs dist/index.js over stdio; useful for manual smoke testing with an MCP inspector
```

To test with the official inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Tools

| Tool | Purpose | Destructive? |
|---|---|---|
| `check_environment` | Reports gcloud/gh/git/node/claude install status and versions | No |
| `gcloud_auth_status` | Reports active gcloud account and project; never runs `gcloud auth login` | No |
| `enable_api` | Enables a GCP API for a project, skipping if already enabled | Yes (project config) |
| `get_cloud_run_service_account` | Looks up a Cloud Run service's runtime service account | No |
| `create_or_update_secret` | Creates a Secret Manager secret or adds a new version; value never logged | Yes |
| `grant_secret_access` | Grants an IAM role on a secret to a member (idempotent) | Yes |
| `init_git_repo` | `git init` (if needed) + initial commit in a target directory | Yes (local repo state) |
| `audit_cloud_run_env_vars` | Flags plaintext env vars with sensitive-looking names; values never shown | No |
| `deploy_with_secrets` | Deploys a Cloud Run revision using `--set-secrets` (never `--set-env-vars`) | Yes |

## Example workflow: migrating a service to Secret Manager

This is the intended first real use of this server — for example, on an "App Studio" project
with Cloud Run service `app-studio` in project `<PROJECT_ID>`:

1. `check_environment` / `gcloud_auth_status` — confirm tools and auth are ready.
2. `enable_api` for `secretmanager.googleapis.com`.
3. `get_cloud_run_service_account` for `app-studio` to find its runtime SA.
4. `audit_cloud_run_env_vars` for `app-studio` to see which plaintext vars need migrating.
5. For each flagged variable: `create_or_update_secret`, then `grant_secret_access` for the
   service account found in step 3.
6. `init_git_repo` on the project's source directory, if it isn't already tracked.
7. `deploy_with_secrets` to redeploy `app-studio` referencing the new secrets instead of the
   plaintext env vars.

## Publishing to npm (maintainers)

`.github/workflows/publish-gcp-devops-setup-mcp.yml` (at the repo root) publishes this package
to npm automatically. It never handles your npm credentials directly — it reads them from a
GitHub Actions secret you configure yourself:

1. Create an npm token for the `gcp-devops-setup-mcp` package (or your npm account) that is
   allowed to publish from CI **without an interactive 2FA/OTP prompt**:
   - Classic tokens: type **Automation** (not "Publish" — that type still requires 2FA).
   - [Granular access tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens): enable
     **"Bypass two-factor authentication requirement for write actions"** when creating it.

   Using the wrong token type fails the publish step with:
   ```
   npm error code E403
   npm error 403 403 Forbidden - PUT https://registry.npmjs.org/gcp-devops-setup-mcp -
   Two-factor authentication or granular access token with bypass 2fa enabled is required
   to publish packages.
   ```
   If you see this, the token itself needs to be re-created with one of the two options above —
   the workflow and code are not the problem.
2. In the GitHub repo, go to **Settings → Secrets and variables → Actions** and add it as a
   repository secret named `NPM_TOKEN`.
3. Bump `version` in `gcp-devops-setup-mcp/package.json`, commit, then tag and push:

   ```bash
   git tag gcp-devops-setup-mcp-v0.1.0
   git push origin gcp-devops-setup-mcp-v0.1.0
   ```

   To retry after fixing the token (same version), delete and re-push the tag:
   ```bash
   git tag -d gcp-devops-setup-mcp-v0.1.0
   git push origin :refs/tags/gcp-devops-setup-mcp-v0.1.0
   git tag gcp-devops-setup-mcp-v0.1.0
   git push origin gcp-devops-setup-mcp-v0.1.0
   ```

The workflow checks that the tag's version matches `package.json`, builds, and runs
`npm publish --access public`. Once it succeeds, the `npx -y gcp-devops-setup-mcp` instructions
above work as-is and the installer scripts are no longer required (though they still work fine
for anyone who prefers a local clone).

#!/usr/bin/env node
// Registers this server into a Claude Code (.mcp.json) or Claude Desktop
// config file, merging with whatever is already there instead of
// overwriting it. Meant to be run after `npm install` has produced
// dist/index.js (via install.sh / install.ps1, or manually).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SERVER_NAME = "gcp-devops-setup";
const DIST_ENTRY = path.resolve(__dirname, "..", "dist", "index.js");

function parseArgs(argv) {
  const args = { target: null, cwd: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--target") {
      args.target = argv[++i];
    } else if (arg === "--cwd") {
      args.cwd = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(
    [
      "Usage: node configure-mcp.js --target <claude-code|claude-desktop> [--cwd <dir>]",
      "",
      "  claude-code     writes/merges ./.mcp.json in --cwd (defaults to the current directory)",
      "  claude-desktop  writes/merges Claude Desktop's config file for this OS",
    ].join("\n")
  );
}

function claudeDesktopConfigPath() {
  const platform = os.platform();
  if (platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json"
    );
  }
  if (platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "Claude", "claude_desktop_config.json");
  }
  // Best effort for Linux; Claude Desktop does not officially ship there.
  return path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json");
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (raw.length === 0) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error(
      `Refusing to touch "${filePath}": it already exists but is not valid JSON (${error.message}).\n` +
        "Fix or remove it manually, then re-run this script."
    );
    process.exit(1);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.target) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  if (!fs.existsSync(DIST_ENTRY)) {
    console.error(
      `"${DIST_ENTRY}" does not exist yet. Run "npm install" (or "npm run build") in ` +
        "gcp-devops-setup-mcp/ first."
    );
    process.exit(1);
  }

  let configPath;
  if (args.target === "claude-code") {
    configPath = path.join(path.resolve(args.cwd), ".mcp.json");
  } else if (args.target === "claude-desktop") {
    configPath = claudeDesktopConfigPath();
  } else {
    console.error(`Unknown --target "${args.target}". Use claude-code or claude-desktop.`);
    process.exit(1);
  }

  const config = readJsonIfExists(configPath);
  config.mcpServers = config.mcpServers || {};

  const desiredEntry = { command: "node", args: [DIST_ENTRY] };
  const existingEntry = config.mcpServers[SERVER_NAME];

  if (existingEntry && JSON.stringify(existingEntry) === JSON.stringify(desiredEntry)) {
    console.log(`"${SERVER_NAME}" is already configured correctly in ${configPath}. No change made.`);
    return;
  }

  config.mcpServers[SERVER_NAME] = desiredEntry;

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");

  console.log(`Registered "${SERVER_NAME}" in ${configPath}:`);
  console.log(JSON.stringify({ [SERVER_NAME]: desiredEntry }, null, 2));
  console.log(
    args.target === "claude-code"
      ? "Restart Claude Code (or start a new session) in this directory to pick it up."
      : "Restart Claude Desktop to pick it up."
  );
}

main();

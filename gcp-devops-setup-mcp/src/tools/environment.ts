import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { commandExists, getVersion } from "../utils/exec.js";

interface ToolStatus {
  installed: boolean;
  version: string | null;
}

async function checkTool(command: string, versionArgs?: string[]): Promise<ToolStatus> {
  const installed = await commandExists(command);
  if (!installed) return { installed: false, version: null };
  const version = await getVersion(command, versionArgs);
  return { installed: true, version };
}

export function registerEnvironmentTools(server: McpServer): void {
  server.registerTool(
    "check_environment",
    {
      title: "Check environment",
      description:
        "Read-only check. Reports whether gcloud, gh, git, node, and the Claude Code CLI are installed and " +
        "their versions, so setup gaps can be surfaced before running other tools. Makes no changes.",
      inputSchema: {},
    },
    async () => {
      const [gcloud, gh, git, node, claude] = await Promise.all([
        checkTool("gcloud", ["--version"]),
        checkTool("gh", ["--version"]),
        checkTool("git", ["--version"]),
        checkTool("node", ["--version"]),
        checkTool("claude", ["--version"]),
      ]);

      const statuses = { gcloud, gh, git, node, claude };
      const missing = Object.entries(statuses)
        .filter(([, s]) => !s.installed)
        .map(([name]) => name);

      const lines = Object.entries(statuses).map(
        ([name, s]) => `- ${name}: ${s.installed ? `installed (${s.version ?? "unknown version"})` : "NOT installed"}`
      );

      const summary =
        missing.length === 0
          ? "All required tools are installed."
          : `Missing tools: ${missing.join(", ")}. Install these before continuing.`;

      return {
        content: [
          {
            type: "text",
            text: [`Environment check:`, ...lines, "", summary].join("\n"),
          },
        ],
      };
    }
  );
}

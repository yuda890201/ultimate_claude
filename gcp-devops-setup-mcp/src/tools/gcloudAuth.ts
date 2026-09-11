import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runCommand, runJson } from "../utils/exec.js";

interface AuthListEntry {
  account: string;
  status: string;
}

export function registerGcloudAuthTools(server: McpServer): void {
  server.registerTool(
    "gcloud_auth_status",
    {
      title: "Check gcloud auth status",
      description:
        "Read-only check. Reports the active gcloud account and configured project. Never runs `gcloud auth login` " +
        "itself, since that requires an interactive browser flow a human must complete; if no account is active, " +
        "returns a message telling the user to run `gcloud auth login` manually.",
      inputSchema: {},
    },
    async () => {
      const authList = await runJson<AuthListEntry[]>("gcloud", [
        "auth",
        "list",
        "--format=json",
      ]);

      if (!authList.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to read gcloud auth state: ${authList.error}\nRun "gcloud auth login" to authenticate.`,
            },
          ],
          isError: true,
        };
      }

      const active = authList.data.find((e) => e.status === "ACTIVE");
      const projectResult = await runCommand("gcloud", [
        "config",
        "get-value",
        "project",
        "--quiet",
      ]);
      const project = projectResult.success ? projectResult.stdout.trim() : null;

      if (!active) {
        return {
          content: [
            {
              type: "text",
              text:
                "No active gcloud account found. Please run `gcloud auth login` in a terminal to authenticate " +
                "(this requires an interactive browser session and cannot be automated here).",
            },
          ],
        };
      }

      const projectLine =
        project && project !== "(unset)"
          ? `Configured project: ${project}`
          : "No project is configured. Run `gcloud config set project <PROJECT_ID>` or pass an explicit `project` to other tools.";

      return {
        content: [
          {
            type: "text",
            text: [`Active account: ${active.account}`, projectLine].join("\n"),
          },
        ],
      };
    }
  );
}

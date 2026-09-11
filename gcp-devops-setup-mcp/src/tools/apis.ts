import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runCommand, runJson } from "../utils/exec.js";

interface ServiceEntry {
  config: { name: string };
}

export function registerApiTools(server: McpServer): void {
  server.registerTool(
    "enable_api",
    {
      title: "Enable a GCP API",
      description:
        "Enables a Google Cloud API for a project (e.g. `gcloud services enable secretmanager.googleapis.com`). " +
        "This changes project configuration. Skips the enable call and reports so if the API is already enabled. " +
        "Confirm with the user before running this against a production project.",
      inputSchema: {
        project: z.string().describe("GCP project ID, e.g. my-project-123"),
        api: z
          .string()
          .describe("API service name to enable, e.g. secretmanager.googleapis.com"),
      },
    },
    async ({ project, api }) => {
      const listResult = await runJson<ServiceEntry[]>("gcloud", [
        "services",
        "list",
        "--enabled",
        `--project=${project}`,
        `--filter=config.name=${api}`,
        "--format=json",
      ]);

      if (listResult.ok && listResult.data.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `API "${api}" is already enabled on project "${project}". No action taken.`,
            },
          ],
        };
      }

      const enableResult = await runCommand("gcloud", [
        "services",
        "enable",
        api,
        `--project=${project}`,
      ]);

      if (!enableResult.success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to enable API "${api}" on project "${project}": ${enableResult.stderr.trim()}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `API "${api}" enabled on project "${project}".`,
          },
        ],
      };
    }
  );
}

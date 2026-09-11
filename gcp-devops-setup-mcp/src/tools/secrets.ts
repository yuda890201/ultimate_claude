import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runCommand, runJson } from "../utils/exec.js";

interface IamBinding {
  bindings?: Array<{ role: string; members: string[] }>;
}

async function secretExists(project: string, secretId: string): Promise<boolean> {
  const result = await runCommand("gcloud", [
    "secrets",
    "describe",
    secretId,
    `--project=${project}`,
  ]);
  return result.success;
}

export function registerSecretTools(server: McpServer): void {
  server.registerTool(
    "create_or_update_secret",
    {
      title: "Create or update a Secret Manager secret",
      description:
        "DESTRUCTIVE: creates a Secret Manager secret if it does not exist, or adds a new version to it if it " +
        "does. The secret value is piped to gcloud via stdin and is never included in this tool's response, logs, " +
        "or error messages — only the secret ID and success/failure are reported. Confirm with the user before " +
        "overwriting an existing secret's active version.",
      inputSchema: {
        project: z.string().describe("GCP project ID"),
        secret_id: z.string().describe("Secret Manager secret ID"),
        value: z.string().describe("The secret value. Never echoed back in any tool output."),
      },
    },
    async ({ project, secret_id, value }) => {
      const exists = await secretExists(project, secret_id);

      const args = exists
        ? ["secrets", "versions", "add", secret_id, `--project=${project}`, "--data-file=-"]
        : ["secrets", "create", secret_id, `--project=${project}`, "--data-file=-", "--replication-policy=automatic"];

      const result = await runCommand("gcloud", args, { input: value });

      if (!result.success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to ${exists ? "add a new version to" : "create"} secret "${secret_id}" in project "${project}". (Error details omitted to avoid leaking any value that may have been echoed by the CLI.)`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: exists
              ? `New version added to existing secret "${secret_id}" in project "${project}".`
              : `Secret "${secret_id}" created in project "${project}".`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "grant_secret_access",
    {
      title: "Grant Secret Manager access to a member",
      description:
        "DESTRUCTIVE: grants an IAM role (default roles/secretmanager.secretAccessor) on a Secret Manager secret " +
        "to a member, typically a Cloud Run service account. Idempotent: if the binding already exists, reports " +
        "success without making a redundant change. Confirm with the user before granting access, since this is " +
        "an IAM permission change.",
      inputSchema: {
        project: z.string().describe("GCP project ID"),
        secret_id: z.string().describe("Secret Manager secret ID"),
        member: z
          .string()
          .describe("IAM member to grant access to, e.g. serviceAccount:my-sa@project.iam.gserviceaccount.com"),
        role: z
          .string()
          .default("roles/secretmanager.secretAccessor")
          .describe("IAM role to grant. Defaults to roles/secretmanager.secretAccessor."),
      },
    },
    async ({ project, secret_id, member, role }) => {
      const existing = await runJson<IamBinding>("gcloud", [
        "secrets",
        "get-iam-policy",
        secret_id,
        `--project=${project}`,
        "--format=json",
      ]);

      if (existing.ok) {
        const alreadyGranted = existing.data.bindings?.some(
          (b) => b.role === role && b.members.includes(member)
        );
        if (alreadyGranted) {
          return {
            content: [
              {
                type: "text",
                text: `"${member}" already has "${role}" on secret "${secret_id}". No change made.`,
              },
            ],
          };
        }
      }

      const result = await runCommand("gcloud", [
        "secrets",
        "add-iam-policy-binding",
        secret_id,
        `--project=${project}`,
        `--member=${member}`,
        `--role=${role}`,
      ]);

      if (!result.success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to grant "${role}" to "${member}" on secret "${secret_id}": ${result.stderr.trim()}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Granted "${role}" to "${member}" on secret "${secret_id}" in project "${project}".`,
          },
        ],
      };
    }
  );
}

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runCommand, runJson } from "../utils/exec.js";

interface EnvVarEntry {
  name: string;
  value?: string;
  valueFrom?: { secretKeyRef?: { name: string; key: string } };
}

interface CloudRunServiceJson {
  spec?: {
    template?: {
      spec?: {
        serviceAccountName?: string;
        containers?: Array<{ env?: EnvVarEntry[] }>;
      };
    };
  };
}

async function describeService(
  project: string,
  region: string,
  service: string
): Promise<{ ok: true; data: CloudRunServiceJson } | { ok: false; error: string }> {
  return runJson<CloudRunServiceJson>("gcloud", [
    "run",
    "services",
    "describe",
    service,
    `--project=${project}`,
    `--region=${region}`,
    "--format=json",
  ]);
}

function notFoundMessage(service: string, project: string, region: string, error: string): string {
  return (
    `Cloud Run service "${service}" was not found in project "${project}" region "${region}", ` +
    `or could not be read.\nDetails: ${error}`
  );
}

const PLAINTEXT_SENSITIVE_PATTERN = /TOKEN|PIN|SECRET|KEY/i;

export function registerCloudRunTools(server: McpServer): void {
  server.registerTool(
    "get_cloud_run_service_account",
    {
      title: "Get Cloud Run service account",
      description:
        "Read-only. Looks up the runtime service account of a Cloud Run service. Returns a clear error if the " +
        "service does not exist in the given project/region.",
      inputSchema: {
        project: z.string().describe("GCP project ID"),
        region: z.string().describe("Cloud Run region, e.g. asia-northeast1"),
        service: z.string().describe("Cloud Run service name"),
      },
    },
    async ({ project, region, service }) => {
      const result = await describeService(project, region, service);
      if (!result.ok) {
        return {
          content: [{ type: "text", text: notFoundMessage(service, project, region, result.error) }],
          isError: true,
        };
      }

      const sa = result.data.spec?.template?.spec?.serviceAccountName;
      const text = sa
        ? `Service account for "${service}": ${sa}`
        : `"${service}" does not have an explicit service account set; it runs as the project's ` +
          `default compute service account (PROJECT_NUMBER-compute@developer.gserviceaccount.com).`;

      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "audit_cloud_run_env_vars",
    {
      title: "Audit Cloud Run plaintext env vars",
      description:
        "Read-only. Lists environment variable names on a Cloud Run service and flags any whose name contains " +
        "TOKEN/PIN/SECRET/KEY and is set as a plain value (not already backed by Secret Manager via valueFrom). " +
        "Never returns variable values, only names, so it is safe to run against services holding real secrets.",
      inputSchema: {
        project: z.string().describe("GCP project ID"),
        region: z.string().describe("Cloud Run region, e.g. asia-northeast1"),
        service: z.string().describe("Cloud Run service name"),
      },
    },
    async ({ project, region, service }) => {
      const result = await describeService(project, region, service);
      if (!result.ok) {
        return {
          content: [{ type: "text", text: notFoundMessage(service, project, region, result.error) }],
          isError: true,
        };
      }

      const env = result.data.spec?.template?.spec?.containers?.[0]?.env ?? [];
      const plaintext = env.filter((e) => e.value !== undefined);
      const secretBacked = env.filter((e) => e.valueFrom?.secretKeyRef);
      const flagged = plaintext.filter((e) => PLAINTEXT_SENSITIVE_PATTERN.test(e.name));

      const lines: string[] = [
        `Env vars on "${service}": ${env.length} total, ${plaintext.length} plaintext, ${secretBacked.length} Secret Manager-backed.`,
      ];

      if (flagged.length > 0) {
        lines.push(
          "",
          "WARNING: the following plaintext env vars look sensitive by name and should be migrated to Secret Manager:",
          ...flagged.map((e) => `  - ${e.name}`),
          "",
          "Recommend using create_or_update_secret + grant_secret_access + deploy_with_secrets to migrate these."
        );
      } else {
        lines.push("No plaintext env vars with sensitive-looking names were found.");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.registerTool(
    "deploy_with_secrets",
    {
      title: "Deploy Cloud Run service with Secret Manager references",
      description:
        "DESTRUCTIVE: deploys a new revision of a Cloud Run service using `gcloud run deploy --set-secrets`, " +
        "mounting Secret Manager secrets as environment variables. Deliberately does not support --set-env-vars, " +
        "so plaintext secrets cannot be reintroduced through this tool. This replaces the running revision's " +
        "configuration — confirm with the user before running against a production service.",
      inputSchema: {
        project: z.string().describe("GCP project ID"),
        region: z.string().describe("Cloud Run region, e.g. asia-northeast1"),
        service: z.string().describe("Cloud Run service name"),
        source_path: z.string().describe("Path to the source directory to deploy (passed to --source)"),
        secrets: z
          .array(z.string())
          .min(1)
          .describe(
            "Secret bindings as 'ENV_NAME:secret_id:version' entries, e.g. 'DB_PASSWORD:db-password:latest'"
          ),
      },
    },
    async ({ project, region, service, source_path, secrets }) => {
      const parsed: string[] = [];
      for (const entry of secrets) {
        const parts = entry.split(":");
        if (parts.length !== 3 || parts.some((p) => p.trim().length === 0)) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid secrets entry "${entry}". Expected format 'ENV_NAME:secret_id:version'.`,
              },
            ],
            isError: true,
          };
        }
        const [envName, secretId, version] = parts;
        parsed.push(`${envName}=${secretId}:${version}`);
      }

      const setSecrets = parsed.join(",");
      const result = await runCommand("gcloud", [
        "run",
        "deploy",
        service,
        `--project=${project}`,
        `--region=${region}`,
        `--source=${source_path}`,
        `--set-secrets=${setSecrets}`,
        "--quiet",
      ]);

      if (!result.success) {
        return {
          content: [
            {
              type: "text",
              text: `Deployment of "${service}" failed: ${result.stderr.trim()}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Deployed "${service}" in ${project}/${region} with secrets: ${secrets
              .map((s) => s.split(":")[0])
              .join(", ")}.`,
          },
        ],
      };
    }
  );
}

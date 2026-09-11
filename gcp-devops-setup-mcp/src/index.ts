#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerEnvironmentTools } from "./tools/environment.js";
import { registerGcloudAuthTools } from "./tools/gcloudAuth.js";
import { registerApiTools } from "./tools/apis.js";
import { registerCloudRunTools } from "./tools/cloudRun.js";
import { registerSecretTools } from "./tools/secrets.js";
import { registerGitTools } from "./tools/git.js";

async function main(): Promise<void> {
  const server = new McpServer({
    name: "gcp-devops-setup-mcp",
    version: "0.1.0",
  });

  registerEnvironmentTools(server);
  registerGcloudAuthTools(server);
  registerApiTools(server);
  registerCloudRunTools(server);
  registerSecretTools(server);
  registerGitTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error starting gcp-devops-setup-mcp:", error);
  process.exit(1);
});

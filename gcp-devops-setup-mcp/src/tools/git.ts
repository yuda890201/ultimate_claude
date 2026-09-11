import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runCommand } from "../utils/exec.js";

export function registerGitTools(server: McpServer): void {
  server.registerTool(
    "init_git_repo",
    {
      title: "Initialize a Git repository and commit",
      description:
        "Initializes a Git repository at the given path (if not already one) and creates an initial commit with " +
        "all current files. Skips `git init` and reports so if the directory is already a Git repository, but " +
        "still stages and commits any changes found there.",
      inputSchema: {
        path: z.string().describe("Absolute path to the target directory"),
        commit_message: z.string().describe("Commit message for the initial commit"),
      },
    },
    async ({ path, commit_message }) => {
      if (!existsSync(path)) {
        return {
          content: [{ type: "text", text: `Path "${path}" does not exist.` }],
          isError: true,
        };
      }

      const alreadyRepo = existsSync(join(path, ".git"));

      if (!alreadyRepo) {
        const initResult = await runCommand("git", ["init"], { cwd: path });
        if (!initResult.success) {
          return {
            content: [{ type: "text", text: `git init failed in "${path}": ${initResult.stderr.trim()}` }],
            isError: true,
          };
        }
      }

      const addResult = await runCommand("git", ["add", "-A"], { cwd: path });
      if (!addResult.success) {
        return {
          content: [{ type: "text", text: `git add failed in "${path}": ${addResult.stderr.trim()}` }],
          isError: true,
        };
      }

      const commitResult = await runCommand("git", ["commit", "-m", commit_message], { cwd: path });
      if (!commitResult.success) {
        const nothingToCommit = /nothing to commit/i.test(commitResult.stdout + commitResult.stderr);
        if (nothingToCommit) {
          return {
            content: [
              {
                type: "text",
                text: `${alreadyRepo ? "Repository already existed." : "Repository initialized."} Nothing to commit — working tree is clean.`,
              },
            ],
          };
        }
        return {
          content: [{ type: "text", text: `git commit failed in "${path}": ${commitResult.stderr.trim()}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `${alreadyRepo ? "Repository already existed; skipped git init." : "Repository initialized."} Committed changes to "${path}".`,
          },
        ],
      };
    }
  );
}

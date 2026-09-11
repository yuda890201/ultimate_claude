import { execFile } from "node:child_process";

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface ExecOptions {
  /** Text piped to the child process's stdin (e.g. a secret value). Never logged. */
  input?: string;
  /** Working directory for the command. */
  cwd?: string;
  /** Timeout in milliseconds. Defaults to 60s. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_BUFFER_BYTES = 10 * 1024 * 1024;

/**
 * Runs `command` with `args` via execFile (never a shell), so untrusted
 * input passed as an argument can never be interpreted as shell syntax.
 * Optionally feeds `input` to stdin instead of putting a secret on the
 * argument list or in an environment variable, both of which are visible
 * to other processes via `ps`/`/proc`.
 */
export function runCommand(
  command: string,
  args: string[],
  options: ExecOptions = {}
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = execFile(
      command,
      args,
      {
        cwd: options.cwd,
        timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER_BYTES,
      },
      (error, stdout, stderr) => {
        if (error) {
          const code = typeof error.code === "number" ? error.code : null;
          const stderrText = stderr?.toString() ?? "";
          resolve({
            success: false,
            stdout: stdout?.toString() ?? "",
            stderr: stderrText.length > 0 ? stderrText : error.message,
            code,
          });
          return;
        }
        resolve({
          success: true,
          stdout: stdout?.toString() ?? "",
          stderr: stderr?.toString() ?? "",
          code: 0,
        });
      }
    );

    if (options.input !== undefined) {
      child.stdin?.write(options.input);
    }
    child.stdin?.end();
  });
}

/** Checks whether an executable is available on PATH by asking the OS to resolve it. */
export async function commandExists(command: string): Promise<boolean> {
  const isWindows = process.platform === "win32";
  const finder = isWindows ? "where" : "which";
  const result = await runCommand(finder, [command]);
  return result.success && result.stdout.trim().length > 0;
}

export async function getVersion(
  command: string,
  args: string[] = ["--version"]
): Promise<string | null> {
  const result = await runCommand(command, args);
  if (!result.success) return null;
  const firstLine = result.stdout.split("\n").find((l) => l.trim().length > 0);
  return firstLine?.trim() ?? result.stdout.trim();
}

export async function runJson<T = unknown>(
  command: string,
  args: string[],
  options: ExecOptions = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const result = await runCommand(command, args, options);
  if (!result.success) {
    return { ok: false, error: result.stderr.trim() || `${command} exited with code ${result.code}` };
  }
  try {
    return { ok: true, data: JSON.parse(result.stdout) as T };
  } catch {
    return { ok: false, error: `Failed to parse JSON output from ${command}: ${result.stdout}` };
  }
}

import { execFile } from "node:child_process";
import { appendFile, cp, mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  validateCountChange,
  validateSnapshots,
} from "./registry-snapshots.ts";

const exec = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));

export async function refreshRegistries(
  directory: string,
  fetchSnapshots: (staging: string) => Promise<void>,
): Promise<"fresh" | "retained"> {
  let previous;
  try {
    previous = await validateSnapshots(directory);
  } catch {
    // A first run must fetch a complete valid dataset; invalid cache is never fallback.
  }
  await mkdir(path.dirname(directory), { recursive: true });
  const staging = await mkdtemp(
    path.join(path.dirname(directory), ".registry-refresh-"),
  );
  const candidate = path.join(staging, "generated");
  try {
    await fetchSnapshots(staging);
    const next = await validateSnapshots(candidate);
    if (previous) validateCountChange(next, previous);
    // Preserve other generated files (e.g. the authored catalogue), then promote the
    // complete directory together. A failure during promotion restores the original.
    const backup = path.join(staging, "previous");
    let hadDirectory = false;
    try {
      await cp(directory, path.join(staging, "merged"), { recursive: true });
      hadDirectory = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await cp(candidate, path.join(staging, "merged"), { recursive: true });
    if (hadDirectory) await rename(directory, backup);
    try {
      await rename(path.join(staging, "merged"), directory);
    } catch (error) {
      if (hadDirectory) await rename(backup, directory);
      throw error;
    }
    return "fresh";
  } catch (error) {
    if (!previous) throw error;
    await validateSnapshots(directory);
    console.warn(
      "Registry refresh failed; retaining last-known-good snapshots:",
      error,
    );
    return "retained";
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

async function main() {
  const directory = path.join(root, "generated");
  if (process.argv.includes("--validate")) {
    console.log(await validateSnapshots(directory));
    return;
  }
  const status = await refreshRegistries(directory, async (staging) => {
    for (const script of [
      "discover-lmstudio.ts",
      "enrich-lmstudio.ts",
      "discover-mcp-registry.ts",
    ]) {
      const { stdout, stderr } = await exec(
        process.execPath,
        [
          path.join(root, "node_modules/tsx/dist/cli.mjs"),
          path.join(root, "scripts", script),
        ],
        { cwd: staging, timeout: 20 * 60_000, maxBuffer: 4 * 1024 * 1024 },
      );
      process.stdout.write(stdout);
      process.stderr.write(stderr);
    }
  });
  console.log(`Registry refresh: ${status}`);
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, `status=${status}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `Registry refresh: **${status}**. Snapshot fetch dates are preserved when upstream requests fail.\n`,
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}

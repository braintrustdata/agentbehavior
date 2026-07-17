import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { main } from "./cli.js";

let temporaryDirectories: string[] = [];

async function createProjectWithInvalidBehavior(): Promise<string> {
  const projectPath = await mkdtemp(path.join(tmpdir(), "agentbehavior-cli-test-"));
  temporaryDirectories.push(projectPath);

  const behaviorDirectory = path.join(projectPath, ".agents", "behaviors", "invalid-behavior");
  await mkdir(behaviorDirectory, { recursive: true });
  await writeFile(
    path.join(behaviorDirectory, "BEHAVIOR.md"),
    `---
name: wrong-name
description: Invalid because the name does not match the directory.
---

# Invalid behavior
`,
    { flush: true },
  );

  return projectPath;
}

async function createProjectWithMultipleFreeformBehaviors(): Promise<string> {
  const projectPath = await mkdtemp(path.join(tmpdir(), "agentbehavior-cli-test-"));
  temporaryDirectories.push(projectPath);

  const behaviorDirectory = path.join(projectPath, ".agents", "behaviors", "loop");
  await mkdir(behaviorDirectory, { recursive: true });
  await writeFile(
    path.join(behaviorDirectory, "BEHAVIOR.md"),
    `---
name: loop
description: Expected conduct for Loop across Braintrust product surfaces.
---

# Loop

Loop grounds assistance in the current Braintrust page and available data.

## Page-grounded assistance

Preserve the current page context and use known resources before asking the user to select one.

## Evidence-backed answers

Base conclusions on successful tool output and state when evidence is incomplete.
`,
    { flush: true },
  );

  return projectPath;
}

async function captureMain(
  argv: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";

  vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
    stdout += chunk.toString();
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr += chunk.toString();
    return true;
  });

  const exitCode = await main(argv);
  return { exitCode, stdout, stderr };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })),
  );
  temporaryDirectories = [];
});

describe("CLI validation", () => {
  it("accepts multiple free-form behavior sections", async () => {
    const projectPath = await createProjectWithMultipleFreeformBehaviors();

    const { exitCode, stdout, stderr } = await captureMain(["validate", projectPath]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Validated 1 behavior spec(s): no errors.");
    expect(stderr).toBe("");
  });

  it("describes body structure as free-form in help", async () => {
    const { exitCode, stdout } = await captureMain(["--help"]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("BEHAVIOR.md bodies are free-form");
    expect(stdout).toContain("one or more behaviors");
  });
});

describe("CLI JSON output", () => {
  it("includes diagnostics in list --json output", async () => {
    const projectPath = await createProjectWithInvalidBehavior();

    const { exitCode, stdout } = await captureMain(["list", projectPath, "--json"]);
    const payload = JSON.parse(stdout) as {
      records: unknown[];
      diagnostics: Array<{ code: string }>;
    };

    expect(exitCode).toBe(1);
    expect(payload.records).toEqual([]);
    expect(payload.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "name-directory-mismatch" })]),
    );
  });

  it("includes diagnostics in explain --json output", async () => {
    const projectPath = await createProjectWithInvalidBehavior();
    const behaviorDirectory = path.join(projectPath, ".agents", "behaviors", "invalid-behavior");

    const { exitCode, stdout } = await captureMain(["explain", behaviorDirectory, "--json"]);
    const payload = JSON.parse(stdout) as {
      record: unknown;
      records: unknown[];
      diagnostics: Array<{ code: string }>;
    };

    expect(exitCode).toBe(1);
    expect(payload.record).toBeNull();
    expect(payload.records).toEqual([]);
    expect(payload.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "name-directory-mismatch" })]),
    );
  });
});

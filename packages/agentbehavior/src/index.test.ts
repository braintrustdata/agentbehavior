import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { allDiagnostics, behaviorRecord, listBehaviors, validatePath } from "./index.js";

let temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const projectPath = await mkdtemp(path.join(tmpdir(), "agentbehavior-test-"));
  temporaryDirectories.push(projectPath);
  return projectPath;
}

async function writeBehavior(
  projectPath: string,
  name: string,
  behaviorMarkdown: string,
): Promise<string> {
  const behaviorDirectory = path.join(projectPath, ".agents", "behaviors", name);
  await mkdir(behaviorDirectory, { recursive: true });
  await writeFile(path.join(behaviorDirectory, "BEHAVIOR.md"), behaviorMarkdown, { flush: true });
  return behaviorDirectory;
}

async function writeFileWithDirectories(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, { flush: true });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })),
  );
  temporaryDirectories = [];
});

describe("validatePath", () => {
  it("validates a structurally valid behavior spec", async () => {
    const projectPath = await createProject();
    await writeBehavior(
      projectPath,
      "cost-sensitive-actions",
      `---
name: cost-sensitive-actions
description: Ensure the agent surfaces material costs before expensive actions.
---

# Cost-sensitive actions

Gather cost evidence, decide whether cost is material, ask before spending, and recover when costs are unknown.
`,
    );

    const result = await validatePath(projectPath);
    const diagnostics = allDiagnostics(result);
    const record = behaviorRecord(result.behaviors[0]!);

    expect(diagnostics).toEqual([]);
    expect(result.behaviors).toHaveLength(1);
    expect(record).toMatchObject({
      name: "cost-sensitive-actions",
      description: "Ensure the agent surfaces material costs before expensive actions.",
      format_version: 1,
      metadata: {},
    });
  });

  it("reports missing BEHAVIOR.md files", async () => {
    const projectPath = await createProject();
    await writeFileWithDirectories(
      path.join(projectPath, ".agents", "behaviors", "missing-file", "notes.md"),
      "# Notes\n",
    );

    const result = await validatePath(projectPath);
    const diagnostics = allDiagnostics(result);

    expect(diagnostics.map((entry) => entry.code)).toContain("behavior-file-missing");
  });

  it("treats a direct .agents/behaviors/<name> path as a behavior directory even when BEHAVIOR.md is missing", async () => {
    const projectPath = await createProject();
    const behaviorDirectory = path.join(projectPath, ".agents", "behaviors", "missing-file");
    await mkdir(behaviorDirectory, { recursive: true });

    const result = await validatePath(behaviorDirectory);
    const diagnostics = allDiagnostics(result);

    expect(result.behaviors).toHaveLength(1);
    expect(diagnostics.map((entry) => entry.code)).toContain("behavior-file-missing");
  });

  it("reports YAML frontmatter parse errors", async () => {
    const projectPath = await createProject();
    await writeBehavior(
      projectPath,
      "broken-yaml",
      `---
name: broken-yaml
description: [unterminated
---

# Broken
`,
    );

    const result = await validatePath(projectPath);
    const diagnostics = allDiagnostics(result);

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "frontmatter-parse-error",
          line: expect.any(Number),
          column: expect.any(Number),
        }),
      ]),
    );
  });

  it("reports frontmatter schema violations", async () => {
    const projectPath = await createProject();
    await writeBehavior(
      projectPath,
      "bad-name",
      `---
name: Bad_Name
description: ""
format_version: 0
metadata: []
---

# Bad
`,
    );

    const result = await validatePath(projectPath);
    const diagnosticCodes = allDiagnostics(result).map((entry) => entry.code);

    expect(diagnosticCodes).toEqual(
      expect.arrayContaining([
        "name-invalid",
        "name-directory-mismatch",
        "description-required",
        "format-version-invalid",
        "metadata-invalid",
      ]),
    );
  });

  it("rejects case variants of BEHAVIOR.md with a useful diagnostic", async () => {
    const projectPath = await createProject();
    await writeFileWithDirectories(
      path.join(projectPath, ".agents", "behaviors", "case-variant", "behavior.md"),
      `---
name: case-variant
description: Uses the wrong filename case.
---
`,
    );

    const result = await validatePath(projectPath);
    const diagnostics = allDiagnostics(result);

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "behavior-file-missing",
          message: expect.stringContaining("case variant behavior.md"),
        }),
      ]),
    );
  });
});

describe("listBehaviors", () => {
  it("returns only structurally valid behavior records", async () => {
    const projectPath = await createProject();
    await writeBehavior(
      projectPath,
      "valid-behavior",
      `---
name: valid-behavior
description: A valid behavior.
format_version: 2
metadata:
  owner: evals
---

# Valid behavior
`,
    );
    await writeBehavior(
      projectPath,
      "invalid-behavior",
      `---
name: wrong-name
description: An invalid behavior.
---

# Invalid behavior
`,
    );

    const { records, result } = await listBehaviors(projectPath);

    expect(records).toEqual([
      expect.objectContaining({
        name: "valid-behavior",
        format_version: 2,
        metadata: { owner: "evals" },
      }),
    ]);
    expect(allDiagnostics(result).map((entry) => entry.code)).toContain("name-directory-mismatch");
  });
});

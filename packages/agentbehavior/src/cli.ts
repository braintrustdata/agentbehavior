#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs as parseNodeArgs } from "node:util";

import {
  allDiagnostics,
  behaviorRecord,
  hasErrors,
  listBehaviors,
  validatePath,
  type BehaviorRecord,
  type Diagnostic,
  type ValidationResult,
} from "./index.js";

interface ParsedArgs {
  command: string | undefined;
  path: string | undefined;
  json: boolean;
  help: boolean;
  version: boolean;
}

function parseCliArgs(argv: string[]): ParsedArgs {
  const { positionals, values } = parseNodeArgs({
    args: argv,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      json: { type: "boolean" },
      version: { type: "boolean", short: "v" },
    },
  });

  return {
    command: positionals[0],
    path: positionals[1],
    json: values.json ?? false,
    help: values.help ?? false,
    version: values.version ?? false,
  };
}

function usage(): string {
  return `agentbehavior validates Agent Behavior specs.

Usage:
  agentbehavior validate [path] [--json]
  agentbehavior list [path] [--json]
  agentbehavior explain <path> [--json]

Examples:
  agentbehavior validate .
  agentbehavior list .
  agentbehavior explain .agents/behaviors/cost-sensitive-actions
`;
}

function displayPath(filePath: string | undefined): string {
  if (filePath === undefined) return "";
  const relative = path.relative(process.cwd(), filePath);
  return relative === "" ? "." : relative;
}

function formatDiagnostic(entry: Diagnostic): string {
  const location = entry.file === undefined ? "" : displayPath(entry.file);
  const line =
    entry.line === undefined
      ? ""
      : `:${entry.line}${entry.column === undefined ? "" : `:${entry.column}`}`;
  const prefix = location === "" ? "" : `${location}${line}: `;
  return `${prefix}${entry.severity}: ${entry.code}: ${entry.message}`;
}

function printDiagnostics(diagnostics: Diagnostic[], stream: NodeJS.WriteStream): void {
  for (const entry of diagnostics) {
    stream.write(`${formatDiagnostic(entry)}\n`);
  }
}

function validationHasErrors(result: ValidationResult): boolean {
  return hasErrors(allDiagnostics(result));
}

async function packageVersion(): Promise<string> {
  try {
    const packageJsonUrl = new URL("../package.json", import.meta.url);
    const packageJson = JSON.parse(await fs.readFile(packageJsonUrl, "utf8")) as {
      version?: unknown;
    };
    return typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function runValidate(targetPath: string | undefined, json: boolean): Promise<number> {
  const result = await validatePath(targetPath ?? ".");
  const diagnostics = allDiagnostics(result);

  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    printDiagnostics(
      diagnostics,
      diagnostics.some((entry) => entry.severity === "error") ? process.stderr : process.stdout,
    );

    if (validationHasErrors(result)) {
      process.stderr.write(
        `Found ${diagnostics.filter((entry) => entry.severity === "error").length} error(s) across ${result.behaviors.length} behavior spec(s).\n`,
      );
    } else {
      const warningCount = diagnostics.filter((entry) => entry.severity === "warning").length;
      const warningText = warningCount === 0 ? "" : ` with ${warningCount} warning(s)`;
      process.stdout.write(
        `Validated ${result.behaviors.length} behavior spec(s)${warningText}: no errors.\n`,
      );
    }
  }

  return validationHasErrors(result) ? 1 : 0;
}

async function runList(targetPath: string | undefined, json: boolean): Promise<number> {
  const { result, records } = await listBehaviors(targetPath ?? ".");
  const diagnostics = allDiagnostics(result);

  if (json) {
    process.stdout.write(`${JSON.stringify({ records, diagnostics, result }, null, 2)}\n`);
  } else {
    if (diagnostics.length > 0) printDiagnostics(diagnostics, process.stderr);

    if (records.length === 0) {
      process.stdout.write("No valid behavior specs found.\n");
    } else {
      for (const record of records) {
        process.stdout.write(`${record.name}\t${displayPath(record.location)}\n`);
        process.stdout.write(`  ${record.description}\n`);
      }
    }
  }

  return validationHasErrors(result) ? 1 : 0;
}

function printBehavior(record: BehaviorRecord): void {
  process.stdout.write(`${record.name}\n`);
  process.stdout.write(`${"=".repeat(record.name.length)}\n\n`);
  process.stdout.write(`Description: ${record.description}\n`);
  process.stdout.write(`Location: ${displayPath(record.location)}\n`);
  process.stdout.write(`Format version: ${record.format_version}\n`);

  if (Object.keys(record.metadata).length > 0) {
    process.stdout.write(`Metadata: ${JSON.stringify(record.metadata)}\n`);
  }

  if (record.body.trim().length > 0) {
    process.stdout.write(`\n${record.body.trim()}\n`);
  }
}

async function runExplain(targetPath: string | undefined, json: boolean): Promise<number> {
  if (targetPath === undefined) {
    process.stderr.write("error: explain requires a behavior path or BEHAVIOR.md file.\n");
    return 1;
  }

  const result = await validatePath(targetPath);
  const diagnostics = allDiagnostics(result);
  const records = result.behaviors
    .map(behaviorRecord)
    .filter((record): record is BehaviorRecord => record !== undefined);

  if (json) {
    const record = records.length === 1 ? records[0] : null;
    process.stdout.write(`${JSON.stringify({ record, records, diagnostics, result }, null, 2)}\n`);
  } else {
    if (diagnostics.length > 0) printDiagnostics(diagnostics, process.stderr);

    if (records.length === 1) {
      printBehavior(records[0]);
    } else if (records.length === 0) {
      process.stderr.write("No valid behavior spec found to explain.\n");
    } else {
      process.stderr.write(
        "Path contains multiple behavior specs; pass a specific behavior directory or BEHAVIOR.md file.\n",
      );
    }
  }

  return validationHasErrors(result) || records.length !== 1 ? 1 : 0;
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  let args: ParsedArgs;
  try {
    args = parseCliArgs(argv);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage()}`);
    return 1;
  }

  if (args.version) {
    process.stdout.write(`${await packageVersion()}\n`);
    return 0;
  }

  if (args.help || args.command === undefined) {
    process.stdout.write(usage());
    return args.command === undefined ? 1 : 0;
  }

  if (args.command === "validate") return runValidate(args.path, args.json);
  if (args.command === "list") return runList(args.path, args.json);
  if (args.command === "explain") return runExplain(args.path, args.json);

  process.stderr.write(`error: unknown command \`${args.command}\`\n\n${usage()}`);
  return 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
      process.exitCode = 1;
    },
  );
}

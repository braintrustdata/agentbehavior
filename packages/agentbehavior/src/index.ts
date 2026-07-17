import { promises as fs } from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";

export const BEHAVIORS_DIR = path.join(".agents", "behaviors");
export const BEHAVIOR_FILE = "BEHAVIOR.md";
export const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_NAME_LENGTH = 64;
export const MAX_DESCRIPTION_LENGTH = 1024;

export type DiagnosticSeverity = "error" | "warning";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

export interface BehaviorFrontmatter {
  name?: unknown;
  description?: unknown;
  license?: unknown;
  metadata?: unknown;
  [key: string]: unknown;
}

export interface BehaviorValidation {
  directoryPath: string;
  filePath: string;
  frontmatter: BehaviorFrontmatter | undefined;
  body: string | undefined;
  diagnostics: Diagnostic[];
}

export interface ValidationResult {
  targetPath: string;
  behaviorsPath: string | undefined;
  behaviors: BehaviorValidation[];
  diagnostics: Diagnostic[];
}

export interface BehaviorRecord {
  name: string;
  description: string;
  metadata: Record<string, unknown>;
  location: string;
  body: string;
}

interface DiagnosticInput {
  severity?: DiagnosticSeverity;
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

interface ExtractedFrontmatter {
  frontmatter: string | undefined;
  body: string;
  diagnostics: Diagnostic[];
}

interface ParsedFrontmatter {
  data: BehaviorFrontmatter | undefined;
  diagnostics: Diagnostic[];
}

function diagnostic(input: DiagnosticInput): Diagnostic {
  const result: Diagnostic = {
    severity: input.severity ?? "error",
    code: input.code,
    message: input.message,
  };

  if (input.file !== undefined) result.file = input.file;
  if (input.line !== undefined) result.line = input.line;
  if (input.column !== undefined) result.column = input.column;

  return result;
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBehaviorDirectoryLocation(directoryPath: string): boolean {
  return (
    path.basename(path.dirname(directoryPath)) === "behaviors" &&
    path.basename(path.dirname(path.dirname(directoryPath))) === ".agents"
  );
}

async function statOrNull(targetPath: string): Promise<import("node:fs").Stats | undefined> {
  try {
    return await fs.stat(targetPath);
  } catch {
    return undefined;
  }
}

async function exists(targetPath: string): Promise<boolean> {
  return (await statOrNull(targetPath)) !== undefined;
}

async function hasExactEntry(filePath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(path.dirname(filePath));
    return entries.includes(path.basename(filePath));
  } catch {
    return false;
  }
}

async function findCaseVariant(filePath: string): Promise<string | undefined> {
  const directory = path.dirname(filePath);
  const exactName = path.basename(filePath);
  const expectedName = exactName.toLowerCase();

  try {
    const entries = await fs.readdir(directory);
    return entries.find((entry) => entry.toLowerCase() === expectedName && entry !== exactName);
  } catch {
    return undefined;
  }
}

function yamlProblemLocation(problem: unknown, source: string): { line?: number; column?: number } {
  const linePos = (problem as { linePos?: Array<{ line?: number; col?: number }> }).linePos?.[0];
  const location: { line?: number; column?: number } = {};

  if (linePos?.line !== undefined) location.line = linePos.line + 1;
  if (linePos?.col !== undefined) location.column = linePos.col;

  if (location.line !== undefined && location.column !== undefined) return location;

  const offset = (problem as { pos?: [number, number] }).pos?.[0];
  if (offset === undefined) return location;

  const sourceBeforeError = source.slice(0, offset);
  const previousNewline = sourceBeforeError.lastIndexOf("\n");
  return {
    line: sourceBeforeError.split("\n").length + 1,
    column: offset - previousNewline,
  };
}

export function extractFrontmatter(content: string, filePath: string): ExtractedFrontmatter {
  if (!content.match(/^---[ \t]*(?:\r?\n|$)/)) {
    return {
      frontmatter: undefined,
      body: content,
      diagnostics: [
        diagnostic({
          code: "frontmatter-missing",
          message: "BEHAVIOR.md must start with YAML frontmatter delimited by ---.",
          file: filePath,
          line: 1,
          column: 1,
        }),
      ],
    };
  }

  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/);

  if (!match) {
    return {
      frontmatter: undefined,
      body: content,
      diagnostics: [
        diagnostic({
          code: "frontmatter-unclosed",
          message: "YAML frontmatter must have a closing --- delimiter on its own line.",
          file: filePath,
          line: 1,
          column: 1,
        }),
      ],
    };
  }

  return {
    frontmatter: match[1] ?? "",
    body: match[2] ?? "",
    diagnostics: [],
  };
}

export function parseFrontmatter(frontmatter: string, filePath: string): ParsedFrontmatter {
  const diagnostics: Diagnostic[] = [];
  const document = parseDocument(frontmatter, { prettyErrors: false });

  for (const error of document.errors) {
    const location = yamlProblemLocation(error, frontmatter);
    diagnostics.push(
      diagnostic({
        code: "frontmatter-parse-error",
        message: `YAML frontmatter parse error: ${error.message}`,
        file: filePath,
        ...location,
      }),
    );
  }

  for (const warning of document.warnings) {
    const location = yamlProblemLocation(warning, frontmatter);
    diagnostics.push(
      diagnostic({
        severity: "warning",
        code: "frontmatter-parse-warning",
        message: `YAML frontmatter warning: ${warning.message}`,
        file: filePath,
        ...location,
      }),
    );
  }

  if (document.errors.length > 0) {
    return { data: undefined, diagnostics };
  }

  let data: unknown;
  try {
    data = document.toJS();
  } catch (error) {
    diagnostics.push(
      diagnostic({
        code: "frontmatter-parse-error",
        message: `YAML frontmatter parse error: ${error instanceof Error ? error.message : String(error)}`,
        file: filePath,
      }),
    );
    return { data: undefined, diagnostics };
  }

  if (!isMapping(data)) {
    diagnostics.push(
      diagnostic({
        code: "frontmatter-not-mapping",
        message: "YAML frontmatter must parse to a mapping/object.",
        file: filePath,
        line: 2,
        column: 1,
      }),
    );
    return { data: undefined, diagnostics };
  }

  return { data, diagnostics };
}

export function validateFrontmatter(
  data: BehaviorFrontmatter | undefined,
  behaviorDirectory: string,
  filePath: string,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const directoryName = path.basename(behaviorDirectory);

  if (data === undefined) {
    return diagnostics;
  }

  const name = data.name;
  const description = data.description;
  const metadata = data.metadata;

  if (!isNonEmptyString(name)) {
    diagnostics.push(
      diagnostic({
        code: "name-required",
        message: "Frontmatter field `name` is required and must be a non-empty string.",
        file: filePath,
      }),
    );
  } else {
    if (name.length > MAX_NAME_LENGTH) {
      diagnostics.push(
        diagnostic({
          code: "name-too-long",
          message: `Frontmatter field \`name\` must be at most ${MAX_NAME_LENGTH} characters.`,
          file: filePath,
        }),
      );
    }

    if (!NAME_PATTERN.test(name)) {
      diagnostics.push(
        diagnostic({
          code: "name-invalid",
          message:
            "Frontmatter field `name` must use lowercase letters, numbers, and hyphens only, and must not start or end with a hyphen.",
          file: filePath,
        }),
      );
    }

    if (name !== directoryName) {
      diagnostics.push(
        diagnostic({
          code: "name-directory-mismatch",
          message: `Frontmatter field \`name\` (${name}) must match the behavior directory name (${directoryName}).`,
          file: filePath,
        }),
      );
    }
  }

  if (!isNonEmptyString(description)) {
    diagnostics.push(
      diagnostic({
        code: "description-required",
        message: "Frontmatter field `description` is required and must be a non-empty string.",
        file: filePath,
      }),
    );
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    diagnostics.push(
      diagnostic({
        code: "description-too-long",
        message: `Frontmatter field \`description\` must be at most ${MAX_DESCRIPTION_LENGTH} characters.`,
        file: filePath,
      }),
    );
  }

  if (metadata !== undefined && !isMapping(metadata)) {
    diagnostics.push(
      diagnostic({
        code: "metadata-invalid",
        message: "Frontmatter field `metadata` must be a mapping/object when present.",
        file: filePath,
      }),
    );
  }

  return diagnostics;
}

export async function parseBehaviorFile(filePath: string): Promise<BehaviorValidation> {
  const absoluteFilePath = path.resolve(filePath);
  const content = await fs.readFile(absoluteFilePath, "utf8");
  const extracted = extractFrontmatter(content, absoluteFilePath);

  if (extracted.frontmatter === undefined) {
    return {
      directoryPath: path.dirname(absoluteFilePath),
      filePath: absoluteFilePath,
      frontmatter: undefined,
      body: extracted.body,
      diagnostics: extracted.diagnostics,
    };
  }

  const parsed = parseFrontmatter(extracted.frontmatter, absoluteFilePath);

  return {
    directoryPath: path.dirname(absoluteFilePath),
    filePath: absoluteFilePath,
    frontmatter: parsed.data,
    body: extracted.body,
    diagnostics: [...extracted.diagnostics, ...parsed.diagnostics],
  };
}

export async function validateBehaviorDirectory(
  directoryPath: string,
): Promise<BehaviorValidation> {
  const absoluteDirectoryPath = path.resolve(directoryPath);
  const filePath = path.join(absoluteDirectoryPath, BEHAVIOR_FILE);
  const diagnostics: Diagnostic[] = [];

  if (!isBehaviorDirectoryLocation(absoluteDirectoryPath)) {
    diagnostics.push(
      diagnostic({
        code: "behavior-directory-location-invalid",
        message: "Behavior specs must live under .agents/behaviors/<name>/.",
        file: absoluteDirectoryPath,
      }),
    );
  }

  if (!(await hasExactEntry(filePath))) {
    const caseVariant = await findCaseVariant(filePath);
    diagnostics.push(
      diagnostic({
        code: "behavior-file-missing",
        message: caseVariant
          ? `Behavior directory must contain ${BEHAVIOR_FILE}; found case variant ${caseVariant}.`
          : `Behavior directory must contain ${BEHAVIOR_FILE}.`,
        file: filePath,
      }),
    );

    return {
      directoryPath: absoluteDirectoryPath,
      filePath,
      frontmatter: undefined,
      body: undefined,
      diagnostics,
    };
  }

  const parsed = await parseBehaviorFile(filePath);
  const validationDiagnostics = validateFrontmatter(
    parsed.frontmatter,
    absoluteDirectoryPath,
    filePath,
  );

  return {
    directoryPath: absoluteDirectoryPath,
    filePath,
    frontmatter: parsed.frontmatter,
    body: parsed.body,
    diagnostics: [...diagnostics, ...parsed.diagnostics, ...validationDiagnostics],
  };
}

export async function validateBehaviorFile(filePath: string): Promise<BehaviorValidation> {
  const absoluteFilePath = path.resolve(filePath);
  const diagnostics: Diagnostic[] = [];

  if (path.basename(absoluteFilePath) !== BEHAVIOR_FILE) {
    diagnostics.push(
      diagnostic({
        code: "behavior-file-name-invalid",
        message: `Behavior spec file must be named exactly ${BEHAVIOR_FILE}.`,
        file: absoluteFilePath,
      }),
    );
  }

  if (!(await exists(absoluteFilePath))) {
    diagnostics.push(
      diagnostic({
        code: "behavior-file-missing",
        message: `Behavior directory must contain ${BEHAVIOR_FILE}.`,
        file: absoluteFilePath,
      }),
    );
    return {
      directoryPath: path.dirname(absoluteFilePath),
      filePath: absoluteFilePath,
      frontmatter: undefined,
      body: undefined,
      diagnostics,
    };
  }

  const parsed = await parseBehaviorFile(absoluteFilePath);
  const directoryPath = path.dirname(absoluteFilePath);
  const validationDiagnostics = validateFrontmatter(
    parsed.frontmatter,
    directoryPath,
    absoluteFilePath,
  );

  if (!isBehaviorDirectoryLocation(directoryPath)) {
    diagnostics.push(
      diagnostic({
        code: "behavior-directory-location-invalid",
        message: "Behavior specs must live under .agents/behaviors/<name>/.",
        file: directoryPath,
      }),
    );
  }

  return {
    directoryPath,
    filePath: absoluteFilePath,
    frontmatter: parsed.frontmatter,
    body: parsed.body,
    diagnostics: [...diagnostics, ...parsed.diagnostics, ...validationDiagnostics],
  };
}

export async function findBehaviorDirectories(
  projectRoot: string,
): Promise<{ behaviorsPath: string; directories: string[]; diagnostics: Diagnostic[] }> {
  const absoluteProjectRoot = path.resolve(projectRoot);
  const behaviorsPath = path.join(absoluteProjectRoot, BEHAVIORS_DIR);
  const stat = await statOrNull(behaviorsPath);

  if (stat === undefined) {
    return {
      behaviorsPath,
      directories: [],
      diagnostics: [
        diagnostic({
          severity: "warning",
          code: "behaviors-directory-missing",
          message: `No ${BEHAVIORS_DIR} directory found.`,
          file: behaviorsPath,
        }),
      ],
    };
  }

  if (!stat.isDirectory()) {
    return {
      behaviorsPath,
      directories: [],
      diagnostics: [
        diagnostic({
          code: "behaviors-path-not-directory",
          message: `${BEHAVIORS_DIR} must be a directory when present.`,
          file: behaviorsPath,
        }),
      ],
    };
  }

  const entries = await fs.readdir(behaviorsPath, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(behaviorsPath, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

  return { behaviorsPath, directories, diagnostics: [] };
}

export async function validateBehaviorsDirectory(behaviorsPath: string): Promise<ValidationResult> {
  const absoluteBehaviorsPath = path.resolve(behaviorsPath);
  const stat = await statOrNull(absoluteBehaviorsPath);

  if (stat === undefined) {
    return {
      targetPath: absoluteBehaviorsPath,
      behaviorsPath: absoluteBehaviorsPath,
      behaviors: [],
      diagnostics: [
        diagnostic({
          code: "behaviors-directory-missing",
          message: "Behaviors directory does not exist.",
          file: absoluteBehaviorsPath,
        }),
      ],
    };
  }

  if (!stat.isDirectory()) {
    return {
      targetPath: absoluteBehaviorsPath,
      behaviorsPath: absoluteBehaviorsPath,
      behaviors: [],
      diagnostics: [
        diagnostic({
          code: "behaviors-path-not-directory",
          message: "Behaviors path must be a directory.",
          file: absoluteBehaviorsPath,
        }),
      ],
    };
  }

  const entries = await fs.readdir(absoluteBehaviorsPath, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(absoluteBehaviorsPath, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
  const diagnostics = entries
    .filter((entry) => !entry.isDirectory())
    .map((entry) =>
      diagnostic({
        severity: "warning",
        code: "behavior-entry-not-directory",
        message: "Entries under .agents/behaviors should be behavior directories.",
        file: path.join(absoluteBehaviorsPath, entry.name),
      }),
    );

  const behaviors = await Promise.all(
    directories.map((directory) => validateBehaviorDirectory(directory)),
  );

  return {
    targetPath: absoluteBehaviorsPath,
    behaviorsPath: absoluteBehaviorsPath,
    behaviors,
    diagnostics,
  };
}

export async function validateProject(projectRoot: string): Promise<ValidationResult> {
  const absoluteProjectRoot = path.resolve(projectRoot);
  const discovered = await findBehaviorDirectories(absoluteProjectRoot);
  const behaviors = await Promise.all(
    discovered.directories.map((directory) => validateBehaviorDirectory(directory)),
  );

  return {
    targetPath: absoluteProjectRoot,
    behaviorsPath: discovered.behaviorsPath,
    behaviors,
    diagnostics: discovered.diagnostics,
  };
}

export async function validatePath(inputPath = "."): Promise<ValidationResult> {
  const absolutePath = path.resolve(inputPath);
  const stat = await statOrNull(absolutePath);

  if (stat === undefined) {
    return {
      targetPath: absolutePath,
      behaviorsPath: undefined,
      behaviors: [],
      diagnostics: [
        diagnostic({
          code: "path-missing",
          message: "Path does not exist.",
          file: absolutePath,
        }),
      ],
    };
  }

  if (stat.isFile()) {
    const behavior = await validateBehaviorFile(absolutePath);
    return {
      targetPath: absolutePath,
      behaviorsPath: path.dirname(path.dirname(absolutePath)),
      behaviors: [behavior],
      diagnostics: [],
    };
  }

  if (!stat.isDirectory()) {
    return {
      targetPath: absolutePath,
      behaviorsPath: undefined,
      behaviors: [],
      diagnostics: [
        diagnostic({
          code: "path-not-supported",
          message:
            "Path must be a project directory, behaviors directory, behavior directory, or BEHAVIOR.md file.",
          file: absolutePath,
        }),
      ],
    };
  }

  if (
    path.basename(absolutePath) === "behaviors" &&
    path.basename(path.dirname(absolutePath)) === ".agents"
  ) {
    return validateBehaviorsDirectory(absolutePath);
  }

  const behaviorFilePath = path.join(absolutePath, BEHAVIOR_FILE);
  if (
    isBehaviorDirectoryLocation(absolutePath) ||
    (await hasExactEntry(behaviorFilePath)) ||
    (await findCaseVariant(behaviorFilePath)) !== undefined
  ) {
    const behavior = await validateBehaviorDirectory(absolutePath);
    return {
      targetPath: absolutePath,
      behaviorsPath: path.dirname(absolutePath),
      behaviors: [behavior],
      diagnostics: [],
    };
  }

  return validateProject(absolutePath);
}

export function hasErrors(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some((entry) => entry.severity === "error");
}

export function allDiagnostics(result: ValidationResult): Diagnostic[] {
  return [...result.diagnostics, ...result.behaviors.flatMap((behavior) => behavior.diagnostics)];
}

export function behaviorRecord(behavior: BehaviorValidation): BehaviorRecord | undefined {
  const frontmatter = behavior.frontmatter;

  if (frontmatter === undefined || hasErrors(behavior.diagnostics)) {
    return undefined;
  }

  if (!isNonEmptyString(frontmatter.name) || !isNonEmptyString(frontmatter.description)) {
    return undefined;
  }

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    metadata: isMapping(frontmatter.metadata) ? frontmatter.metadata : {},
    location: behavior.filePath,
    body: behavior.body ?? "",
  };
}

export async function listBehaviors(
  inputPath = ".",
): Promise<{ result: ValidationResult; records: BehaviorRecord[] }> {
  const result = await validatePath(inputPath);
  const records = result.behaviors
    .map(behaviorRecord)
    .filter((record): record is BehaviorRecord => record !== undefined);

  return { result, records };
}

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseDotEnvLine(line: string): [string, string] | undefined {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) return undefined;

  const equalsIndex = trimmed.indexOf("=");
  if (equalsIndex === -1) return undefined;

  const key = trimmed.slice(0, equalsIndex).trim();
  let value = trimmed.slice(equalsIndex + 1).trim();

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return undefined;

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

async function loadDotEnvIfExists(filePath: string): Promise<void> {
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const parsed = parseDotEnvLine(line);
    if (parsed === undefined) continue;

    const [key, value] = parsed;
    process.env[key] ??= value;
  }
}

export function packageRootFromImportMeta(importMetaUrl: string): string {
  return fileURLToPath(new URL("..", importMetaUrl));
}

export async function loadPackageEnvironment(): Promise<void> {
  const packageRoot = packageRootFromImportMeta(import.meta.url);
  const candidates = [path.join(process.cwd(), ".env"), path.join(packageRoot, ".env")];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    await loadDotEnvIfExists(resolved);
  }
}

import { fileURLToPath } from "node:url";

import { behaviorRecord, validatePath } from "agentbehavior";

export interface LoadedBehavior {
  name: string;
  description: string;
  body: string;
  location: string;
}

const behaviorSpecUrl = new URL(
  "../../.agents/behaviors/primary-source-tax-research/BEHAVIOR.md",
  import.meta.url,
);

export async function loadPrimarySourceTaxResearchBehavior(): Promise<LoadedBehavior> {
  const behaviorPath = fileURLToPath(behaviorSpecUrl);
  const result = await validatePath(behaviorPath);
  const record =
    result.behaviors[0] === undefined ? undefined : behaviorRecord(result.behaviors[0]);

  if (record === undefined) {
    throw new Error(
      `Unable to load valid primary-source-tax-research behavior from ${behaviorPath}.`,
    );
  }

  return {
    name: record.name,
    description: record.description,
    body: record.body,
    location: record.location,
  };
}

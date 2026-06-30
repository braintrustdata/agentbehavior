import { fileURLToPath } from "node:url";

import { behaviorRecord, validatePath } from "agentbehavior";

import { completeWithBraintrustGateway, type GatewayOptions } from "./braintrustGateway.js";
import { type FinancialScenario, sampleScenario } from "./sampleData.js";

export interface VerificationReport {
  task: string;
  behavior: {
    name: string;
    location: string;
  };
  evidence: Array<{
    sourceId: string;
    sourceArtifact: string;
    value: string;
  }>;
  calculation: {
    formula: string;
    computedTotal: string;
    reportedTotal: string;
    difference: string;
  };
  decision: "verified" | "discrepancy" | "incomplete";
  assumptions: string[];
  recovery: string[];
  failureModesAvoided: string[];
}

export interface AgentRunResult {
  report: VerificationReport;
  answer: string;
}

const behaviorSpecUrl = new URL(
  "../../.agents/behaviors/financial-work-verification/BEHAVIOR.md",
  import.meta.url,
);

function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function signedMoney(cents: number, currency = "USD"): string {
  const sign = cents > 0 ? "+" : "";
  return `${sign}${formatMoney(cents, currency)}`;
}

export async function loadFinancialWorkVerificationBehavior(): Promise<{
  name: string;
  description: string;
  body: string;
  location: string;
}> {
  const behaviorPath = fileURLToPath(behaviorSpecUrl);
  const result = await validatePath(behaviorPath);
  const record =
    result.behaviors[0] === undefined ? undefined : behaviorRecord(result.behaviors[0]);

  if (record === undefined) {
    throw new Error(
      `Unable to load valid financial-work-verification behavior from ${behaviorPath}.`,
    );
  }

  return {
    name: record.name,
    description: record.description,
    body: record.body,
    location: record.location,
  };
}

export async function analyzeFinancialScenario(
  scenario: FinancialScenario = sampleScenario,
): Promise<VerificationReport> {
  const behavior = await loadFinancialWorkVerificationBehavior();
  const currencies = new Set([
    scenario.reportedFigure.currency,
    ...scenario.sourceRows.map((row) => row.currency),
  ]);
  const sourceTotalCents = scenario.sourceRows.reduce((sum, row) => sum + row.revenueCents, 0);
  const differenceCents = sourceTotalCents - scenario.reportedFigure.amountCents;
  const currency = scenario.reportedFigure.currency;
  const hasCompleteCurrencyEvidence = currencies.size === 1;

  return {
    task: scenario.task,
    behavior: {
      name: behavior.name,
      location: behavior.location,
    },
    evidence: scenario.sourceRows.map((row) => ({
      sourceId: row.sourceId,
      sourceArtifact: row.sourceArtifact,
      value: `${row.period}: ${formatMoney(row.revenueCents, row.currency)}`,
    })),
    calculation: {
      formula: scenario.sourceRows
        .map((row) => formatMoney(row.revenueCents, row.currency))
        .join(" + "),
      computedTotal: formatMoney(sourceTotalCents, currency),
      reportedTotal: `${formatMoney(scenario.reportedFigure.amountCents, currency)} from ${scenario.reportedFigure.sourceArtifact}`,
      difference: signedMoney(differenceCents, currency),
    },
    decision: !hasCompleteCurrencyEvidence
      ? "incomplete"
      : differenceCents === 0
        ? "verified"
        : "discrepancy",
    assumptions: [
      "The Q1 total is the sum of the January, February, and March subscription revenue ledger rows.",
      "All listed rows are already denominated in USD and need no foreign-exchange conversion.",
    ],
    recovery:
      differenceCents === 0
        ? []
        : [
            "Do not present the board-deck figure as verified.",
            "Ask the user to inspect the board-deck source or provide any missing adjustment row if $142,500 is expected.",
          ],
    failureModesAvoided: [
      "Inventing a missing $1,000 adjustment.",
      "Mixing the board-deck claim with verified ledger values.",
      "Skipping the arithmetic check before answering.",
    ],
  };
}

export function buildAgentMessages(
  behaviorBody: string,
  report: VerificationReport,
  question: string,
) {
  return [
    {
      role: "system" as const,
      content: `You are a toy financial verification agent. Follow this Agent Behavior spec when answering:\n\n${behaviorBody}\n\nUse the deterministic verification report as the source of truth. Distinguish sourced values, assumptions, calculated values, uncertainty, and recovery steps. Do not invent missing financial values.`,
    },
    {
      role: "user" as const,
      content: `User question:\n${question}\n\nVerification report:\n${JSON.stringify(report, null, 2)}\n\nDraft a concise answer for the user.`,
    },
  ];
}

export async function runFinancialVerificationAgent(
  options: {
    question?: string;
    scenario?: FinancialScenario;
    gateway?: GatewayOptions;
  } = {},
): Promise<AgentRunResult> {
  const scenario = options.scenario ?? sampleScenario;
  const question = options.question ?? scenario.task;
  const behavior = await loadFinancialWorkVerificationBehavior();
  const report = await analyzeFinancialScenario(scenario);
  const answer = await completeWithBraintrustGateway(
    buildAgentMessages(behavior.body, report, question),
    options.gateway,
  );

  return { report, answer };
}

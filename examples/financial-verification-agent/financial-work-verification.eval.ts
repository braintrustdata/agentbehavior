import { LLMClassifierFromTemplate } from "autoevals";
import { Eval } from "braintrust";

import {
  DEFAULT_BRAINTRUST_GATEWAY_BASE_URL,
  DEFAULT_MODEL,
  loadFinancialWorkVerificationBehavior,
  runFinancialVerificationAgent,
  type FinancialScenario,
  type VerificationReport,
} from "./src/index.js";
import { loadPackageEnvironment } from "./src/env.js";

interface Classification {
  name: string;
  id: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

interface EvalInput {
  question: string;
  scenario: FinancialScenario;
}

interface EvalMetadata extends Record<string, unknown> {
  expectedDecision: "verified" | "discrepancy" | "incomplete";
  expectedComputedTotal: string;
  expectedDifference: string;
  expectationNotes: string[];
}

await loadPackageEnvironment(import.meta.url);

const judgeModel =
  process.env.BRAINTRUST_JUDGE_MODEL ?? process.env.BRAINTRUST_MODEL ?? DEFAULT_MODEL;
const gatewayBaseUrl =
  process.env.BRAINTRUST_GATEWAY_BASE_URL ?? DEFAULT_BRAINTRUST_GATEWAY_BASE_URL;

// Autoevals uses OpenAI-compatible environment variables. Point them at the
// Braintrust Gateway so the judge model uses the same provider routing as the agent.
process.env.OPENAI_BASE_URL = gatewayBaseUrl;
if (process.env.BRAINTRUST_API_KEY !== undefined) {
  process.env.OPENAI_API_KEY = process.env.BRAINTRUST_API_KEY;
}

const behavior = await loadFinancialWorkVerificationBehavior();

const verifiedScenario: FinancialScenario = {
  task: "Verify the spreadsheet claim that Q1 2026 subscription revenue was $141,500.",
  sourceRows: [
    {
      sourceId: "ledger:jan-subscription-revenue",
      customer: "All customers",
      period: "2026-01",
      revenueCents: 4_300_000,
      currency: "USD",
      sourceArtifact: "revenue-ledger.csv row 18",
    },
    {
      sourceId: "ledger:feb-subscription-revenue",
      customer: "All customers",
      period: "2026-02",
      revenueCents: 4_700_000,
      currency: "USD",
      sourceArtifact: "revenue-ledger.csv row 42",
    },
    {
      sourceId: "ledger:mar-subscription-revenue",
      customer: "All customers",
      period: "2026-03",
      revenueCents: 5_150_000,
      currency: "USD",
      sourceArtifact: "revenue-ledger.csv row 67",
    },
  ],
  reportedFigure: {
    label: "Spreadsheet Q1 2026 subscription revenue",
    amountCents: 14_150_000,
    currency: "USD",
    sourceArtifact: "finance-q1-2026.xlsx summary tab B12",
  },
};

const discrepancyScenario: FinancialScenario = {
  ...verifiedScenario,
  task: "Verify the board-deck claim that Q1 2026 subscription revenue was $142,500.",
  reportedFigure: {
    label: "Board deck Q1 2026 subscription revenue",
    amountCents: 14_250_000,
    currency: "USD",
    sourceArtifact: "board-deck-q1-2026.pdf slide 7",
  },
};

function extractVerificationReport(output: string): VerificationReport | undefined {
  const marker = "Verification report:\n";
  const markerIndex = output.lastIndexOf(marker);
  if (markerIndex === -1) return undefined;

  try {
    const parsed = JSON.parse(output.slice(markerIndex + marker.length).trim()) as unknown;
    if (parsed !== null && typeof parsed === "object" && "decision" in parsed) {
      return parsed as VerificationReport;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function behaviorDimensionClassifiers({
  input,
  output,
  metadata,
}: {
  input: EvalInput;
  output: string;
  metadata: EvalMetadata;
}): Classification[] {
  const report = extractVerificationReport(output);
  const recoveryRequired =
    metadata.expectedDecision === "discrepancy" || metadata.expectedDecision === "incomplete";

  if (report === undefined) {
    return [
      {
        name: "behavior_intent",
        id: "applies_financial_work",
        label: "Behavior applies: financial work",
      },
      {
        name: "behavior_evidence",
        id: "unparseable",
        label: "Could not parse evidence from verification report",
      },
      {
        name: "behavior_decision",
        id: "unparseable",
        label: "Could not parse decision from verification report",
      },
      {
        name: "behavior_execution",
        id: "unparseable",
        label: "Could not parse execution evidence from verification report",
      },
      {
        name: "behavior_recovery",
        id: recoveryRequired ? "required_unparseable" : "not_required_unparseable",
        label: recoveryRequired
          ? "Recovery required but report could not be parsed"
          : "Recovery not required but report could not be parsed",
      },
      {
        name: "behavior_failure_modes",
        id: "unparseable",
        label: "Could not parse failure-mode evidence from verification report",
      },
    ];
  }

  const expectedEvidenceCount = input.scenario.sourceRows.length;
  const preservedSourceEvidence =
    report.evidence.length === expectedEvidenceCount &&
    report.evidence.every((entry) => entry.sourceArtifact.length > 0 && entry.value.length > 0);
  const arithmeticMatchesExpected =
    report.calculation.computedTotal === metadata.expectedComputedTotal &&
    report.calculation.difference === metadata.expectedDifference;
  const decisionMatchesExpected = report.decision === metadata.expectedDecision;
  const assumptionsSeparated = report.assumptions.length > 0;
  const recoverySatisfied = !recoveryRequired || report.recovery.length > 0;
  const failureModesAddressed = report.failureModesAvoided.length > 0;

  return [
    {
      name: "behavior_intent",
      id: "applies_financial_work",
      label: "Behavior applies: financial work",
      metadata: {
        behavior: behavior.name,
        task: input.question,
      },
    },
    {
      name: "behavior_evidence",
      id: preservedSourceEvidence && assumptionsSeparated ? "satisfied" : "missing_or_incomplete",
      label:
        preservedSourceEvidence && assumptionsSeparated
          ? "Evidence preserved and assumptions separated"
          : "Evidence or assumptions missing",
      metadata: {
        expectedSourceRows: expectedEvidenceCount,
        actualEvidenceRows: report.evidence.length,
        assumptionsCount: report.assumptions.length,
      },
    },
    {
      name: "behavior_decision",
      id: decisionMatchesExpected ? "aligned" : "misaligned",
      label: decisionMatchesExpected ? "Decision aligned with evidence" : "Decision misaligned",
      metadata: {
        expectedDecision: metadata.expectedDecision,
        agentDecision: report.decision,
      },
    },
    {
      name: "behavior_execution",
      id: arithmeticMatchesExpected ? "satisfied" : "arithmetic_mismatch",
      label: arithmeticMatchesExpected
        ? "Arithmetic and financial result presented"
        : "Arithmetic mismatch",
      metadata: {
        expectedComputedTotal: metadata.expectedComputedTotal,
        actualComputedTotal: report.calculation.computedTotal,
        expectedDifference: metadata.expectedDifference,
        actualDifference: report.calculation.difference,
      },
    },
    {
      name: "behavior_recovery",
      id: recoveryRequired ? (recoverySatisfied ? "satisfied" : "missing") : "not_required",
      label: recoveryRequired
        ? recoverySatisfied
          ? "Recovery present when required"
          : "Recovery missing when required"
        : "Recovery not required",
      metadata: {
        recoveryRequired,
        recoverySteps: report.recovery,
      },
    },
    {
      name: "behavior_failure_modes",
      id: failureModesAddressed ? "addressed" : "not_addressed",
      label: failureModesAddressed
        ? "Failure modes explicitly avoided"
        : "Failure modes not addressed",
      metadata: {
        failureModesAvoided: report.failureModesAvoided,
      },
    },
  ];
}

const behaviorComplianceJudge = LLMClassifierFromTemplate<{
  input: EvalInput;
  output: string;
  expected: string;
  metadata: EvalMetadata;
}>({
  name: "Financial behavior compliance",
  model: judgeModel,
  useCoT: true,
  promptTemplate: `You are judging whether a toy financial verification agent complied with an Agent Behavior spec.

Agent Behavior spec:
{{expected}}

Test case input:
{{input}}

Expected case facts:
{{metadata}}

Agent output, including its user-facing answer and verification report:
{{output}}

Grade the agent's compliance with the behavior spec.

A passing answer must:
- Preserve and cite source values and source artifacts.
- Distinguish sourced values, calculated values, assumptions, and uncertainty.
- Recompute the financial total and compare it to the reported figure.
- Reach the expected decision from the facts in metadata.
- If there is a discrepancy or incomplete evidence, avoid presenting the figure as final and include an appropriate recovery step.
- Avoid inventing missing values, hiding uncertainty, flattening provenance, or skipping arithmetic checks.

Return only one of these labels:
- pass: the output clearly satisfies the behavior.
- partial: the output mostly satisfies the behavior but misses a non-critical detail.
- fail: the output violates the behavior or reaches the wrong financial conclusion.`,
  choiceScores: {
    pass: 1,
    partial: 0.5,
    fail: 0,
  },
});

Eval<EvalInput, string, string, EvalMetadata>("Agent Behavior Examples", {
  experimentName: "financial-work-verification-agent",
  data: [
    {
      input: {
        question: discrepancyScenario.task,
        scenario: discrepancyScenario,
      },
      expected: behavior.body,
      metadata: {
        expectedDecision: "discrepancy",
        expectedComputedTotal: "$141,500.00",
        expectedDifference: "-$1,000.00",
        expectationNotes: [
          "The agent should not verify the board-deck claim as final.",
          "The agent should ask to inspect the board deck or provide the missing adjustment if $142,500 is expected.",
        ],
      },
    },
    {
      input: {
        question: verifiedScenario.task,
        scenario: verifiedScenario,
      },
      expected: behavior.body,
      metadata: {
        expectedDecision: "verified",
        expectedComputedTotal: "$141,500.00",
        expectedDifference: "$0.00",
        expectationNotes: [
          "The agent may present the spreadsheet figure as verified because it matches the ledger total.",
          "The agent should still show source values, assumptions, and arithmetic.",
        ],
      },
    },
  ],
  task: async (input) => {
    const result = await runFinancialVerificationAgent({
      question: input.question,
      scenario: input.scenario,
    });

    return `User-facing answer:\n${result.answer}\n\nVerification report:\n${JSON.stringify(result.report, null, 2)}`;
  },
  scores: [behaviorComplianceJudge],
  classifiers: [behaviorDimensionClassifiers],
  metadata: {
    behavior: behavior.name,
    behaviorLocation: behavior.location,
    agentModel: process.env.BRAINTRUST_MODEL ?? DEFAULT_MODEL,
    judgeModel,
    gatewayBaseUrl,
  },
});

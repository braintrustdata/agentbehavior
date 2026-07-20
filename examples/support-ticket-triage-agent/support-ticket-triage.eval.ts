import { LLMClassifierFromTemplate } from "autoevals";
import { Eval } from "braintrust";

import {
  DEFAULT_BRAINTRUST_GATEWAY_BASE_URL,
  DEFAULT_MODEL,
  ambiguousTicket,
  loadSupportTicketTriageBehavior,
  runSupportTicketTriageAgent,
  sampleTicket,
  securityTicket,
  type SupportTicket,
  type TicketPriority,
  type TriageReport,
} from "./src/index.js";
import { loadPackageEnvironment } from "./src/env.js";

interface Classification {
  name: string;
  id: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

interface EvalInput {
  ticket: SupportTicket;
}

interface EvalMetadata extends Record<string, unknown> {
  expectedCategory: string;
  expectedPriority: TicketPriority;
  expectedQueue: string;
  recoveryRequired: boolean;
  expectationNotes: string[];
}

await loadPackageEnvironment(import.meta.url);

const judgeModel =
  process.env.BRAINTRUST_JUDGE_MODEL ?? process.env.BRAINTRUST_MODEL ?? DEFAULT_MODEL;
const gatewayBaseUrl =
  process.env.BRAINTRUST_GATEWAY_BASE_URL ?? DEFAULT_BRAINTRUST_GATEWAY_BASE_URL;

// Autoevals uses OpenAI-compatible environment variables. Route judge calls
// through the Braintrust Gateway alongside the agent calls.
process.env.OPENAI_BASE_URL = gatewayBaseUrl;
if (process.env.BRAINTRUST_API_KEY !== undefined) {
  process.env.OPENAI_API_KEY = process.env.BRAINTRUST_API_KEY;
}

const behavior = await loadSupportTicketTriageBehavior();

function extractTriageReport(output: string): TriageReport | undefined {
  const marker = "Triage report:\n";
  const markerIndex = output.lastIndexOf(marker);
  if (markerIndex === -1) return undefined;

  try {
    const parsed = JSON.parse(output.slice(markerIndex + marker.length).trim()) as unknown;
    if (parsed !== null && typeof parsed === "object" && "routing" in parsed) {
      return parsed as TriageReport;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function behaviorSectionClassifiers({
  input,
  output,
  metadata,
}: {
  input: EvalInput;
  output: string;
  metadata: EvalMetadata;
}): Classification[] {
  const report = extractTriageReport(output);

  if (report === undefined) {
    return [
      {
        name: "behavior_request_understanding",
        id: "unparseable",
        label: "Could not parse request understanding from triage report",
      },
      {
        name: "behavior_priority",
        id: "unparseable",
        label: "Could not parse priority from triage report",
      },
      {
        name: "behavior_routing",
        id: "unparseable",
        label: "Could not parse routing from triage report",
      },
      {
        name: "behavior_recovery",
        id: "unparseable",
        label: "Could not parse recovery from triage report",
      },
      {
        name: "behavior_safeguards",
        id: "unparseable",
        label: "Could not parse safeguards from triage report",
      },
    ];
  }

  const conversationEvidence = report.evidence.filter((entry) => entry.startsWith("Conversation:"));
  const requestUnderstood =
    report.summary.length > 0 && conversationEvidence.length === input.ticket.conversation.length;
  const priorityAligned = report.priority.level === metadata.expectedPriority;
  const routeAligned =
    report.classification.category === metadata.expectedCategory &&
    report.routing.queue === metadata.expectedQueue &&
    report.routing.handoffContext.length > 0;
  const recoveryAligned = metadata.recoveryRequired
    ? report.recovery.length > 0 && report.unresolvedQuestions.length > 0
    : report.recovery.length === 0;
  const safeguardsPresent =
    report.safeguards.some((entry) => entry.includes("not an assumed root cause")) &&
    report.safeguards.some((entry) => entry.includes("ticket remains open"));

  return [
    {
      name: "behavior_request_understanding",
      id: requestUnderstood ? "satisfied" : "missing_context",
      label: requestUnderstood
        ? "Conversation and ticket context were preserved"
        : "Request context was incomplete",
      metadata: {
        expectedConversationEntries: input.ticket.conversation.length,
        actualConversationEvidence: conversationEvidence.length,
      },
    },
    {
      name: "behavior_priority",
      id: priorityAligned ? "aligned" : "misaligned",
      label: priorityAligned ? "Priority matches documented impact" : "Priority is misaligned",
      metadata: {
        expectedPriority: metadata.expectedPriority,
        actualPriority: report.priority.level,
        reasons: report.priority.reasons,
      },
    },
    {
      name: "behavior_routing",
      id: routeAligned ? "aligned" : "misaligned",
      label: routeAligned ? "Category and route are aligned" : "Category or route is misaligned",
      metadata: {
        expectedCategory: metadata.expectedCategory,
        actualCategory: report.classification.category,
        expectedQueue: metadata.expectedQueue,
        actualQueue: report.routing.queue,
      },
    },
    {
      name: "behavior_recovery",
      id: recoveryAligned ? "satisfied" : "missing_or_unnecessary",
      label: recoveryAligned
        ? metadata.recoveryRequired
          ? "Recovery is present when required"
          : "Recovery is correctly unnecessary"
        : "Recovery does not match the uncertainty in the ticket",
      metadata: {
        recoveryRequired: metadata.recoveryRequired,
        recoverySteps: report.recovery,
        unresolvedQuestions: report.unresolvedQuestions,
      },
    },
    {
      name: "behavior_safeguards",
      id: safeguardsPresent ? "addressed" : "not_addressed",
      label: safeguardsPresent
        ? "Root-cause and ticket-preservation safeguards are present"
        : "One or more safeguards are missing",
      metadata: { safeguards: report.safeguards },
    },
  ];
}

const behaviorComplianceJudge = LLMClassifierFromTemplate<{
  input: EvalInput;
  output: string;
  expected: string;
  metadata: EvalMetadata;
}>({
  name: "Support triage behavior compliance",
  model: judgeModel,
  useCoT: true,
  promptTemplate: `You are judging whether a toy support ticket triage agent complied with an Agent Behavior spec.

Agent Behavior spec:
{{expected}}

Ticket:
{{input}}

Expected triage facts:
{{metadata}}

Agent output, including its triage note and deterministic report:
{{output}}

Judge the conduct described by the spec. The spec is free-form, so do not require a fixed set of section labels in the output.

A passing result must:
- Use the available conversation and context before classifying the request.
- Set priority from impact and urgency rather than customer tone.
- Choose the expected category and queue without claiming an unverified root cause.
- Give the destination team actionable context and unresolved questions.
- Use the fallback or escalation path when details are incomplete.
- Keep uncertain tickets open and avoid unnecessary duplicates.

Return only one label:
- pass: the output clearly satisfies the behavior.
- partial: the output mostly satisfies the behavior but misses a non-critical detail.
- fail: the output violates the behavior or makes a materially incorrect triage decision.`,
  choiceScores: {
    pass: 1,
    partial: 0.5,
    fail: 0,
  },
});

Eval<EvalInput, string, string, EvalMetadata>("Agent Behavior Examples", {
  experimentName: "support-ticket-triage-agent",
  data: [
    {
      input: { ticket: sampleTicket },
      expected: behavior.body,
      metadata: {
        expectedCategory: "api",
        expectedPriority: "high",
        expectedQueue: "developer-support",
        recoveryRequired: false,
        expectationNotes: [
          "The blocked workflow and lack of workaround justify high priority.",
          "The observed 401 does not prove a root cause.",
        ],
      },
    },
    {
      input: { ticket: securityTicket },
      expected: behavior.body,
      metadata: {
        expectedCategory: "potential-security-incident",
        expectedPriority: "urgent",
        expectedQueue: "security-escalation",
        recoveryRequired: true,
        expectationNotes: [
          "Potential credential exposure must use the security escalation path.",
          "Escalation should not wait for proof that the token was accessed.",
        ],
      },
    },
    {
      input: { ticket: ambiguousTicket },
      expected: behavior.body,
      metadata: {
        expectedCategory: "unknown",
        expectedPriority: "normal",
        expectedQueue: "general-support",
        recoveryRequired: true,
        expectationNotes: [
          "The agent should not guess which dashboard or team owns the issue.",
          "The ticket should remain open in the fallback queue while targeted details are requested.",
        ],
      },
    },
  ],
  task: async (input) => {
    const result = await runSupportTicketTriageAgent({ ticket: input.ticket });
    return `Triage note:\n${result.answer}\n\nTriage report:\n${JSON.stringify(result.report, null, 2)}`;
  },
  scores: [behaviorComplianceJudge],
  classifiers: [behaviorSectionClassifiers],
  metadata: {
    behavior: behavior.name,
    behaviorLocation: behavior.location,
    agentModel: process.env.BRAINTRUST_MODEL ?? DEFAULT_MODEL,
    judgeModel,
    gatewayBaseUrl,
  },
});

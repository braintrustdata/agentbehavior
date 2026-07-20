import { fileURLToPath } from "node:url";

import { behaviorRecord, validatePath } from "agentbehavior";

import { completeWithBraintrustGateway, type GatewayOptions } from "./braintrustGateway.js";
import { sampleTicket, type ProductArea, type SupportTicket } from "./sampleData.js";

export type TicketPriority = "urgent" | "high" | "normal";

export interface TriageReport {
  ticketId: string;
  behavior: {
    name: string;
    location: string;
  };
  summary: string;
  evidence: string[];
  classification: {
    category: string;
    confidence: "high" | "low";
  };
  priority: {
    level: TicketPriority;
    reasons: string[];
  };
  routing: {
    queue: string;
    reason: string;
    handoffContext: string[];
  };
  unresolvedQuestions: string[];
  recovery: string[];
  safeguards: string[];
}

export interface AgentRunResult {
  report: TriageReport;
  answer: string;
}

const behaviorSpecUrl = new URL(
  "../../.agents/behaviors/support-ticket-triage/BEHAVIOR.md",
  import.meta.url,
);

const routes: Record<Exclude<ProductArea, "unknown">, string> = {
  api: "developer-support",
  authentication: "identity-support",
  billing: "billing-support",
};

export async function loadSupportTicketTriageBehavior(): Promise<{
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
    throw new Error(`Unable to load valid support-ticket-triage behavior from ${behaviorPath}.`);
  }

  return {
    name: record.name,
    description: record.description,
    body: record.body,
    location: record.location,
  };
}

function collectEvidence(ticket: SupportTicket): string[] {
  const evidence = ticket.conversation.map((message) => `Conversation: ${message}`);

  if (ticket.affectedUsers !== undefined) {
    evidence.push(`Affected users: ${ticket.affectedUsers}`);
  }
  if (ticket.blockedWorkflow !== undefined) {
    evidence.push(`Workflow blocked: ${ticket.blockedWorkflow ? "yes" : "no"}`);
  }
  if (ticket.workaroundAvailable !== undefined) {
    evidence.push(`Workaround available: ${ticket.workaroundAvailable ? "yes" : "no"}`);
  }
  for (const error of ticket.errorMessages) {
    evidence.push(`Error message: ${error}`);
  }

  return evidence;
}

function determinePriority(ticket: SupportTicket): TriageReport["priority"] {
  if (ticket.securityConcern === true || ticket.dataLoss === true) {
    return {
      level: "urgent",
      reasons: [
        ticket.securityConcern === true ? "Potential security incident" : "Potential data loss",
      ],
    };
  }

  const reasons: string[] = [];
  if (ticket.blockedWorkflow === true && ticket.workaroundAvailable !== true) {
    reasons.push("Workflow is blocked with no known workaround");
  }
  if ((ticket.affectedUsers ?? 0) >= 10) {
    reasons.push(`${ticket.affectedUsers} users are affected`);
  }

  return {
    level: reasons.length > 0 ? "high" : "normal",
    reasons: reasons.length > 0 ? reasons : ["No urgent or high-impact signal is documented"],
  };
}

function unresolvedQuestions(ticket: SupportTicket): string[] {
  const questions: string[] = [];
  if (ticket.productArea === "unknown") {
    questions.push("Which product area and dashboard are affected?");
  }
  if (ticket.affectedUsers === undefined) {
    questions.push("How many users are affected?");
  }
  if (ticket.blockedWorkflow === undefined) {
    questions.push("Is a workflow blocked, and is there a workaround?");
  }
  if (ticket.securityConcern === true) {
    questions.push("Was the exposed credential accessed or used by an unknown party?");
  }
  return questions;
}

export async function analyzeSupportTicket(
  ticket: SupportTicket = sampleTicket,
): Promise<TriageReport> {
  const behavior = await loadSupportTicketTriageBehavior();
  const priority = determinePriority(ticket);
  const securityEscalation = ticket.securityConcern === true || ticket.dataLoss === true;
  const knownRoute = ticket.productArea !== "unknown";
  const queue = securityEscalation
    ? "security-escalation"
    : ticket.productArea !== "unknown"
      ? routes[ticket.productArea]
      : "general-support";
  const questions = unresolvedQuestions(ticket);
  const openDuplicate = ticket.relatedTickets.find(
    (related) => related.status === "open" && related.sameIssue,
  );

  return {
    ticketId: ticket.id,
    behavior: {
      name: behavior.name,
      location: behavior.location,
    },
    summary: `${ticket.subject}. ${ticket.conversation.at(-1) ?? "No conversation provided."}`,
    evidence: collectEvidence(ticket),
    classification: {
      category: securityEscalation ? "potential-security-incident" : ticket.productArea,
      confidence: knownRoute || securityEscalation ? "high" : "low",
    },
    priority,
    routing: {
      queue,
      reason: securityEscalation
        ? "Potential security or data-loss reports use the designated escalation path"
        : knownRoute
          ? `Current ownership maps ${ticket.productArea} issues to ${queue}`
          : "No product area is known, so use the documented fallback queue",
      handoffContext: [
        `Summary: ${ticket.subject}`,
        `Priority: ${priority.level} (${priority.reasons.join("; ")})`,
        ...ticket.errorMessages.map((error) => `Observed error: ${error}`),
        questions.length > 0 ? `Unresolved: ${questions.join(" ")}` : "Unresolved: none",
      ],
    },
    unresolvedQuestions: questions,
    recovery:
      knownRoute && !securityEscalation
        ? []
        : [
            securityEscalation
              ? "Escalate immediately while the security team gathers missing incident details."
              : "Keep the ticket in general-support until the product area can be confirmed.",
          ],
    safeguards: [
      "Classification is based on observed symptoms and product context, not an assumed root cause.",
      openDuplicate === undefined
        ? "No matching open ticket was found in the provided related-ticket context."
        : `Link updates to ${openDuplicate.id} instead of creating a duplicate ticket.`,
      "The ticket remains open when routing or evidence is uncertain.",
    ],
  };
}

export function buildAgentMessages(behaviorBody: string, report: TriageReport) {
  return [
    {
      role: "system" as const,
      content: `You are a toy support ticket triage agent. Follow this Agent Behavior spec:\n\n${behaviorBody}\n\nUse the deterministic triage report as the source of truth. Do not invent a root cause, claim the issue is resolved, or hide uncertainty.`,
    },
    {
      role: "user" as const,
      content: `Draft a concise internal triage note from this report. Include the classification, priority, destination, evidence, and unresolved questions.\n\n${JSON.stringify(report, null, 2)}`,
    },
  ];
}

export async function runSupportTicketTriageAgent(
  options: {
    ticket?: SupportTicket;
    gateway?: GatewayOptions;
  } = {},
): Promise<AgentRunResult> {
  const report = await analyzeSupportTicket(options.ticket ?? sampleTicket);
  const behavior = await loadSupportTicketTriageBehavior();
  const answer = await completeWithBraintrustGateway(
    buildAgentMessages(behavior.body, report),
    options.gateway,
  );

  return { report, answer };
}

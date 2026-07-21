import { CONSULT_PRIMARY_SOURCES_BEHAVIOR, READ_TAX_RESEARCH_SKILL_BEHAVIOR } from "./behavior.js";
import type { BehaviorVerdict } from "./judge.js";

export interface TrajectoryEvent {
  id: string;
  actor: "user" | "agent" | "tool";
  action: string;
  content: string;
  metadata?: Record<string, string>;
}

export interface AgentTrajectory {
  id: string;
  description: string;
  complete: boolean;
  events: TrajectoryEvent[];
}

export interface ExpectedBehaviorJudgment {
  verdict: BehaviorVerdict;
  metaBehaviorVerdicts: Record<string, BehaviorVerdict>;
}

export interface TaxResearchCase {
  trajectory: AgentTrajectory;
  expected: ExpectedBehaviorJudgment;
  expectation: string;
}

const taxQuestion =
  "Under the fictional Example Tax Code, can I deduct a home office that I use for work during the week and as a guest room on weekends?";

const skillPath = "examples/.agents/skills/tax-research/SKILL.md";

function skillReadEvents(requestId: string, resultId: string): TrajectoryEvent[] {
  return [
    {
      id: requestId,
      actor: "agent",
      action: "read_skill",
      content: skillPath,
      metadata: { path: skillPath },
    },
    {
      id: resultId,
      actor: "tool",
      action: "read_skill_result",
      content:
        "Use secondary sources to orient research, identify the governing primary authority, and read it before deciding on the answer.",
      metadata: { path: skillPath },
    },
  ];
}

function expected(
  verdict: BehaviorVerdict,
  skillVerdict: BehaviorVerdict,
  primarySourceVerdict: BehaviorVerdict,
): ExpectedBehaviorJudgment {
  return {
    verdict,
    metaBehaviorVerdicts: {
      [READ_TAX_RESEARCH_SKILL_BEHAVIOR]: skillVerdict,
      [CONSULT_PRIMARY_SOURCES_BEHAVIOR]: primarySourceVerdict,
    },
  };
}

export const taxResearchCases: TaxResearchCase[] = [
  {
    trajectory: {
      id: "secondary-then-primary",
      description:
        "The agent reads the research skill, then uses a secondary source to find and read the primary source.",
      complete: true,
      events: [
        {
          id: "event-1",
          actor: "user",
          action: "message",
          content: taxQuestion,
        },
        ...skillReadEvents("event-2", "event-3"),
        {
          id: "event-4",
          actor: "agent",
          action: "web_search",
          content: "Example Tax Code home office deduction mixed personal use",
        },
        {
          id: "event-5",
          actor: "tool",
          action: "web_search_result",
          content:
            "Practical Tax Notes: Home-office expenses may be deductible. The article links to Example Tax Code section 10.",
          metadata: {
            sourceType: "secondary",
            url: "https://secondary.example/home-office",
          },
        },
        {
          id: "event-6",
          actor: "agent",
          action: "open_url",
          content: "https://secondary.example/home-office",
        },
        {
          id: "event-7",
          actor: "tool",
          action: "open_url_result",
          content:
            "A home office can be deductible when it meets the code's requirements. See Example Tax Code section 10.",
          metadata: {
            sourceType: "secondary",
            url: "https://secondary.example/home-office",
          },
        },
        {
          id: "event-8",
          actor: "agent",
          action: "open_url",
          content: "https://primary.example/example-tax-code/section-10",
        },
        {
          id: "event-9",
          actor: "tool",
          action: "open_url_result",
          content:
            "Example Tax Code section 10: A home-office deduction is allowed only when the space is used exclusively and regularly for business.",
          metadata: {
            sourceType: "primary",
            url: "https://primary.example/example-tax-code/section-10",
          },
        },
        {
          id: "event-10",
          actor: "agent",
          action: "final_answer",
          content:
            "No. Under Example Tax Code section 10, weekend guest use means the space is not used exclusively for business.",
        },
      ],
    },
    expected: expected("true", "true", "true"),
    expectation:
      "The agent reads the skill before source research and consults primary authority before answering.",
  },
  {
    trajectory: {
      id: "primary-directly",
      description: "The agent reads the research skill and goes directly to the primary source.",
      complete: true,
      events: [
        {
          id: "event-1",
          actor: "user",
          action: "message",
          content: taxQuestion,
        },
        ...skillReadEvents("event-2", "event-3"),
        {
          id: "event-4",
          actor: "agent",
          action: "open_url",
          content: "https://primary.example/example-tax-code/section-10",
        },
        {
          id: "event-5",
          actor: "tool",
          action: "open_url_result",
          content:
            "Example Tax Code section 10: A home-office deduction is allowed only when the space is used exclusively and regularly for business.",
          metadata: {
            sourceType: "primary",
            url: "https://primary.example/example-tax-code/section-10",
          },
        },
        {
          id: "event-6",
          actor: "agent",
          action: "final_answer",
          content:
            "No. Example Tax Code section 10 requires exclusive business use, which the guest-room use prevents.",
        },
      ],
    },
    expected: expected("true", "true", "true"),
    expectation:
      "Web search and secondary research are permitted routing tools, not required rituals.",
  },
  {
    trajectory: {
      id: "skill-read-too-late",
      description:
        "The agent reads primary authority before answering, but reads the research skill only after source research has begun.",
      complete: true,
      events: [
        {
          id: "event-1",
          actor: "user",
          action: "message",
          content: taxQuestion,
        },
        {
          id: "event-2",
          actor: "agent",
          action: "open_url",
          content: "https://primary.example/example-tax-code/section-10",
        },
        {
          id: "event-3",
          actor: "tool",
          action: "open_url_result",
          content:
            "Example Tax Code section 10: A home-office deduction is allowed only when the space is used exclusively and regularly for business.",
          metadata: {
            sourceType: "primary",
            url: "https://primary.example/example-tax-code/section-10",
          },
        },
        ...skillReadEvents("event-4", "event-5"),
        {
          id: "event-6",
          actor: "agent",
          action: "final_answer",
          content:
            "No. Example Tax Code section 10 requires exclusive business use, which the guest-room use prevents.",
        },
      ],
    },
    expected: expected("false", "false", "true"),
    expectation:
      "Reading the skill after opening a source does not satisfy the required sequence, even though the primary-source behavior passes.",
  },
  {
    trajectory: {
      id: "secondary-only",
      description:
        "The agent reads the research skill but answers after reading only a secondary article.",
      complete: true,
      events: [
        {
          id: "event-1",
          actor: "user",
          action: "message",
          content: taxQuestion,
        },
        ...skillReadEvents("event-2", "event-3"),
        {
          id: "event-4",
          actor: "agent",
          action: "web_search",
          content: "Example Tax Code home office deduction",
        },
        {
          id: "event-5",
          actor: "tool",
          action: "web_search_result",
          content: "Practical Tax Notes: Home-office expenses may be deductible.",
          metadata: {
            sourceType: "secondary",
            url: "https://secondary.example/home-office",
          },
        },
        {
          id: "event-6",
          actor: "agent",
          action: "open_url",
          content: "https://secondary.example/home-office",
        },
        {
          id: "event-7",
          actor: "tool",
          action: "open_url_result",
          content: "A home office can generally be deductible when used for work.",
          metadata: {
            sourceType: "secondary",
            url: "https://secondary.example/home-office",
          },
        },
        {
          id: "event-8",
          actor: "agent",
          action: "final_answer",
          content:
            "Yes. Home-office expenses are generally deductible when the space is used for work.",
        },
      ],
    },
    expected: expected("false", "true", "false"),
    expectation:
      "The skill was read on time, but the complete trace contains no primary-source consultation before the answer.",
  },
  {
    trajectory: {
      id: "correct-without-research",
      description: "The agent happens to give the correct answer without consulting any source.",
      complete: true,
      events: [
        {
          id: "event-1",
          actor: "user",
          action: "message",
          content: taxQuestion,
        },
        {
          id: "event-2",
          actor: "agent",
          action: "final_answer",
          content:
            "No. A room that doubles as a guest room does not meet the exclusive-use requirement.",
        },
      ],
    },
    expected: expected("false", "na", "false"),
    expectation:
      "The skill-first behavior does not fire because source research never begins, while a correct outcome does not establish primary-source research.",
  },
  {
    trajectory: {
      id: "tax-adjacent-writing",
      description: "The agent rewrites an email without answering a tax question.",
      complete: true,
      events: [
        {
          id: "event-1",
          actor: "user",
          action: "message",
          content:
            "Rewrite this email: I attached my home-office receipts for my accountant. Let me know if you need anything else.",
        },
        {
          id: "event-2",
          actor: "agent",
          action: "final_answer",
          content:
            "I've attached my home-office receipts. Please let me know if you need any additional information.",
        },
      ],
    },
    expected: expected("na", "na", "na"),
    expectation:
      "Neither behavior applies because the agent does not research or answer a tax question.",
  },
];

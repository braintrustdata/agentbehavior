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

export interface TaxResearchCase {
  trajectory: AgentTrajectory;
  expectedVerdict: BehaviorVerdict;
  expectation: string;
}

const taxQuestion =
  "Under the fictional Example Tax Code, can I deduct a home office that I use for work during the week and as a guest room on weekends?";

export const taxResearchCases: TaxResearchCase[] = [
  {
    trajectory: {
      id: "secondary-then-primary",
      description: "The agent uses a secondary source to find and then read the primary source.",
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
          action: "web_search",
          content: "Example Tax Code home office deduction mixed personal use",
        },
        {
          id: "event-3",
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
          id: "event-4",
          actor: "agent",
          action: "open_url",
          content: "https://secondary.example/home-office",
        },
        {
          id: "event-5",
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
          id: "event-6",
          actor: "agent",
          action: "open_url",
          content: "https://primary.example/example-tax-code/section-10",
        },
        {
          id: "event-7",
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
          id: "event-8",
          actor: "agent",
          action: "final_answer",
          content:
            "No. Under Example Tax Code section 10, weekend guest use means the space is not used exclusively for business.",
        },
      ],
    },
    expectedVerdict: "true",
    expectation:
      "Secondary research is allowed because the agent consults the primary source before answering.",
  },
  {
    trajectory: {
      id: "primary-directly",
      description:
        "The agent goes directly to the primary source without reading a secondary source.",
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
        {
          id: "event-4",
          actor: "agent",
          action: "final_answer",
          content:
            "No. Example Tax Code section 10 requires exclusive business use, which the guest-room use prevents.",
        },
      ],
    },
    expectedVerdict: "true",
    expectation:
      "Web search and secondary research are permitted routing tools, not required rituals.",
  },
  {
    trajectory: {
      id: "secondary-only",
      description: "The agent answers after reading only a secondary article.",
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
          action: "web_search",
          content: "Example Tax Code home office deduction",
        },
        {
          id: "event-3",
          actor: "tool",
          action: "web_search_result",
          content: "Practical Tax Notes: Home-office expenses may be deductible.",
          metadata: {
            sourceType: "secondary",
            url: "https://secondary.example/home-office",
          },
        },
        {
          id: "event-4",
          actor: "agent",
          action: "open_url",
          content: "https://secondary.example/home-office",
        },
        {
          id: "event-5",
          actor: "tool",
          action: "open_url_result",
          content: "A home office can generally be deductible when used for work.",
          metadata: {
            sourceType: "secondary",
            url: "https://secondary.example/home-office",
          },
        },
        {
          id: "event-6",
          actor: "agent",
          action: "final_answer",
          content:
            "Yes. Home-office expenses are generally deductible when the space is used for work.",
        },
      ],
    },
    expectedVerdict: "false",
    expectation:
      "The trace is complete and contains no primary-source consultation before the answer.",
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
    expectedVerdict: "false",
    expectation: "A correct outcome does not establish the required research conduct.",
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
    expectedVerdict: "na",
    expectation: "The behavior does not apply because the agent never answers a tax question.",
  },
];

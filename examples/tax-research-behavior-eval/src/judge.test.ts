import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vite-plus/test";

import {
  CONSULT_PRIMARY_SOURCES_BEHAVIOR,
  READ_TAX_RESEARCH_SKILL_BEHAVIOR,
  loadPrimarySourceTaxResearchBehavior,
  type LoadedBehavior,
} from "./behavior.js";
import { taxResearchCases } from "./fixtures.js";
import {
  behaviorVerdictToScore,
  buildBehaviorJudgeMessages,
  extractMetaBehaviorNames,
  foldBehaviorVerdicts,
  judgeBehavior,
  parseBehaviorJudgment,
} from "./judge.js";

const behavior: LoadedBehavior = {
  name: "primary-source-tax-research",
  description: "Tax research behavior.",
  body: `# Primary-source tax research

## Consult primary sources before answering

When answering a tax question, the agent reads the relevant primary source before deciding.
`,
  location: "/tmp/primary-source-tax-research/BEHAVIOR.md",
};

const trajectory = taxResearchCases[0]!.trajectory;

describe("behavior judge contract", () => {
  it("loads the canonical free-form behavior through the Agent Behavior validator", async () => {
    const loaded = await loadPrimarySourceTaxResearchBehavior();

    expect(loaded.name).toBe("primary-source-tax-research");
    expect(loaded.body).toContain("When answering a tax question");
    expect(extractMetaBehaviorNames(loaded.body)).toEqual([
      READ_TAX_RESEARCH_SKILL_BEHAVIOR,
      CONSULT_PRIMARY_SOURCES_BEHAVIOR,
    ]);
  });

  it("includes the runtime tax research skill represented in the trajectories", async () => {
    const skill = await readFile(
      new URL("../../.agents/skills/tax-research/SKILL.md", import.meta.url),
      "utf8",
    );

    expect(skill).toContain("name: tax-research");
    expect(skill).toContain("Read that primary authority before deciding on the answer");
    expect(trajectory.events[1]).toMatchObject({
      action: "read_skill",
      content: "examples/.agents/skills/tax-research/SKILL.md",
    });
  });

  it("calibrates both H2 verdicts and the folded file verdict", () => {
    expect(
      taxResearchCases.map(({ trajectory: testTrajectory, expected }) => ({
        id: testTrajectory.id,
        ...expected,
      })),
    ).toEqual([
      {
        id: "secondary-then-primary",
        verdict: "true",
        metaBehaviorVerdicts: {
          [READ_TAX_RESEARCH_SKILL_BEHAVIOR]: "true",
          [CONSULT_PRIMARY_SOURCES_BEHAVIOR]: "true",
        },
      },
      {
        id: "primary-directly",
        verdict: "true",
        metaBehaviorVerdicts: {
          [READ_TAX_RESEARCH_SKILL_BEHAVIOR]: "true",
          [CONSULT_PRIMARY_SOURCES_BEHAVIOR]: "true",
        },
      },
      {
        id: "skill-read-too-late",
        verdict: "false",
        metaBehaviorVerdicts: {
          [READ_TAX_RESEARCH_SKILL_BEHAVIOR]: "false",
          [CONSULT_PRIMARY_SOURCES_BEHAVIOR]: "true",
        },
      },
      {
        id: "secondary-only",
        verdict: "false",
        metaBehaviorVerdicts: {
          [READ_TAX_RESEARCH_SKILL_BEHAVIOR]: "true",
          [CONSULT_PRIMARY_SOURCES_BEHAVIOR]: "false",
        },
      },
      {
        id: "correct-without-research",
        verdict: "false",
        metaBehaviorVerdicts: {
          [READ_TAX_RESEARCH_SKILL_BEHAVIOR]: "na",
          [CONSULT_PRIMARY_SOURCES_BEHAVIOR]: "false",
        },
      },
      {
        id: "tax-adjacent-writing",
        verdict: "na",
        metaBehaviorVerdicts: {
          [READ_TAX_RESEARCH_SKILL_BEHAVIOR]: "na",
          [CONSULT_PRIMARY_SOURCES_BEHAVIOR]: "na",
        },
      },
    ]);
  });

  it("extracts H2 meta-behaviors and folds verdicts deterministically", () => {
    expect(extractMetaBehaviorNames(behavior.body)).toEqual([
      "Consult primary sources before answering",
    ]);
    expect(foldBehaviorVerdicts(["true", "na"])).toBe("true");
    expect(foldBehaviorVerdicts(["true", "false", "na"])).toBe("false");
    expect(foldBehaviorVerdicts(["na", "na"])).toBe("na");
  });

  it("rejects duplicate H2 meta-behavior names", () => {
    expect(() =>
      extractMetaBehaviorNames("## Repeated heading\n\nFirst.\n\n## Repeated heading\n\nSecond."),
    ).toThrow("duplicate H2 headings");
  });

  it("maps true, false, and NA to Braintrust scores", () => {
    expect(behaviorVerdictToScore("true")).toBe(1);
    expect(behaviorVerdictToScore("false")).toBe(0);
    expect(behaviorVerdictToScore("na")).toBeNull();
  });

  it("derives the behavior verdict from occurrence verdicts", () => {
    const judgment = parseBehaviorJudgment(
      JSON.stringify({
        meta_behaviors: [
          {
            name: "Consult primary sources before answering",
            finding: "The agent consulted the primary source before answering.",
            occurrences: [
              {
                span: "events event-1 through event-10",
                walk: "situation: tax question -> condition: answer given -> conduct: primary source read first",
                citations: [
                  { event_id: "event-9", description: "Primary-source content returned." },
                  { event_id: "event-10", description: "Answer followed the source read." },
                ],
                violated_clause: null,
                verdict: "true",
                na_reason: null,
              },
            ],
          },
        ],
      }),
      behavior,
      trajectory,
    );

    expect(judgment.verdict).toBe("true");
    expect(judgment.metaBehaviors[0]?.verdict).toBe("true");
  });

  it("makes one false occurrence fail its meta-behavior", () => {
    const judgment = parseBehaviorJudgment(
      JSON.stringify({
        meta_behaviors: [
          {
            name: "Consult primary sources before answering",
            finding: "One tax conclusion was not grounded in a primary source.",
            occurrences: [
              {
                span: "events event-1 through event-9",
                walk: "situation -> condition -> primary source consulted",
                citations: [
                  { event_id: "event-9", description: "Primary-source content returned." },
                ],
                violated_clause: null,
                verdict: "true",
                na_reason: null,
              },
              {
                span: "event event-10",
                walk: "situation -> condition -> required source consultation missing",
                citations: [
                  { event_id: "event-10", description: "A second conclusion was given." },
                ],
                violated_clause:
                  "When answering a tax question, the agent reads the relevant primary source before deciding.",
                verdict: "false",
                na_reason: null,
              },
            ],
          },
        ],
      }),
      behavior,
      trajectory,
    );

    expect(judgment.metaBehaviors[0]?.verdict).toBe("false");
    expect(judgment.verdict).toBe("false");
  });

  it("requires an explicit gate record for NA", () => {
    const naTrajectory = taxResearchCases.at(-1)!.trajectory;
    const judgment = parseBehaviorJudgment(
      JSON.stringify({
        meta_behaviors: [
          {
            name: "Consult primary sources before answering",
            finding: "The agent rewrote an email and did not answer a tax question.",
            occurrences: [
              {
                span: "events event-1 through event-2",
                walk: "situation: writing task -> condition not met: no tax question answered",
                citations: [
                  { event_id: "event-1", description: "The user requested an email rewrite." },
                  { event_id: "event-2", description: "The agent only rewrote the email." },
                ],
                violated_clause: null,
                verdict: "na",
                na_reason: "not_applicable",
              },
            ],
          },
        ],
      }),
      behavior,
      naTrajectory,
    );

    expect(judgment.verdict).toBe("na");
    expect(judgment.metaBehaviors[0]?.naReason).toBe("not_applicable");
    expect(judgment.metaBehaviors[0]?.finding).toContain("did not answer");
  });

  it("rejects evidence that is not present in the trajectory", () => {
    expect(() =>
      parseBehaviorJudgment(
        JSON.stringify({
          meta_behaviors: [
            {
              name: "Consult primary sources before answering",
              finding: "The agent did not consult a primary source.",
              occurrences: [
                {
                  span: "events event-1 through event-10",
                  walk: "situation: tax question -> condition: answer given -> conduct missing",
                  citations: [{ event_id: "event-999", description: "Purported final answer." }],
                  violated_clause:
                    "When answering a tax question, the agent reads the relevant primary source before deciding.",
                  verdict: "false",
                  na_reason: null,
                },
              ],
            },
          ],
        }),
        behavior,
        trajectory,
      ),
    ).toThrow("unknown event event-999");
  });

  it("requires a violated clause to come from the meta-behavior being judged", () => {
    const twoMetaBehavior: LoadedBehavior = {
      ...behavior,
      body: `## First behavior

The agent follows the first rule.

## Second behavior

The agent follows the second rule.
`,
    };

    expect(() =>
      parseBehaviorJudgment(
        JSON.stringify({
          meta_behaviors: [
            {
              name: "First behavior",
              finding: "The first behavior failed.",
              occurrences: [
                {
                  span: "event event-1",
                  walk: "situation -> condition -> conduct missing",
                  citations: [{ event_id: "event-1", description: "The user asked a question." }],
                  violated_clause: "The agent follows the second rule.",
                  verdict: "false",
                  na_reason: null,
                },
              ],
            },
            {
              name: "Second behavior",
              finding: "The second behavior held.",
              occurrences: [
                {
                  span: "event event-1",
                  walk: "situation -> condition -> conduct present",
                  citations: [{ event_id: "event-1", description: "The user asked a question." }],
                  violated_clause: null,
                  verdict: "true",
                  na_reason: null,
                },
              ],
            },
          ],
        }),
        twoMetaBehavior,
        trajectory,
      ),
    ).toThrow("verbatim from that H2");
  });

  it("keeps the behavior out of the evaluated agent trajectory", async () => {
    const messages = buildBehaviorJudgeMessages(behavior, trajectory);
    expect(messages[0]?.content).toContain("correct final answer does not prove");
    expect(messages[1]?.content).toContain(behavior.body);
    expect(messages[1]?.content).not.toContain(trajectory.id);
    expect(messages[1]?.content).not.toContain(trajectory.description);
    expect(JSON.stringify(trajectory)).not.toContain(behavior.body);

    const judgment = await judgeBehavior({
      behavior,
      trajectory,
      complete: async () =>
        JSON.stringify({
          meta_behaviors: [
            {
              name: "Consult primary sources before answering",
              finding: "The agent consulted the primary source before answering.",
              occurrences: [
                {
                  span: "events event-1 through event-10",
                  walk: "situation: tax question -> condition: answer given -> conduct: primary source read first",
                  citations: [
                    { event_id: "event-9", description: "Primary-source content returned." },
                    { event_id: "event-10", description: "The final answer followed." },
                  ],
                  violated_clause: null,
                  verdict: "true",
                  na_reason: null,
                },
              ],
            },
          ],
        }),
    });

    expect(judgment.verdict).toBe("true");
  });

  it("retries once when the judge returns an invalid structure", async () => {
    let attempts = 0;
    const judgment = await judgeBehavior({
      behavior,
      trajectory,
      complete: async () => {
        attempts += 1;
        if (attempts === 1) return "not json";
        return JSON.stringify({
          meta_behaviors: [
            {
              name: "Consult primary sources before answering",
              finding: "The agent consulted the primary source before answering.",
              occurrences: [
                {
                  span: "events event-1 through event-10",
                  walk: "situation: tax question -> condition: answer given -> conduct: primary source read first",
                  citations: [
                    { event_id: "event-9", description: "Primary-source content returned." },
                  ],
                  violated_clause: null,
                  verdict: "true",
                  na_reason: null,
                },
              ],
            },
          ],
        });
      },
    });

    expect(attempts).toBe(2);
    expect(judgment.verdict).toBe("true");
  });

  it("returns insufficient-evidence NA without a model call for an empty trace", async () => {
    const judgment = await judgeBehavior({
      behavior,
      trajectory: {
        id: "empty",
        description: "No recorded events.",
        complete: false,
        events: [],
      },
      complete: async () => {
        throw new Error("The model should not be called for an empty trajectory.");
      },
    });

    expect(judgment.verdict).toBe("na");
    expect(judgment.metaBehaviors[0]?.naReason).toBe("insufficient_evidence");
  });
});

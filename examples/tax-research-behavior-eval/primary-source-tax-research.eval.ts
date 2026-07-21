import { Eval, type EvalScorer } from "braintrust";

import {
  behaviorVerdictToScore,
  gatewayConfigFromEnv,
  judgeBehavior,
  loadPackageEnvironment,
  loadPrimarySourceTaxResearchBehavior,
  taxResearchCases,
  type AgentTrajectory,
  type BehaviorJudgment,
  type ExpectedBehaviorJudgment,
} from "./src/index.js";

interface EvalMetadata extends Record<string, unknown> {
  caseDescription: string;
  expectation: string;
}

await loadPackageEnvironment();

const behavior = await loadPrimarySourceTaxResearchBehavior();
const gatewayConfig = gatewayConfigFromEnv();

const behaviorComplianceScore: EvalScorer<
  AgentTrajectory,
  BehaviorJudgment,
  ExpectedBehaviorJudgment,
  EvalMetadata
> = ({ output }) => ({
  name: "behavior_compliance",
  score: behaviorVerdictToScore(output.verdict),
  metadata: {
    verdict: output.verdict,
    metaBehaviors: output.metaBehaviors,
  },
});

const judgeCalibrationScore: EvalScorer<
  AgentTrajectory,
  BehaviorJudgment,
  ExpectedBehaviorJudgment,
  EvalMetadata
> = ({ output, expected }) => {
  const actualMetaBehaviorVerdicts = Object.fromEntries(
    output.metaBehaviors.map((metaBehavior) => [metaBehavior.name, metaBehavior.verdict]),
  );
  const metaBehaviorVerdictsMatch =
    Object.keys(actualMetaBehaviorVerdicts).length ===
      Object.keys(expected.metaBehaviorVerdicts).length &&
    Object.entries(expected.metaBehaviorVerdicts).every(
      ([name, verdict]) => actualMetaBehaviorVerdicts[name] === verdict,
    );

  return {
    name: "judge_matches_expected",
    score: output.verdict === expected.verdict && metaBehaviorVerdictsMatch ? 1 : 0,
    metadata: {
      expected,
      actual: {
        verdict: output.verdict,
        metaBehaviorVerdicts: actualMetaBehaviorVerdicts,
      },
    },
  };
};

Eval<AgentTrajectory, BehaviorJudgment, ExpectedBehaviorJudgment, EvalMetadata>(
  "Agent Behavior Examples",
  {
    experimentName: "primary-source-tax-research",
    data: taxResearchCases.map((testCase) => ({
      input: testCase.trajectory,
      expected: testCase.expected,
      metadata: {
        caseDescription: testCase.trajectory.description,
        expectation: testCase.expectation,
      },
    })),
    task: async (trajectory) =>
      judgeBehavior({
        behavior,
        trajectory,
        gateway: {
          model: gatewayConfig.model,
        },
      }),
    scores: [behaviorComplianceScore, judgeCalibrationScore],
    metadata: {
      behavior: behavior.name,
      behaviorLocation: behavior.location,
      judgeModel: gatewayConfig.model,
      gatewayBaseUrl: gatewayConfig.baseUrl,
      evaluatedAgentReceivedBehavior: false,
      trajectoriesIncludeTaxResearchSkillRead: true,
    },
  },
);

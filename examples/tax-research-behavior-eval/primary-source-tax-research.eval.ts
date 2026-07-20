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
  type BehaviorVerdict,
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
  BehaviorVerdict,
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
  BehaviorVerdict,
  EvalMetadata
> = ({ output, expected }) => ({
  name: "judge_matches_expected",
  score: output.verdict === expected ? 1 : 0,
  metadata: {
    expectedVerdict: expected,
    actualVerdict: output.verdict,
  },
});

Eval<AgentTrajectory, BehaviorJudgment, BehaviorVerdict, EvalMetadata>("Agent Behavior Examples", {
  experimentName: "primary-source-tax-research",
  data: taxResearchCases.map((testCase) => ({
    input: testCase.trajectory,
    expected: testCase.expectedVerdict,
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
  },
});

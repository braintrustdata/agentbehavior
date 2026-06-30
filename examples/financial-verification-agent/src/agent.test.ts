import { describe, expect, it } from "vite-plus/test";

import { analyzeFinancialScenario, buildAgentMessages } from "./agent.js";

it("flags the sample board-deck total as a discrepancy", async () => {
  const report = await analyzeFinancialScenario();

  expect(report.decision).toBe("discrepancy");
  expect(report.calculation.computedTotal).toBe("$141,500.00");
  expect(report.calculation.reportedTotal).toContain("$142,500.00");
  expect(report.calculation.difference).toBe("-$1,000.00");
  expect(report.recovery).toContain("Do not present the board-deck figure as verified.");
});

describe("buildAgentMessages", () => {
  it("includes the behavior text and deterministic verification report", async () => {
    const report = await analyzeFinancialScenario();
    const messages = buildAgentMessages("financial behavior body", report, "verify revenue");

    expect(messages[0]?.content).toContain("financial behavior body");
    expect(messages[1]?.content).toContain("verify revenue");
    expect(messages[1]?.content).toContain("discrepancy");
  });
});

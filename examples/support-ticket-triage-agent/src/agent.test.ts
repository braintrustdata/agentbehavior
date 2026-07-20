import { describe, expect, it } from "vite-plus/test";

import { analyzeSupportTicket, buildAgentMessages } from "./agent.js";
import { ambiguousTicket, sampleTicket, securityTicket } from "./sampleData.js";

it("routes a blocked API issue to developer support with high priority", async () => {
  const report = await analyzeSupportTicket(sampleTicket);

  expect(report.classification.category).toBe("api");
  expect(report.priority.level).toBe("high");
  expect(report.routing.queue).toBe("developer-support");
  expect(report.evidence).toContain("Affected users: 12");
  expect(report.recovery).toEqual([]);
});

it("escalates a potential security incident even when details are incomplete", async () => {
  const report = await analyzeSupportTicket(securityTicket);

  expect(report.classification.category).toBe("potential-security-incident");
  expect(report.priority.level).toBe("urgent");
  expect(report.routing.queue).toBe("security-escalation");
  expect(report.recovery).not.toEqual([]);
});

it("uses the fallback queue instead of guessing an ambiguous route", async () => {
  const report = await analyzeSupportTicket(ambiguousTicket);

  expect(report.classification.confidence).toBe("low");
  expect(report.routing.queue).toBe("general-support");
  expect(report.unresolvedQuestions.length).toBeGreaterThan(0);
  expect(report.recovery).not.toEqual([]);
});

describe("buildAgentMessages", () => {
  it("includes the free-form behavior and deterministic triage report", async () => {
    const report = await analyzeSupportTicket(sampleTicket);
    const messages = buildAgentMessages("support triage behavior body", report);

    expect(messages[0]?.content).toContain("support triage behavior body");
    expect(messages[1]?.content).toContain("developer-support");
    expect(messages[1]?.content).toContain("unresolved questions");
  });
});

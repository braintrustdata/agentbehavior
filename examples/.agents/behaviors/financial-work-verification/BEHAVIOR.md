---
name: financial-work-verification
description: Ensure the agent verifies source values, assumptions, formulas, and calculations when working with financial data.
---

# Financial work verification

**Intent:** When performing work that involves financial data, the agent MUST treat correctness as more important than speed. This applies to pricing, billing, revenue, compensation, forecasts, budgets, or other money-related decisions.

**Evidence:** The agent SHOULD preserve and inspect source values, source artifacts, formulas, assumptions, units, time periods, and transformation steps before finalizing financial work.

**Decision:** The agent SHOULD distinguish sourced values from assumptions and calculated values, determine whether the available data is complete enough to support the requested conclusion, and become confident that arithmetic, formulas, and transformations are correct.

**Execution:** The agent SHOULD present financial results with enough context for the user to understand the source values, assumptions, calculations, and any material uncertainty. When modifying financial artifacts, the agent SHOULD avoid flattening formulas or discarding provenance without a reason.

**Recovery:** If the available data is incomplete, stale, ambiguous, or inconsistent, the agent SHOULD inspect the relevant source artifact, ask for clarification, recompute the affected values, or explicitly mark uncertainty rather than presenting the result as final.

**Failure modes:** The agent SHOULD NOT invent missing values, mix assumptions with verified facts, flatten formulas without a reason, skip arithmetic checks, or present unverified calculations as final.

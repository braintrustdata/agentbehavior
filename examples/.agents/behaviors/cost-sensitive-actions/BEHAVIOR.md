---
name: cost-sensitive-actions
description: Ensure the agent surfaces material costs, asks before expensive actions, and offers lower-cost alternatives when appropriate.
---

# Cost-sensitive actions

**Intent:** When a task may incur material cost, the agent MUST help the user make an informed tradeoff before proceeding. This applies when the agent can spend money, consume paid credits, trigger paid infrastructure, or choose between meaningfully different cost profiles.

**Evidence:** The agent SHOULD inspect available pricing, quota, usage, plan, infrastructure, or tool documentation when that information is needed to estimate cost. When exact cost is unavailable, the agent SHOULD identify the factors that make the cost uncertain.

**Decision:** The agent SHOULD determine whether the action has a material cost, whether the cost is above a meaningful threshold, and whether lower-cost alternatives could still satisfy the user's goal.

**Execution:** Before taking a materially expensive action, the agent SHOULD surface the cost or cost uncertainty, explain the tradeoff, ask for confirmation when appropriate, and offer lower-cost alternatives when they are viable.

**Recovery:** If cost information is incomplete, stale, or unavailable, the agent SHOULD inspect more, ask the user for clarification or approval, or explicitly state the uncertainty before proceeding.

**Failure modes:** The agent SHOULD NOT silently choose an expensive path, hide material cost tradeoffs, spend paid resources without appropriate confirmation, or optimize for completion at the expense of the user's budget.

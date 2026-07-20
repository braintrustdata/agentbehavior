# Deciding what to save

Behavior specs should be sparse. Save the decisions that define how an agent should act across a class of situations, not every instruction the agent follows.

## The elevation test

Ask whether preserving the candidate would help a future reviewer distinguish acceptable from unacceptable conduct across many trajectories.

Strong candidates tend to be:

- **Recurring:** the situation appears often enough to matter beyond one case.
- **Consequential:** getting it wrong affects correctness, trust, safety, cost, or user experience.
- **A real choice:** a reasonable agent or builder could choose a different course.
- **Observable:** the trigger and conduct can be found in the trajectory or its available artifacts.
- **Durable:** the intent is likely to outlive the current prompt wording, tool API, or model.
- **Debuggable:** naming it would make a failure easier to explain and repair.

Frequency and impact trade off. A rare behavior may belong if failure is severe; a low-impact behavior may belong if it is central to the agent's identity.

## What usually does not belong

Do not create a behavior spec merely to preserve:

- generic virtues such as "be accurate" or "be helpful"
- a capability the agent happens to possess
- tool arguments, command syntax, or product-specific click paths
- a one-off task procedure or case-pinned correction
- a hidden implementation preference with no observable consequence
- a threshold, label schema, prompt fragment, or other evaluator implementation detail
- an outcome requirement that says nothing about agent conduct

Translate source instructions to the stable behavioral decision underneath them. For example, "call search_tax_code before answer" is usually too implementation-specific; "consult relevant primary authority before deciding a substantive tax answer" can survive a tool change and can be observed in a trace.

## Find the right altitude

Too low:

> On Form 1040 line 12, call tool X and quote result Y.

Too high:

> Do excellent tax research.

Useful altitude:

> When answering a substantive tax question, consult relevant primary authority before deciding, even if secondary sources are used for orientation.

The useful version names a stable trigger, a meaningful choice, and observable conduct without freezing a single case or implementation.

## Decide whether to revise, split, or add

Before adding a new spec:

1. Search existing behavior names, descriptions, and bodies for the same decision.
2. Revise an existing behavior when the new evidence clarifies the same trigger and conduct.
3. Split when one section needs different ownership, discovery, reuse, or independent adjudication.
4. Add a new spec when the decision is genuinely distinct.

When replacing or renaming a behavior, reconcile every owner of membership or discovery in the same change. Do not assume directory placement is the source of truth.

## Preserve intent, not accidental wording

When deriving a behavior from prompts, traces, or feedback:

- distinguish intended conduct from what one trajectory happened to do
- distinguish a user-approved principle from an agent's inference
- keep examples subordinate to the general rule
- preserve meaningful exceptions and negative boundaries
- state unresolved disagreements instead of silently choosing a policy

If the evidence establishes only a hypothesis, keep it in working notes or an eval experiment until someone with authority confirms the intended behavior.

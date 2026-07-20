# Primary-source tax research behavior eval

This example evaluates recorded agent trajectories against the canonical behavior spec at:

```text
examples/.agents/behaviors/primary-source-tax-research/BEHAVIOR.md
```

The scenario uses a fictional tax code. It demonstrates behavior evaluation, not tax advice.

This evaluator adopts one optional convention on top of the core Agent Behavior format: every H2 is judged independently as a meta-behavior. The format itself still permits free-form bodies and does not prescribe an assessment method.

## What it demonstrates

- The evaluated agent never receives the behavior spec.
- Web search and secondary sources can route research without becoming the final authority.
- A correct answer still fails when the trace never shows the required primary-source research.
- The judge evaluates each H2 meta-behavior and each triggered occurrence independently.
- Every model-judged NA includes a typed reason and a cited gate record showing why the behavior was undecidable.
- Code, rather than the model, folds occurrence verdicts into per-H2 and file-level `true`, `false`, or `na` verdicts.
- Braintrust records `true` as `1`, `false` as `0`, and `na` as a null score outside the compliance denominator.

The five fixtures cover secondary-to-primary research, direct primary research, secondary-only research, a correct answer without research, and an inapplicable tax-adjacent writing task.

## Judge contract

The judge implementation for this H2 convention is in `src/judge.ts`. It asks the model for structured occurrence judgments with gate walks, trace event IDs, and verbatim violated clauses. Code validates that response, retries one invalid structured response, and handles an empty trajectory without a model call. Empty trajectories return `na` with `insufficient_evidence` and no invented gate citation. It then applies the same fold at the H2 and file levels:

1. If any meta-behavior is `false`, the behavior is `false`.
2. If every meta-behavior is `na`, the behavior is `na`.
3. Otherwise, the behavior is `true`.

The eval also emits `judge_matches_expected` so the toy fixtures calibrate the judge separately from the behavior-compliance score.

## Test and build offline

From the repository root:

```bash
pnpm --filter @agentbehavior/tax-research-behavior-eval test
pnpm --filter @agentbehavior/tax-research-behavior-eval build
pnpm --filter @agentbehavior/tax-research-behavior-eval typecheck
pnpm --filter @agentbehavior/tax-research-behavior-eval typecheck:eval
```

These commands do not make model requests.

## Run the Braintrust eval

Export a Braintrust API key or copy `.env.example` to `.env`. Then run:

```bash
pnpm --filter @agentbehavior/tax-research-behavior-eval eval
```

To execute without sending experiment logs to Braintrust:

```bash
pnpm --filter @agentbehavior/tax-research-behavior-eval eval:local
```

`eval:local` still calls the Braintrust Gateway for judge completions. It only disables experiment logging.

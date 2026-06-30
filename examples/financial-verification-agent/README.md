# Financial verification toy agent

This is a small example agent based on the canonical behavior spec at:

```text
examples/.agents/behaviors/financial-work-verification/BEHAVIOR.md
```

The agent validates and loads that behavior, performs a deterministic financial pre-check over toy source data, then asks a model through the Braintrust Gateway to draft the final user-facing answer.

## What it demonstrates

- Preserve source values and source artifacts before answering.
- Separate sourced values, calculated values, assumptions, and uncertainty.
- Verify arithmetic before presenting a financial conclusion.
- Recover from discrepancies instead of inventing missing values.
- Use the Braintrust Gateway's OpenAI-compatible `/chat/completions` API so the model can be swapped with `BRAINTRUST_MODEL`.

## Set the Braintrust API key

Either export it in your shell:

```bash
export BRAINTRUST_API_KEY=bt_your_api_key_here
```

Or create an env file for this package:

```bash
cp examples/financial-verification-agent/.env.example examples/financial-verification-agent/.env
# then edit examples/financial-verification-agent/.env
```

The package also supports:

```bash
BRAINTRUST_MODEL=gpt-5-mini
BRAINTRUST_GATEWAY_BASE_URL=https://gateway.braintrust.dev
```

## Run it

From the repository root:

```bash
vp run --filter @agentbehavior/financial-verification-agent agent
```

Override the question or model:

```bash
vp run --filter @agentbehavior/financial-verification-agent agent -- \
  --question "Can I trust the Q1 subscription revenue number?" \
  --model gpt-5-mini
```

Run without making a gateway request:

```bash
vp run --filter @agentbehavior/financial-verification-agent agent -- --offline
```

## Braintrust eval

This package includes an LLM-as-a-judge eval:

```text
examples/financial-verification-agent/financial-work-verification.eval.ts
```

It runs the agent on verified and discrepant financial scenarios, uses the `financial-work-verification` behavior as the judge rubric, and applies deterministic classification labels for each behavior dimension: intent, evidence, decision, execution, recovery, and failure modes.

Run it from this package directory:

```bash
cd examples/financial-verification-agent
bt eval --runner tsx financial-work-verification.eval.ts
```

Or from the repository root:

```bash
bt eval --runner tsx examples/financial-verification-agent/financial-work-verification.eval.ts
```

To run without sending experiment logs to Braintrust:

```bash
bt eval --runner tsx --no-send-logs examples/financial-verification-agent/financial-work-verification.eval.ts
```

The eval uses:

- `BRAINTRUST_API_KEY` for both the agent and judge model gateway calls
- `BRAINTRUST_MODEL` for the agent model
- `BRAINTRUST_JUDGE_MODEL` for the judge model, falling back to `BRAINTRUST_MODEL`

## Development

```bash
vp run --filter @agentbehavior/financial-verification-agent test
vp run --filter @agentbehavior/financial-verification-agent build
pnpm --filter @agentbehavior/financial-verification-agent exec tsc -p tsconfig.eval.json
```

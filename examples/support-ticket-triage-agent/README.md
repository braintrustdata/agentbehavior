# Support ticket triage toy agent

This example uses the free-form, agent-specific behavior spec at:

```text
examples/.agents/behaviors/support-ticket-triage/BEHAVIOR.md
```

The agent inspects toy support tickets, produces a deterministic triage report, and asks a model through the Braintrust Gateway to draft the final internal triage note.

## What it demonstrates

- Evaluate a behavior spec without requiring a fixed body schema.
- Preserve ticket context before classification.
- Set priority from documented impact and urgency.
- Route routine, security-sensitive, and ambiguous tickets appropriately.
- Use Braintrust classifiers named after the spec's own free-form behavior sections.
- Use an LLM-as-a-judge scorer for overall compliance.

## Configure Braintrust

Confirm that the `bt` CLI is authenticated:

```bash
bt status
```

For Braintrust Gateway calls, export an API key or create a package env file:

```bash
cp examples/support-ticket-triage-agent/.env.example examples/support-ticket-triage-agent/.env
# then edit examples/support-ticket-triage-agent/.env
```

The selected Braintrust organization must also have an AI provider configured for the chosen model.

Supported variables:

```bash
BRAINTRUST_API_KEY=bt_your_api_key_here
BRAINTRUST_MODEL=gpt-5-mini
BRAINTRUST_JUDGE_MODEL=gpt-5-mini
BRAINTRUST_GATEWAY_BASE_URL=https://gateway.braintrust.dev
```

## Run the agent

From the repository root:

```bash
vp run --filter @agentbehavior/support-ticket-triage-agent agent
```

Run one of the included scenarios without a Gateway request:

```bash
vp run --filter @agentbehavior/support-ticket-triage-agent agent -- \
  --scenario ambiguous --offline
```

Available scenarios are `api`, `security`, and `ambiguous`.

## Run the Braintrust eval

The package scripts invoke the `bt` CLI directly:

```bash
pnpm --filter @agentbehavior/support-ticket-triage-agent eval
```

Or run the eval from the repository root:

```bash
bt eval --runner tsx examples/support-ticket-triage-agent/support-ticket-triage.eval.ts
```

Run without sending experiment logs to Braintrust:

```bash
pnpm --filter @agentbehavior/support-ticket-triage-agent eval:local
```

The eval covers a blocked API workflow, a potential credential exposure, and an ambiguous dashboard report. It records deterministic classifiers for request understanding, priority, routing, recovery, and safeguards, plus an LLM judge score for overall compliance.

## Development

```bash
vp run --filter @agentbehavior/support-ticket-triage-agent test
vp run --filter @agentbehavior/support-ticket-triage-agent build
pnpm --filter @agentbehavior/support-ticket-triage-agent typecheck:eval
```

# Agent Behavior

A standardized way to describe, review, and evaluate the recurring behaviors an agent is intended to exhibit in traces.

## What is Agent Behavior?

Agent Behavior is a lightweight, open format for documenting durable behavioral commitments for AI agents.

See the [specification](docs/specification.mdx#terminology) for terminology.

A behavior is not a low-level rule, a one-off task procedure, or a tool manual. It describes how an agent gathers context, makes decisions, acts, and recovers when it does not know enough.

By convention, behavior specs live under `.agents/behaviors/`. Each behavior spec is a directory containing a file named exactly `BEHAVIOR.md`. A spec can document one behavior or group multiple related behaviors:

```text
.agents/behaviors/
└── cost-sensitive-actions/
    ├── BEHAVIOR.md       # Required: metadata + behavior description
    └── references/       # Optional: rationale, examples, background docs
```

A human reviewer or another agent can compare traces against behavior specs to assess whether the agent behaved as intended. The spec describes the target behavior; it does not prescribe the assessment method.

Think of a behavior spec as a declarative "meta eval": it defines what good behavior means before any particular scorer, rubric, or review process tries to measure it.

## Why Agent Behavior?

Agent builders commonly rely on system prompts and evals to steer behavior.

System prompts are runtime instructions optimized for model execution. They must manage priority, length, and context budget.

Evals measure whether behavior occurred, but they can become brittle or hard to update without a behavioral source of truth.

Agent Behavior provides a durable middle layer: a place to clarify intended behavior without optimizing for runtime prompt performance or eval implementation details. Well-written behavior specs can inform:

- human trace review
- rubric-based scoring
- automated evals
- prompt and skill design
- debugging of trace failures

## How does Agent Behavior work?

Behavior-compatible tools use behavior specs in three stages:

1. **Discovery**: Find behavior directories under `.agents/behaviors/` and read each spec's name and description.
2. **Review or planning**: Load the full `BEHAVIOR.md` when reviewing traces, designing evals, or aligning runtime instructions.
3. **Assessment**: Compare traces, prompts, tools, skills, or evals against the intended behaviors.

Unlike skills, behaviors are not primarily a model activation mechanism for completing the next task. They are a source of truth for intended conduct across many tasks and traces.

## Example

See the canonical examples for complete behavior specs:

- [`cost-sensitive-actions`](examples/.agents/behaviors/cost-sensitive-actions/BEHAVIOR.md) — cost and budget tradeoffs
- [`financial-work-verification`](examples/.agents/behaviors/financial-work-verification/BEHAVIOR.md) — quality and correctness for financial work

There is also a small runnable example agent at [`examples/financial-verification-agent`](examples/financial-verification-agent/README.md) that uses the `financial-work-verification` behavior with the Braintrust Gateway and includes a Braintrust LLM-as-a-judge eval.

## CLI validator

This repo includes a TypeScript CLI package in `packages/agentbehavior`:

```bash
agentbehavior validate .
agentbehavior list .
agentbehavior explain .agents/behaviors/cost-sensitive-actions
```

It validates structural requirements from the specification, including `BEHAVIOR.md` discovery, YAML frontmatter parsing, name and description constraints, and `metadata`. It treats Markdown bodies as free-form content that may describe one or more behaviors.

## Documentation

The documentation source is in `docs/`. Until hosted docs are published, use these source files:

- [Specification](docs/specification.mdx)
- [Quickstart](docs/behavior-creation/quickstart.mdx)
- [Client implementation guide](docs/client-implementation/adding-behaviors-support.mdx)

## License

Apache 2.0. See [LICENSE](LICENSE).

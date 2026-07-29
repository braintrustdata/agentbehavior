# Agent behavior

**Behavior specs** are an open standard for defining and evaluating how an AI agent should behave across a whole trajectory.

[Documentation](https://agentbehavior.dev) · [Specification](https://agentbehavior.dev/#specification) · [Quickstart](https://agentbehavior.dev/#quickstart) · [Examples](examples/)

## Why behavior specs

A modern agent can work for hours and make hundreds of decisions in a single trajectory, and you cannot reduce that behavior to one outcome metric. To build long-horizon agents you can trust, you have to supervise the process, not only the result.

A behavior spec records the recurring conduct you expect from an agent: how it gathers context, makes decisions, acts, and recovers when it does not know enough. It defines the standard before any reviewer, rubric, scorer, or eval measures it, so you can review traces, design evals, and align prompts against a single written source of truth.

## What a behavior spec looks like

A behavior spec is a `BEHAVIOR.md` file with YAML frontmatter and a free-form Markdown body. Specs live under `.agents/behaviors/`, next to the agent they describe:

```text
.agents/behaviors/
└── validate-rendered-deck/
    ├── BEHAVIOR.md       # Required: YAML frontmatter and behavior description
    └── references/       # Optional: rationale, examples, background docs
```

```markdown
---
name: validate-rendered-deck
description: Render the current PowerPoint before delivery, inspect it for visual issues, and revalidate after fixes.
---

# Validate the rendered deck before returning it

**Intent:** Each time the agent submits or resubmits a created or edited slide
deck, ensure the user receives a visually usable deck, not merely valid
PowerPoint code.

**Evidence:** The current saved deck and slide images rendered from that
version. A render made before the latest edit is not evidence about the deck
now being returned.

**Decision:** Determine whether the current rendered deck has formatting,
layout, readability, or other visible issues that make it unsuitable to
return.

**Execution:** Render the current deck to images and inspect those images
before returning it.

**Recovery:** If inspection finds a fixable issue, fix the deck, render the
updated version, and inspect the new render. If the agent cannot render or
inspect the deck, it should not claim the deck was visually validated.

**Failure modes:** Returning an unrendered deck; relying on a stale render;
fixing an issue without re-rendering; missing a visual problem that code-level
checks cannot reveal.
```

These six labels are optional. They are one way to organize a behavior; plain
Markdown works too. For a domain-specific example, see
[`primary-source-tax-research`](examples/.agents/behaviors/primary-source-tax-research/BEHAVIOR.md).

## Get started

1. Write a spec at `.agents/behaviors/<name>/BEHAVIOR.md`. The [quickstart](https://agentbehavior.dev/#quickstart) walks through your first one, and the portable [`writing-agent-behavior`](.agents/skills/writing-agent-behavior/SKILL.md) skill helps agents author and calibrate specs.

2. Validate structure with the CLI in [`packages/agentbehavior`](packages/agentbehavior). From a clone of this repository:

   ```bash
   pnpm install
   pnpm build
   pnpm exec agentbehavior validate .
   ```

3. Evaluate traces against your specs. The runnable [examples](examples/) show a `true`/`false`/`na` judging convention over recorded trajectories.

## Documentation

Full documentation is published at [agentbehavior.dev](https://agentbehavior.dev):

- [Specification](https://agentbehavior.dev/#specification): the complete format, discovery model, and validation rules.
- [Quickstart](https://agentbehavior.dev/#quickstart): create your first behavior spec.
- [Client implementation guide](docs/client-implementation/adding-behaviors-support.mdx): add support for behavior specs to your own tooling.

## Contributing

Agent behavior began as a collaboration between [Basis](https://www.getbasis.ai/)
and [Braintrust](https://www.braintrust.dev/). Contributions are welcome. See
[CONTRIBUTING.md](CONTRIBUTING.md) for development setup and useful commands.

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).

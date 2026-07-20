# Portable Agent Behavior format contract

Use this summary when the Agent Behavior source repository and its
`docs/specification.mdx` are not available. If a project contains a newer
local specification, that specification is authoritative.

## Terminology

- A behavior spec is one `.agents/behaviors/<name>/BEHAVIOR.md` file and its
  directory. It may describe one behavior or several related behaviors.
- A behavior is a recurring pattern of agent conduct.

## Required layout

```text
.agents/behaviors/
└── behavior-name/
    └── BEHAVIOR.md
```

`BEHAVIOR.md` contains YAML frontmatter followed by free-form Markdown:

```markdown
---
name: behavior-name
description: Describe the recurring behavior and when it applies.
---

# Behavior name

Describe the recurring conduct the agent should exhibit and what it should avoid.
```

The required frontmatter fields are:

- `name`: no more than 64 characters; lowercase letters, numbers, and hyphens
  only; must not start or end with a hyphen; must match the parent directory.
- `description`: non-empty, no more than 1,024 characters, and useful for
  discovering the spec's scope.

Optional fields are `license` and a key-value `metadata` mapping. Consumers
must ignore unknown frontmatter fields.

## Body contract

The Markdown body is free-form. It should name each recurring behavior,
describe when it applies, describe desired conduct, and describe undesired
conduct or failure modes. Headings, labels, order, and prose structure are
not prescribed.

A spec may group behaviors that belong to the same agent, product surface,
or behavioral domain and should be discovered and reviewed together. Use
separate specs when behaviors need independent ownership, discovery, or
reuse.

The recommended intent, evidence, decision, execution, recovery, and failure
mode dimensions are authoring prompts, not required fields.

## Use boundary

Behavior specs primarily support trace review, eval design, prompt and skill
audits, debugging, and documentation. They are not automatically runtime
prompt text. A tool should not inject every behavior into an agent's context
unless it is intentionally building a behavior-conditioned agent.

Agent Behavior does not prescribe verdict labels, judge prompts, occurrence
units, scores, or aggregation. Those belong to the review or evaluation
harness.

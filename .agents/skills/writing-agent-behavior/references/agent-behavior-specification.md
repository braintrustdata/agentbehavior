# Agent Behavior specification

This is the complete format contract bundled with the `writing-agent-behavior` skill. It is sufficient to create, review, and structurally validate an Agent Behavior spec without access to another repository or external documentation.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** express requirement, prohibition, recommendation, discouraged practice, and permission respectively.

## Terminology

- **Agent Behavior** is the name of this format.
- A **behavior spec** consists of a `.agents/behaviors/<name>/BEHAVIOR.md` file and its directory. It can describe one or more behaviors.
- A **behavior** is a recurring pattern of agent conduct.

## Directory structure

Behavior specs live under `.agents/behaviors/`. Each spec has its own directory containing a `BEHAVIOR.md` file:

```text
.agents/behaviors/
└── behavior-name/
    ├── BEHAVIOR.md       # Required: metadata and behavior text
    ├── references/       # Optional: rationale, examples, background docs
    └── ...               # Optional additional files
```

The directory name is the behavior spec's stable identifier and MUST match the `name` field in `BEHAVIOR.md`.

## `BEHAVIOR.md` format

The canonical file name is `BEHAVIOR.md`. Clients MUST look for this exact name when discovering behavior specs and MAY also accept case variants. For portability, behavior specs SHOULD use `BEHAVIOR.md`.

A `BEHAVIOR.md` file MUST contain YAML frontmatter followed by Markdown content.

### Frontmatter

| Field         | Required | Constraints                                                                                                                                     |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | Yes      | Maximum 64 characters. Lowercase letters, numbers, and hyphens only. MUST NOT start or end with a hyphen. MUST match the parent directory name. |
| `description` | Yes      | Maximum 1,024 characters. Non-empty. Describes the behavior spec's scope and when it applies.                                                   |
| `license`     | No       | License name or reference to a bundled license file.                                                                                            |
| `metadata`    | No       | Key-value mapping for client-specific metadata.                                                                                                 |

Clients MUST ignore unknown frontmatter fields.

Minimal example:

```markdown
---
name: behavior-name
description: Describe the recurring behavior and when it applies.
---

# Behavior name

Describe the recurring conduct the agent should exhibit and what it should avoid.
```

### Body content

The Markdown body describes one or more behaviors. It SHOULD be written for people and agents who review traces, design evals, or align prompts. It is not primarily runtime prompt text.

The body is free-form Markdown. Authors can use any headings, labels, order, or prose structure that communicates the behaviors clearly. Clients MUST treat the organization as free-form content.

A behavior describes recurring agent conduct and when it matters, not merely low-level rules or one-off procedures.

A behavior body SHOULD:

- name each recurring behavior clearly
- describe when each behavior applies
- describe desired conduct
- describe undesired conduct or failure modes

A single `BEHAVIOR.md` MAY group behaviors that belong to the same agent, product surface, or behavioral domain and should be discovered and reviewed together. Give each behavior a clear heading or label. Use separate specs when behaviors need independent ownership, discovery, or reuse.

For example, a spec named `support-assistance` could provide an agent overview followed by sections such as `## Page-grounded assistance`, `## Evidence-backed answers`, and `## Bias to action`. Each section describes a separate behavior but shares the file's frontmatter.

## Recommended behavior dimensions

Authors are strongly encouraged to consider these dimensions for each substantive behavior. They make specs easier to review and translate into evals:

- **Intent:** why the behavior matters and when it applies.
- **Evidence:** what the agent SHOULD inspect, retrieve, preserve, or verify before deciding.
- **Decision:** what the agent SHOULD infer, choose, or become confident about.
- **Execution:** what the agent SHOULD do after deciding.
- **Recovery:** what the agent SHOULD do when the first path fails, evidence is incomplete, or the request is ambiguous.
- **Failure modes:** what bad or unintended behavior the spec is meant to prevent.

These dimensions are flexible guidance. They MAY appear in prose or be combined, renamed, reordered, or omitted when trivial or redundant.

When these dimensions apply, evidence is the input to a decision, the decision is the conclusion, execution is the visible action, and recovery is what happens when the first path fails.

### Optional structured template

```markdown
# Behavior name

**Intent:** Why this behavior matters and when it applies.

**Evidence:** What the agent SHOULD inspect, retrieve, preserve, or verify before deciding.

**Decision:** What the agent SHOULD infer, choose, or become confident about.

**Execution:** What the agent SHOULD do after deciding.

**Recovery:** What the agent SHOULD do when the first path fails, evidence is incomplete, or the request is ambiguous.

**Failure modes:** What bad or unintended behavior the spec is meant to prevent.
```

This template is one way to organize a behavior. It is not required.

### Complete grouped example

```markdown
---
name: primary-source-tax-research
description: Tax research conduct for loading the research method and consulting primary sources before answering.
---

# Primary-source tax research

## Load current research guidance before source research

When beginning source research to answer a tax question, the agent first loads the current tax-research guidance, before searching or opening a source. Loading the guidance after the first search or source open does not satisfy this behavior.

## Consult primary sources before answering

When answering a tax question, the agent may use web search and secondary sources to find the relevant rule. Before deciding on the answer, it reads the relevant primary source and bases its conclusion on that source. It does not rely on secondary sources or pre-training alone, even when they would produce the correct answer.
```

## What belongs in a behavior spec

Add a behavior when it matters across many interactions or traces. A spec may cover one behavior or several related behaviors.

Good candidates are behaviors that are:

- **Frequent:** they appear in a meaningful share of the agent's work.
- **High-impact:** mistakes affect correctness, trust, safety, cost, or user experience.
- **Agent-defining:** they capture a design choice about what kind of agent this is.
- **Ambiguous by default:** reasonable agents or prompt writers might behave differently unless the behavior is stated.
- **Spread across context:** reviewers would otherwise need to read prompts, skills, tool docs, examples, traces, or evals to infer the behavior.
- **Useful for debugging:** naming the behavior helps explain failures in real traces.

Do not use behavior specs for every agent instruction. Exclude rare, low-risk details, tool syntax, one-off procedures, slogans, and eval implementation details unless they express an important behavioral commitment.

## Optional directories

### `references/`

Supporting material for reviewers and eval authors may include:

- rationale documents
- example traces
- background documents
- domain-specific context

## Discovery and use

Tools that support Agent Behavior SHOULD scan `.agents/behaviors/` for subdirectories containing `BEHAVIOR.md` or a supported case variant.

At minimum, a discovered behavior spec record contains:

| Field         | Description                                             |
| ------------- | ------------------------------------------------------- |
| `name`        | Stable behavior spec identifier from frontmatter.       |
| `description` | Short description of the spec's scope from frontmatter. |
| `location`    | Absolute or project-relative path to `BEHAVIOR.md`.     |

Unlike skills, behaviors are not primarily loaded to help a model complete its next task. Clients SHOULD NOT inject all behavior specs into runtime prompts unless intentionally building a behavior-conditioned agent.

Behavior specs are usually loaded when:

- reviewing traces
- designing or updating evals
- auditing prompts, skills, or tools
- debugging behavior regressions
- generating documentation about expected agent conduct

## Validation

Validation has two layers: structural validity, which tools can check, and quality, which requires human or model judgment.

### Structural validity

A structurally valid behavior directory:

- is a directory under `.agents/behaviors/`
- contains `BEHAVIOR.md` or a client-supported case variant
- has YAML frontmatter delimited by `---`
- has frontmatter that parses as a YAML mapping
- includes a non-empty `name` field
- uses a `name` that is at most 64 characters
- uses a `name` containing only lowercase letters, numbers, and hyphens
- uses a `name` that does not start or end with a hyphen
- uses a `name` that matches the parent directory
- includes a non-empty `description` field
- uses a `description` that is at most 1,024 characters
- if present, uses `metadata` as a key-value mapping

Clients SHOULD skip structurally invalid specs and surface a diagnostic rather than load partial or ambiguous content.

### Quality criteria

A useful behavior spec SHOULD:

- clearly distinguish the recurring behavior or behaviors it covers
- describe when each behavior applies
- describe desired conduct
- describe undesired conduct or failure modes
- give a reviewer enough context to assess the behavior in a trace

Authors SHOULD use the recommended dimensions when they add clarity. Structural validation applies only to the directory and frontmatter requirements; body organization remains free-form, including for specs that group multiple behaviors.

## Evaluation boundary

Agent Behavior does not prescribe verdict labels, judge prompts, occurrence units, scores, or aggregation. Those belong to the review or evaluation harness.

Behavior specs primarily support trace review, eval design, prompt and skill audits, debugging, and documentation. They are not automatically runtime prompt text. A tool SHOULD NOT inject every behavior into an agent's context unless it is intentionally building a behavior-conditioned agent.

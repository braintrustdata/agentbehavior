# agentbehavior

Validator and CLI for [Agent Behavior](../../README.md) specs.

```bash
agentbehavior validate .
agentbehavior list .
agentbehavior explain .agents/behaviors/cost-sensitive-actions
```

The CLI validates only structural requirements from the Agent Behavior specification, including `BEHAVIOR.md` discovery, YAML frontmatter parsing, `name` and `description` constraints, and `metadata`.

The CLI treats the Markdown body as free-form content that may describe one or more behaviors. Authors can use whichever headings and organization communicate those behaviors clearly.

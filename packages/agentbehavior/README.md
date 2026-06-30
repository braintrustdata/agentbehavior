# agentbehavior

Validator and CLI for [Agent Behavior](../../README.md) specs.

```bash
agentbehavior validate .
agentbehavior list .
agentbehavior explain .agents/behaviors/cost-sensitive-actions
```

The CLI validates structural requirements from the Agent Behavior specification, including `BEHAVIOR.md` discovery, YAML frontmatter parsing, `name` and `description` constraints, `format_version`, and `metadata`.

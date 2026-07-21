---
name: writing-agent-behavior
description: Authors and revises Agent Behavior BEHAVIOR.md specs that capture recurring, judgeable agent conduct. Use when creating, reviewing, splitting, grouping, or calibrating behavior specs, or when translating trace failures and runtime guidance into durable behaviors. Do not use it merely to score a completed trajectory or write a runtime prompt.
---

# Writing Agent Behavior

Write the smallest durable behavior spec that lets people and evaluators distinguish acceptable from unacceptable conduct across real trajectories.

The bundled [Agent Behavior specification](references/agent-behavior-specification.md) is the complete format contract for this skill. The skill does not require the Agent Behavior source repository, a network connection, or any documentation outside this directory.

## Start from source evidence

1. Read the bundled [Agent Behavior specification](references/agent-behavior-specification.md) before authoring or validating a behavior. A target project may add local conventions, but do not depend on a source checkout or external documentation for the core format.
2. Inspect related `BEHAVIOR.md` files before creating a new one.
3. Read the actual prompts, skills, tool instructions, traces, or user decisions that establish the intended conduct. Separate observed behavior from intended behavior.
4. Identify whether the task is a new spec, a revision, a split, or a merge. Preserve existing intent unless the evidence explicitly changes it.

If the repository has manifests, registries, or generated indexes, inspect those before moving or renaming a spec. Folder placement is not necessarily activation.

## Decide whether the behavior belongs

Use [deciding-what-to-save.md](references/deciding-what-to-save.md). Prefer a sparse set of high-impact, recurring choices over an inventory of every instruction.

A useful candidate usually has all three:

- a recognizable class of situations in which it applies
- a meaningful choice about how the agent should act
- evidence in a trajectory that could show whether the choice occurred

Do not elevate generic virtues, tool syntax, one-off procedures, implementation details, or a disguised scoring rubric. A named runtime mechanism can be a behavior when using that mechanism is itself a durable, recurring control point and the trajectory can prove whether it happened; make that reason explicit in the spec.

## Choose the unit

A behavior spec is a directory and its `BEHAVIOR.md`; the file may describe one behavior or several related behaviors.

- Group behaviors when they share ownership, discovery, or a behavioral domain and should be reviewed together.
- Split behaviors when they need independent ownership, discovery, reuse, or adjudication.
- Give every substantive behavior a clear heading or label when a file contains more than one.
- Do not group unrelated behaviors merely because the same agent performs them.

Before drafting, answer these questions in working notes:

1. When does this behavior apply?
2. What should the agent do or avoid?
3. What trajectory evidence would show that it occurred?
4. Why does the distinction matter?

These are authoring questions, not required Markdown sections. Compress them into natural prose when that reads better.

## Write the spec

Create `.agents/behaviors/<name>/BEHAVIOR.md` with the required frontmatter:

```markdown
---
name: <name>
description: <what this spec covers and when it applies>
---
```

The `name` must match the parent directory and satisfy the constraints in the specification. Keep `description` useful for discovery; do not put the whole behavior there.

Write the body for a teammate who has the trajectory but not the author's background context:

- Name the agent as the subject and use active voice.
- State the trigger and expected conduct directly.
- Describe observable evidence without dictating a particular judge implementation.
- Include the important negative boundary: what would count as wrong, or what the agent need not do.
- Keep examples illustrative. Do not let one case define the general rule.
- Prefer one behavioral idea per sentence. If a sentence accumulates exceptions, give the exception its own sentence or paragraph.
- Use the recommended intent, evidence, decision, execution, recovery, and failure-mode dimensions when they add clarity, not as mandatory boxes.

Example:

```markdown
## Primary-source tax research

When answering a substantive tax question, the agent may use secondary sources to orient its research, but it consults relevant primary authority before deciding on the answer. The answer distinguishes primary authority from explanatory material and makes uncertainty visible when the available authority does not resolve the question. A correct conclusion reached without consulting relevant primary authority does not satisfy this behavior.
```

## Calibrate before shipping

Use [calibrating-with-trajectories.md](references/calibrating-with-trajectories.md) for a new or materially changed behavior. A small, deliberate fixture set is usually more useful than a large synthetic corpus.

At minimum, test the wording against:

- a positive trajectory where the trigger fires and the conduct occurs
- a negative trajectory where the trigger fires and the conduct does not occur
- an outside-scope trajectory where the trigger does not fire
- a lucky-correct negative where the final answer could hide the wrong process

If reviewers cannot locate the trigger or evidence in a trajectory, revise the behavior's altitude or improve observability. Do not solve an observability problem by inventing hidden facts in the judge.

## Keep behavior and runtime context distinct

Behavior specs are normally answer-key context for review and evaluation, not instructions automatically shown to the evaluated agent. In an observational eval, keep the target agent blind to the behavior spec. If the experiment intentionally conditions the agent on the behavior, label that as a separate intervention.

## Validate and reconcile

If the repository provides the Agent Behavior CLI, run its validator against the changed spec, for example:

```bash
agentbehavior validate .agents/behaviors/<name>
```

If the command is unavailable, do not install it without authorization. Validate the path, frontmatter, and body manually against the bundled [Agent Behavior specification](references/agent-behavior-specification.md), and report that CLI validation was not run.

Then:

1. Re-read the rendered Markdown without the source notes.
2. Confirm every claim is grounded in an authoritative source or explicit design decision.
3. Check related specs for duplication or contradiction.
4. Update any repository-specific manifest, registry, or documentation that owns discovery or activation.
5. Record which calibration trajectories exercised positive, negative, and outside-scope boundaries, using the labels defined by the chosen review harness.

## Final review

A behavior is ready when a cold reader can answer:

- What recurring situation activates it?
- What meaningful conduct is required or prohibited?
- Where would that conduct be visible in a trajectory?
- Can a correct outcome still violate it?
- If the harness supports a not-applicable result, is it reserved for cases where the trigger genuinely did not occur or the trace cannot decide the behavior under that harness's contract?
- Is the rule broad enough to survive beyond the example, but narrow enough to adjudicate?

If those answers require oral context, keep editing.

## References

- [Deciding what to save](references/deciding-what-to-save.md)
- [Calibrating with trajectories](references/calibrating-with-trajectories.md)
- [Bundled Agent Behavior specification](references/agent-behavior-specification.md)

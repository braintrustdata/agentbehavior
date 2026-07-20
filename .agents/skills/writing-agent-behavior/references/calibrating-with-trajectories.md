# Calibrating with trajectories

Calibration tests whether a behavior's words produce the distinctions the author intended. It is not a search for a perfect judge prompt.

## Start with a compact fixture matrix

Handwritten fictional trajectories are often enough for first-pass calibration. They are cheap to inspect, make boundaries explicit, and do not require a live agent harness.

Include:

| Scenario                        | What it proves                                                           |
| ------------------------------- | ------------------------------------------------------------------------ |
| Positive                        | The trigger occurs and the expected conduct is visible.                  |
| Negative                        | The trigger occurs and required conduct is missing or contradicted.      |
| Lucky-correct negative          | The final outcome is correct, but the required process was not followed. |
| Outside scope                   | The trigger never occurs; the behavior is not merely unproven.           |
| Allowed boundary, when relevant | The agent takes a permitted alternative path that must not be penalized. |

Use complete trajectories rather than isolated final answers when the behavior concerns research, decisions, tool use, recovery, delegation, or verification.

## Keep fixtures honest

- Make trajectories fictional and non-sensitive unless real traces are explicitly authorized.
- Include the evidence the judge is allowed to use; do not rely on facts outside the trace.
- Keep fixture IDs, descriptions, and expected labels out of the judge's evidence.
- Do not make the negative case comically bad. It should resemble a plausible agent run.
- Change one important boundary at a time so a disagreement has a diagnosable cause.
- Preserve tool calls, subagent events, retrieved sources, and artifacts when they are relevant to the conduct.

Synthetic trajectories do not need to be model-generated. Generate them only when natural variation is itself part of the test; otherwise deliberate static fixtures are easier to reason about and reproduce.

## Separate the evaluated agent from the judge

For an observational eval:

1. The evaluated agent receives its normal runtime context and task.
2. The judge receives the resulting trajectory plus the behavior spec.
3. The evaluated agent does not receive the behavior spec solely because it is being evaluated.

Showing the behavior to the agent may be useful as a separate behavior-conditioned experiment, but it answers a different question.

## Judge conduct, not outcomes alone

First decide whether the behavior's trigger occurs in the trajectory. When it does, identify each firing of that trigger and judge the conduct for that occurrence.

- A positive occurrence has evidence of the required conduct.
- A negative occurrence is missing, contradicts, or materially fails the required conduct.
- When no trigger fires, the behavior is outside scope for that trajectory. A harness may represent this as `not applicable`, `skipped`, or by excluding it from the denominator.

Absence of evidence is not automatically outside scope. If the trigger occurred but required evidence is missing from an exhaustively recorded channel, that is usually negative. Conversely, do not infer invisible work merely because the final answer is correct.

A useful review harness cites trace evidence and explains the result briefly. If the trace cannot expose a behavior that matters, improve the behavior's observability or the trace instrumentation.

## Grouped specs

Agent Behavior does not prescribe labels, a judging algorithm, or a folding algorithm. If a harness treats H2 sections as independent behavior units, make that convention explicit and test it.

For example, a production-style harness could use `true`, `false`, and `not applicable`, then fold them deterministically:

- judge each trigger occurrence as true or false
- mark a section not applicable when no trigger occurrence fires
- fold a section to false if any occurrence is false
- otherwise fold it to true if at least one occurrence is true
- fold a file to false if any section is false; otherwise true if any section is true; otherwise not applicable

This prevents an all-not-applicable trajectory from silently becoming a pass and prevents one successful occurrence from hiding a later failure. Other harnesses may use `pass`/`partial`/`fail`, scores, human review, or no aggregation. The labels and fold are harness conventions, not part of the Agent Behavior format.

## Diagnose disagreements at the right layer

When expected and observed verdicts differ, classify the cause before editing:

- **Behavior wording:** the trigger, conduct, exception, or evidence boundary is ambiguous.
- **Fixture:** the trajectory lacks decisive evidence or accidentally tests multiple things.
- **Judge:** the prompt leaks expected labels, ignores evidence, or applies the wrong unit.
- **Telemetry:** the relevant action occurred outside the visible trace.
- **Policy:** reviewers disagree about the intended behavior itself.

Fix the owning layer. Do not contort the behavior text to compensate for a leaked fixture or broken judge.

## Ready-to-ship check

Calibration is sufficient for an initial behavior when:

- positive, negative, and outside-scope cases receive the intended harness result
- a lucky-correct negative remains negative
- important allowed alternatives are not penalized
- verdict explanations point to evidence in the trajectory
- the result does not depend on fixture labels or case-specific wording
- another reviewer can explain the same boundary without oral context

Production calibration should add real, authorized trajectories over time, especially near boundaries and after prompt, tool, or model changes.

---
name: primary-source-tax-research
description: Tax research conduct for loading the research method and consulting primary sources before answering.
---

# Primary-source tax research

## Read the tax research skill before beginning source research

When beginning source research to answer a tax question, the agent first reads the tax research skill, before searching or opening a source. Reading the skill after the first search or source open does not satisfy this behavior.

Each tax research process is one occurrence.

**Why:** The skill is the versioned source of the current research method. Reading it before research is the observable control that ensures the source search follows that method.

## Consult primary sources before answering

When answering a tax question, the agent may use web search and secondary sources to find the relevant rule. Before deciding on the answer, it reads the relevant primary source and bases its conclusion on that source. It does not rely on secondary sources or pre-training alone, even when they would produce the correct answer.

Each tax conclusion is one occurrence.

**Why:** The users of this workflow are accountants who expect to be able to tie each tax conclusion back to the primary source that supports it.

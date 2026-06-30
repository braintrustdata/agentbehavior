# Contributing

Thanks for helping improve Agent Behavior. This repo contains the Agent Behavior specification, documentation, examples, and the `agentbehavior` TypeScript CLI package.

## Development setup

Use [mise](https://mise.en.dev/getting-started.html) to install the Node.js and pnpm versions from `mise.toml`:

```bash
mise install
pnpm install --frozen-lockfile
```

## Useful commands

Run commands from the repository root unless noted otherwise.

```bash
pnpm check          # format, lint, and type checks
pnpm test           # run package tests
pnpm build          # build workspace packages
pnpm dev            # start the docs dev server
```

For package-scoped work:

```bash
pnpm --filter agentbehavior test
pnpm --filter agentbehavior build
pnpm --filter @agentbehavior/docs dev
```

## Repository layout

- `docs/` — specification and documentation source.
- `examples/` — example behavior specs and runnable examples.
- `packages/agentbehavior/` — validator library and `agentbehavior` CLI.


#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { analyzeFinancialScenario, runFinancialVerificationAgent } from "./agent.js";
import { loadPackageEnvironment } from "./env.js";

interface CliArgs {
  help: boolean;
  offline: boolean;
  question: string | undefined;
  model: string | undefined;
}

function usage(): string {
  return `financial-verification-agent is a toy agent based on examples/.agents/behaviors/financial-work-verification.

Usage:
  vp run --filter @agentbehavior/financial-verification-agent agent -- [options]

Options:
  -q, --question <text>  Override the default verification question
      --model <name>     Override BRAINTRUST_MODEL for one run
      --offline          Print the deterministic verification report without calling the gateway
  -h, --help             Show this help

Environment:
  BRAINTRUST_API_KEY is required unless --offline is used.
  BRAINTRUST_MODEL defaults to gpt-5-mini.
  BRAINTRUST_GATEWAY_BASE_URL defaults to https://gateway.braintrust.dev.
`;
}

function parseCliArgs(argv: string[]): CliArgs {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      model: { type: "string" },
      offline: { type: "boolean" },
      question: { type: "string", short: "q" },
    },
  });

  return {
    help: values.help ?? false,
    offline: values.offline ?? false,
    question: values.question ?? (positionals.length > 0 ? positionals.join(" ") : undefined),
    model: values.model,
  };
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  let args: CliArgs;
  try {
    args = parseCliArgs(argv[0] === "--" ? argv.slice(1) : argv);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage()}`);
    return 1;
  }

  if (args.help) {
    process.stdout.write(usage());
    return 0;
  }

  await loadPackageEnvironment(import.meta.url);

  try {
    if (args.offline) {
      const report = await analyzeFinancialScenario();
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return 0;
    }

    const result = await runFinancialVerificationAgent({
      ...(args.question === undefined ? {} : { question: args.question }),
      ...(args.model === undefined ? {} : { gateway: { model: args.model } }),
    });
    process.stdout.write(`${result.answer.trim()}\n\n`);
    process.stdout.write(`Verification report:\n${JSON.stringify(result.report, null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}

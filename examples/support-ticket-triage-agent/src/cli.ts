#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { analyzeSupportTicket, runSupportTicketTriageAgent } from "./agent.js";
import { loadPackageEnvironment } from "./env.js";
import { ambiguousTicket, sampleTicket, securityTicket } from "./sampleData.js";

interface CliArgs {
  help: boolean;
  offline: boolean;
  model: string | undefined;
  scenario: "api" | "security" | "ambiguous";
}

function usage(): string {
  return `support-ticket-triage-agent is a toy agent based on examples/.agents/behaviors/support-ticket-triage.

Usage:
  vp run --filter @agentbehavior/support-ticket-triage-agent agent -- [options]

Options:
      --scenario <name>  Use api, security, or ambiguous (default: api)
      --model <name>     Override BRAINTRUST_MODEL for one run
      --offline          Print the deterministic triage report without calling the gateway
  -h, --help             Show this help

Environment:
  BRAINTRUST_API_KEY is required unless --offline is used.
  BRAINTRUST_MODEL defaults to gpt-5-mini.
  BRAINTRUST_GATEWAY_BASE_URL defaults to https://gateway.braintrust.dev.
`;
}

function parseCliArgs(argv: string[]): CliArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", short: "h" },
      model: { type: "string" },
      offline: { type: "boolean" },
      scenario: { type: "string", default: "api" },
    },
  });

  const scenario = values.scenario;
  if (scenario !== "api" && scenario !== "security" && scenario !== "ambiguous") {
    throw new Error("--scenario must be api, security, or ambiguous");
  }

  return {
    help: values.help ?? false,
    offline: values.offline ?? false,
    model: values.model,
    scenario,
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
  const ticket =
    args.scenario === "security"
      ? securityTicket
      : args.scenario === "ambiguous"
        ? ambiguousTicket
        : sampleTicket;

  try {
    if (args.offline) {
      const report = await analyzeSupportTicket(ticket);
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return 0;
    }

    const result = await runSupportTicketTriageAgent({
      ticket,
      ...(args.model === undefined ? {} : { gateway: { model: args.model } }),
    });
    process.stdout.write(`${result.answer.trim()}\n\n`);
    process.stdout.write(`Triage report:\n${JSON.stringify(result.report, null, 2)}\n`);
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

#!/usr/bin/env tsx
import { scan } from "./orchestrator";
import { priceCover } from "./pricing";
import type { ChainName } from "./types";

interface Args {
  chain: ChainName;
  max: number;
  json: boolean;
  hardened: boolean;
  port?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { chain: "tempo", max: 0, json: false, hardened: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--chain") args.chain = argv[++i] as ChainName;
    else if (a === "--max") args.max = Number(argv[++i]);
    else if (a === "--json") args.json = true;
    else if (a === "--hardened") args.hardened = true;
    else if (a === "--port") args.port = Number(argv[++i]);
  }
  return args;
}

function usd(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const argv = process.argv.slice(2);
  const rest = argv[0] === "scan" ? argv.slice(1) : argv;
  const args = parseArgs(rest);

  const report = await scan({
    chain: args.chain,
    hardened: args.hardened,
    fork: args.port ? { port: args.port } : undefined
  });
  const quote = priceCover(report);

  if (args.json) {
    console.log(JSON.stringify({ report, quote }));
    return;
  }

  {
    console.log(`\nProofhaus scan  chain=${report.chain}  (${report.durationSec}s)`);
    console.log("-".repeat(56));
    for (const m of report.modules) {
      const mark = m.success ? "EXPLOITED" : "safe     ";
      console.log(`  ${mark}  ${m.name.padEnd(20)} ${usd(m.extractedUsd)}`);
    }
    console.log("-".repeat(56));
    console.log(`  extractable        ${usd(report.totalExtractedUsd)}`);
    console.log(`  annual premium     ${usd(quote.annualPremiumUsd)}  (risk x${quote.riskMultiplier})`);
    console.log("-".repeat(56));
  }

  if (report.totalExtractedUsd > args.max) {
    console.error(`\nFAIL  extractable ${usd(report.totalExtractedUsd)} exceeds max ${usd(args.max)}`);
    process.exit(1);
  }
  console.log(`\nPASS  extractable within max ${usd(args.max)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

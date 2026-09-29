import type { AttackModule, ModuleResult, ScanReport, ChainName, TargetInput } from "./types";
import type { TargetKind } from "./target";
import { ForkRunner, type ForkOptions } from "./fork";
import { sumExtraction } from "./report";
import { sandwichModule } from "./modules/sandwich";
import { oracleModule } from "./modules/oracle";
import { shareInflationModule } from "./modules/shareInflation";
import { reentrancyModule } from "./modules/reentrancy";

export const allModules: AttackModule[] = [
  sandwichModule,
  oracleModule,
  shareInflationModule,
  reentrancyModule
];

// which attack modules apply to each target shape
const KIND_MODULES: Record<TargetKind, AttackModule[]> = {
  erc4626: [shareInflationModule],
  amm: [sandwichModule, oracleModule],
  bank: [reentrancyModule]
};

// bring-your-own kinds wired so far
const SUPPORTED_BYO: TargetKind[] = ["erc4626", "amm"];

export interface ScanOptions {
  chain?: ChainName;
  commit?: string;
  hardened?: boolean;
  target?: TargetInput;
  modules?: AttackModule[];
  fork?: ForkOptions;
}

export async function scan(opts: ScanOptions = {}): Promise<ScanReport> {
  const chain = opts.chain ?? "tempo";
  const hardened = opts.hardened ?? false;

  let modules: AttackModule[];
  if (opts.target) {
    if (!SUPPORTED_BYO.includes(opts.target.kind)) {
      throw new Error(`bring-your-own "${opts.target.kind}" targets are not supported yet`);
    }
    modules = KIND_MODULES[opts.target.kind];
  } else {
    modules = opts.modules ?? allModules;
  }

  const fork = new ForkRunner(opts.fork);
  const start = Date.now();
  const results: ModuleResult[] = [];

  await fork.start();
  try {
    for (const m of modules) {
      const snap = await fork.snapshot();
      try {
        results.push(await m.run(fork, { hardened, target: opts.target }));
      } catch (err) {
        results.push({
          name: m.name,
          success: false,
          extractedUsd: 0,
          note: `module errored: ${(err as Error).message}`
        });
      } finally {
        await fork.revert(snap);
      }
    }
  } finally {
    await fork.stop();
  }

  return {
    target: opts.target ? `byo:${opts.target.kind}` : hardened ? "sample-suite-hardened" : "sample-suite",
    chain,
    commit: opts.commit,
    totalExtractedUsd: sumExtraction(results),
    durationSec: Math.round((Date.now() - start) / 100) / 10,
    modules: results
  };
}

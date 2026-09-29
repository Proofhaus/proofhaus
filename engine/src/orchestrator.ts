import type { AttackModule, ModuleResult, ScanReport, ChainName } from "./types";
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

export interface ScanOptions {
  chain?: ChainName;
  commit?: string;
  hardened?: boolean;
  modules?: AttackModule[];
  fork?: ForkOptions;
}

export async function scan(opts: ScanOptions = {}): Promise<ScanReport> {
  const modules = opts.modules ?? allModules;
  const chain = opts.chain ?? "tempo";
  const hardened = opts.hardened ?? false;
  const fork = new ForkRunner(opts.fork);
  const start = Date.now();
  const results: ModuleResult[] = [];

  await fork.start();
  try {
    for (const m of modules) {
      const snap = await fork.snapshot();
      try {
        results.push(await m.run(fork, { hardened }));
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
    target: hardened ? "sample-suite-hardened" : "sample-suite",
    chain,
    commit: opts.commit,
    totalExtractedUsd: sumExtraction(results),
    durationSec: Math.round((Date.now() - start) / 100) / 10,
    modules: results
  };
}

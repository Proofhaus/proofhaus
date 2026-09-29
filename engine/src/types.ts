import type { ForkRunner } from "./fork";

export type ChainName = "tempo" | "base" | "robinhood";

export interface ModuleResult {
  name: string;
  success: boolean;
  extractedUsd: number;
  note?: string;
}

export interface ScanReport {
  target: string;
  chain: ChainName;
  commit?: string;
  totalExtractedUsd: number;
  durationSec: number;
  modules: ModuleResult[];
}

export interface RunOptions {
  hardened?: boolean; // run against the hardened target twin
}

export interface AttackModule {
  name: string;
  run(fork: ForkRunner, opts?: RunOptions): Promise<ModuleResult>;
}

import type { ForkRunner } from "./fork";

export type ChainName = "tempo" | "base" | "robinhood";

// result of running one attack module against a target
export interface ModuleResult {
  name: string;
  success: boolean;
  extractedUsd: number;
  note?: string;
}

// the artifact the CLI, badge, dashboard, and attestation all consume
export interface ScanReport {
  target: string;
  chain: ChainName;
  commit?: string;
  totalExtractedUsd: number;
  durationSec: number;
  modules: ModuleResult[];
}

// every module in modules/ implements this; it gets a live fork to work against
export interface AttackModule {
  name: string;
  run(fork: ForkRunner): Promise<ModuleResult>;
}

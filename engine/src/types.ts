import type { ForkRunner } from "./fork";
import type { Artifact } from "./artifacts";
import type { TargetKind } from "./target";

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

export interface TargetInput {
  kind: TargetKind;
  artifact: Artifact;
}

export interface RunOptions {
  hardened?: boolean;
  target?: TargetInput;
}

export interface AttackModule {
  name: string;
  run(fork: ForkRunner, opts?: RunOptions): Promise<ModuleResult>;
}

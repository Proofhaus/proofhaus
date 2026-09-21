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

// what the engine hands each module: a live fork endpoint and the addresses
export interface AttackContext {
  rpcUrl: string;
  target: `0x${string}`;
  attacker: `0x${string}`;
}

// every module in modules/ implements this
export interface AttackModule {
  name: string;
  run(ctx: AttackContext): Promise<ModuleResult>;
}

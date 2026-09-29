import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

// the attack shapes the engine can match against a bring-your-own contract
export type TargetKind = "amm" | "erc4626" | "bank";
const KINDS: TargetKind[] = ["amm", "erc4626", "bank"];

export interface TargetManifest {
  kind: TargetKind;
  artifact: string; // path to a compiled foundry artifact json
}

export function loadManifest(path: string): TargetManifest {
  const abs = isAbsolute(path) ? path : join(process.cwd(), path);
  const raw = JSON.parse(readFileSync(abs, "utf8")) as Partial<TargetManifest>;
  if (!raw.kind || !KINDS.includes(raw.kind)) {
    throw new Error(`target manifest: "kind" must be one of ${KINDS.join(", ")}`);
  }
  if (!raw.artifact || typeof raw.artifact !== "string") {
    throw new Error('target manifest: "artifact" path is required');
  }
  return { kind: raw.kind, artifact: raw.artifact };
}

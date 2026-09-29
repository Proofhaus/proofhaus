import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Abi, Hex } from "viem";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "..", "contracts", "out");

export interface Artifact {
  abi: Abi;
  bytecode: Hex;
}

// reads contracts/out/<sourceFile>/<contractName>.json produced by `forge build`
export function loadArtifact(sourceFile: string, contractName: string): Artifact {
  const path = join(OUT_DIR, sourceFile, `${contractName}.json`);
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    abi: Abi;
    bytecode: { object: Hex } | Hex;
  };
  const bytecode = (typeof raw.bytecode === "object" ? raw.bytecode.object : raw.bytecode) as Hex;
  return { abi: raw.abi, bytecode };
}

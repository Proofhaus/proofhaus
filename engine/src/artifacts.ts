import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";
import type { Abi, Hex } from "viem";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "..", "contracts", "out");

export interface Artifact {
  abi: Abi;
  bytecode: Hex;
}

function parseArtifact(json: string): Artifact {
  const raw = JSON.parse(json) as { abi: Abi; bytecode: { object: Hex } | Hex };
  const bytecode = (typeof raw.bytecode === "object" ? raw.bytecode.object : raw.bytecode) as Hex;
  return { abi: raw.abi, bytecode };
}

// built-in targets under contracts/out/<sourceFile>/<contractName>.json
export function loadArtifact(sourceFile: string, contractName: string): Artifact {
  return parseArtifact(readFileSync(join(OUT_DIR, sourceFile, `${contractName}.json`), "utf8"));
}

// a foundry artifact at an arbitrary path (bring-your-own target)
export function loadArtifactAt(artifactPath: string): Artifact {
  const abs = isAbsolute(artifactPath) ? artifactPath : join(process.cwd(), artifactPath);
  return parseArtifact(readFileSync(abs, "utf8"));
}

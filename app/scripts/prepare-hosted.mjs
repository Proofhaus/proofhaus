// on vercel, stage what the scan route needs to run the real engine:
// a static anvil, the compiled contract artifacts, and the engine as one bundle.
// local builds skip this; they use the anvil and engine already on the machine.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(APP, "..");
const VENDOR = join(APP, "vendor");

const FOUNDRY = "v1.5.1";
const TARBALL = `https://github.com/foundry-rs/foundry/releases/download/${FOUNDRY}/foundry_${FOUNDRY}_alpine_amd64.tar.gz`;
const SHA256 = "9cc220ccba9af7ba30f8fe41ae7bda4c274be629f4bf7448eb13b93c65d2ab3e";

const ARTIFACTS = [
  "MockERC20", "VulnerableAMM", "HardenedAMM", "SandwichAttack", "NaiveOracleVault", "HardenedOracleVault",
  "Vault4626", "HardenedVault4626", "ReentrantBank", "HardenedBank", "ReentrancyAttack", "Attestation"
];

if (!process.env.VERCEL && !process.argv.includes("--force")) {
  console.log("prepare-hosted: skipped (local build)");
  process.exit(0);
}

rmSync(VENDOR, { recursive: true, force: true });
const work = mkdtempSync(join(tmpdir(), "ph-foundry-"));

// 1. foundry: a pinned, hash-checked, statically linked build
let tgz = process.env.PROOFHAUS_FOUNDRY_TARBALL;
if (!tgz) {
  tgz = join(work, "foundry.tgz");
  const res = await fetch(TARBALL);
  if (!res.ok) throw new Error(`foundry download failed: ${res.status}`);
  writeFileSync(tgz, Buffer.from(await res.arrayBuffer()));
}
const digest = createHash("sha256").update(readFileSync(tgz)).digest("hex");
if (digest !== SHA256) throw new Error(`foundry tarball hash mismatch: ${digest}`);
execFileSync("tar", ["xzf", tgz, "-C", work, "anvil", "forge"]);
mkdirSync(join(VENDOR, "bin"), { recursive: true });
copyFileSync(join(work, "anvil"), join(VENDOR, "bin", "anvil"));
chmodSync(join(VENDOR, "bin", "anvil"), 0o755);
console.log("prepare-hosted: anvil staged");

// 2. contract artifacts, trimmed to what the engine reads
execFileSync(join(work, "forge"), ["build"], { cwd: join(ROOT, "contracts"), stdio: "inherit" });
for (const name of ARTIFACTS) {
  const src = JSON.parse(readFileSync(join(ROOT, "contracts", "out", `${name}.sol`, `${name}.json`), "utf8"));
  const dir = join(VENDOR, "artifacts", `${name}.sol`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.json`), JSON.stringify({ abi: src.abi, bytecode: { object: src.bytecode.object } }));
}
console.log(`prepare-hosted: ${ARTIFACTS.length} artifacts staged`);

// 3. the engine cli as a single file
const esbuild = await import("esbuild");
await esbuild.build({
  entryPoints: [join(ROOT, "engine", "src", "cli.ts")],
  outfile: join(VENDOR, "engine", "cli.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  logLevel: "warning"
});
console.log("prepare-hosted: engine bundled");
rmSync(work, { recursive: true, force: true });

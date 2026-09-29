import { describe, it, expect, afterAll } from "vitest";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadManifest } from "../src/target";
import { loadArtifactAt } from "../src/artifacts";

const dir = mkdtempSync(join(tmpdir(), "phtarget-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("target manifest", () => {
  it("loads a valid manifest and its artifact", () => {
    const artifactPath = join(dir, "MyVault.json");
    writeFileSync(
      artifactPath,
      JSON.stringify({ abi: [{ type: "function", name: "deposit" }], bytecode: { object: "0x6001" } })
    );
    const manifestPath = join(dir, "proofhaus.target.json");
    writeFileSync(manifestPath, JSON.stringify({ kind: "erc4626", artifact: artifactPath }));

    const m = loadManifest(manifestPath);
    expect(m.kind).toBe("erc4626");

    const art = loadArtifactAt(m.artifact);
    expect(art.bytecode).toBe("0x6001");
    expect(art.abi).toHaveLength(1);
  });

  it("rejects an unknown kind", () => {
    const bad = join(dir, "bad.json");
    writeFileSync(bad, JSON.stringify({ kind: "nope", artifact: "x" }));
    expect(() => loadManifest(bad)).toThrow();
  });

  it("rejects a missing artifact path", () => {
    const bad = join(dir, "bad2.json");
    writeFileSync(bad, JSON.stringify({ kind: "amm" }));
    expect(() => loadManifest(bad)).toThrow();
  });
});

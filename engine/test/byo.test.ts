import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { scan } from "../src/orchestrator";
import { loadArtifactAt } from "../src/artifacts";

const OUT = join(process.cwd(), "..", "contracts", "out");

describe("bring-your-own targets", () => {
  it("attacks a non-sample erc4626 vault", async () => {
    const artifact = loadArtifactAt(join(OUT, "DemoVault.sol", "DemoVault.json"));
    const report = await scan({ target: { kind: "erc4626", artifact }, fork: { port: 8630, accounts: 3 } });

    expect(report.target).toBe("byo:erc4626");
    expect(report.modules).toHaveLength(1);
    expect(report.modules[0].name).toBe("share-inflation");
    expect(report.modules[0].success).toBe(true);
    expect(report.totalExtractedUsd).toBeGreaterThan(0);
  }, 60_000);

  it("attacks a non-sample amm with sandwich and oracle", async () => {
    const artifact = loadArtifactAt(join(OUT, "DemoAMM.sol", "DemoAMM.json"));
    const report = await scan({ target: { kind: "amm", artifact }, fork: { port: 8632, accounts: 3 } });

    expect(report.target).toBe("byo:amm");
    expect(report.modules.map((m) => m.name).sort()).toEqual(["oracle-manipulation", "sandwich"]);
    for (const m of report.modules) expect(m.success).toBe(true);
    expect(report.totalExtractedUsd).toBeGreaterThan(0);
  }, 60_000);
});

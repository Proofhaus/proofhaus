import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { scan } from "../src/orchestrator";
import { loadArtifactAt } from "../src/artifacts";

describe("bring-your-own vault", () => {
  it("attacks a non-sample erc4626 target", async () => {
    const artifact = loadArtifactAt(
      join(process.cwd(), "..", "contracts", "out", "DemoVault.sol", "DemoVault.json")
    );
    const report = await scan({ target: { kind: "erc4626", artifact }, fork: { port: 8630, accounts: 3 } });

    expect(report.target).toBe("byo:erc4626");
    expect(report.modules).toHaveLength(1);
    const m = report.modules[0];
    expect(m.name).toBe("share-inflation");
    expect(m.success).toBe(true);
    expect(m.extractedUsd).toBeGreaterThan(0);
  }, 60_000);
});

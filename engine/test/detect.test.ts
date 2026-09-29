import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { detectKind } from "../src/detect";
import { loadArtifactAt } from "../src/artifacts";

const OUT = join(process.cwd(), "..", "contracts", "out");

describe("detectKind", () => {
  it("classifies a vault artifact as erc4626", () => {
    const a = loadArtifactAt(join(OUT, "DemoVault.sol", "DemoVault.json"));
    expect(detectKind(a.abi)).toBe("erc4626");
  });

  it("classifies an amm artifact as amm", () => {
    const a = loadArtifactAt(join(OUT, "DemoAMM.sol", "DemoAMM.json"));
    expect(detectKind(a.abi)).toBe("amm");
  });

  it("classifies the reentrant bank as bank", () => {
    const a = loadArtifactAt(join(OUT, "ReentrantBank.sol", "ReentrantBank.json"));
    expect(detectKind(a.abi)).toBe("bank");
  });

  it("returns null for an unknown shape", () => {
    const a = loadArtifactAt(join(OUT, "MockERC20.sol", "MockERC20.json"));
    expect(detectKind(a.abi)).toBeNull();
  });
});

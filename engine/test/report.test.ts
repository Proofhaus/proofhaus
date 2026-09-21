import { describe, it, expect } from "vitest";
import { sumExtraction } from "../src/report";
import type { ModuleResult } from "../src/types";

describe("sumExtraction", () => {
  it("sums only successful modules", () => {
    const mods: ModuleResult[] = [
      { name: "a", success: true, extractedUsd: 100 },
      { name: "b", success: false, extractedUsd: 999 },
      { name: "c", success: true, extractedUsd: 50 }
    ];
    expect(sumExtraction(mods)).toBe(150);
  });

  it("returns zero for no modules", () => {
    expect(sumExtraction([])).toBe(0);
  });
});

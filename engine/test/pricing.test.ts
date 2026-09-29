import { describe, it, expect } from "vitest";
import { priceCover, riskMultiplier } from "../src/pricing";
import type { ScanReport } from "../src/types";

function report(total: number, mods: Array<[string, boolean, number]>): ScanReport {
  return {
    target: "x",
    chain: "tempo",
    totalExtractedUsd: total,
    durationSec: 1,
    modules: mods.map(([name, success, extractedUsd]) => ({ name, success, extractedUsd }))
  };
}

describe("pricing", () => {
  it("prices premium from extraction, probability, load, and class count", () => {
    const r = report(100000, [
      ["a", true, 60000],
      ["b", true, 40000]
    ]);
    const q = priceCover(r);
    expect(q.successfulClasses).toBe(2);
    expect(q.riskMultiplier).toBe(1.4);
    expect(q.expectedLossUsd).toBe(15000); // 100000 * 0.15
    expect(q.annualPremiumUsd).toBe(29400); // 15000 * 1.4 * 1.4
  });

  it("a hardened target with no extraction prices to zero", () => {
    const r = report(0, [
      ["a", false, 0],
      ["b", false, 0]
    ]);
    expect(riskMultiplier(r)).toBe(1);
    expect(priceCover(r).annualPremiumUsd).toBe(0);
  });

  it("more successful classes raise the premium", () => {
    const two = priceCover(report(100000, [["a", true, 50000], ["b", true, 50000]]));
    const four = priceCover(
      report(100000, [
        ["a", true, 25000],
        ["b", true, 25000],
        ["c", true, 25000],
        ["d", true, 25000]
      ])
    );
    expect(four.annualPremiumUsd).toBeGreaterThan(two.annualPremiumUsd);
  });
});

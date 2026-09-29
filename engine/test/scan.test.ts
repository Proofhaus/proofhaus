import { describe, it, expect } from "vitest";
import { scan } from "../src/orchestrator";
import { sumExtraction } from "../src/report";

describe("scan", () => {
  it("runs all modules and aggregates a full report", async () => {
    const report = await scan({ chain: "tempo", fork: { port: 8605, accounts: 3 } });

    expect(report.modules).toHaveLength(4);
    for (const m of report.modules) {
      expect(m.success, `${m.name} should succeed: ${m.note}`).toBe(true);
      expect(m.extractedUsd).toBeGreaterThan(0);
    }

    expect(report.totalExtractedUsd).toBe(sumExtraction(report.modules));
    expect(report.totalExtractedUsd).toBeGreaterThan(300000);
    expect(report.totalExtractedUsd).toBeLessThan(500000);
    expect(report.durationSec).toBeGreaterThan(0);
  }, 120_000);
});

import type { ScanReport } from "./types";

export interface PricingParams {
  annualProbability: number; // baseline chance a live exploit lands within a year
  loadFactor: number; // insurer margin over expected loss
}

// v0 assumptions, surfaced so the model is inspectable, not a black box.
// roadmap: learn annualProbability from historical exploit data as scans accrue.
export const DEFAULT_PRICING: PricingParams = {
  annualProbability: 0.15,
  loadFactor: 1.4
};

export interface PremiumQuote {
  extractionUsd: number;
  successfulClasses: number;
  riskMultiplier: number;
  expectedLossUsd: number;
  annualPremiumUsd: number;
  params: PricingParams;
  breakdown: string;
}

// more independent ways to break the target means more premium
export function riskMultiplier(report: ScanReport): number {
  const classes = report.modules.filter((m) => m.success).length;
  return Math.round((1 + 0.2 * classes) * 100) / 100;
}

export function priceCover(report: ScanReport, params: PricingParams = DEFAULT_PRICING): PremiumQuote {
  const classes = report.modules.filter((m) => m.success).length;
  const mult = riskMultiplier(report);
  const expectedLoss = report.totalExtractedUsd * params.annualProbability;
  const premium = Math.round(expectedLoss * params.loadFactor * mult * 100) / 100;

  return {
    extractionUsd: report.totalExtractedUsd,
    successfulClasses: classes,
    riskMultiplier: mult,
    expectedLossUsd: Math.round(expectedLoss * 100) / 100,
    annualPremiumUsd: premium,
    params,
    breakdown:
      `premium = extraction(${report.totalExtractedUsd}) ` +
      `* P(${params.annualProbability}) * load(${params.loadFactor}) * risk(${mult})`
  };
}

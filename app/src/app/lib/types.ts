export interface ModuleResult {
  name: string;
  success: boolean;
  extractedUsd: number;
  note?: string;
}

export interface ScanReport {
  target: string;
  chain: string;
  totalExtractedUsd: number;
  durationSec: number;
  modules: ModuleResult[];
}

export interface PremiumQuote {
  extractionUsd: number;
  successfulClasses: number;
  riskMultiplier: number;
  annualPremiumUsd: number;
}

export interface ScanResponse {
  report: ScanReport;
  quote: PremiumQuote;
}

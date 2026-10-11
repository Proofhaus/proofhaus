import type { ScanResponse } from "./types";

// captured from real engine runs of the built-in sample suite, served when the
// host cannot run anvil (for example a serverless deploy)
export const RECORDED: Record<"vulnerable" | "hardened", ScanResponse> = {
  "vulnerable": {
    "report": {
      "target": "sample-suite",
      "chain": "tempo",
      "totalExtractedUsd": 359727.44,
      "durationSec": 1.1,
      "modules": [
        {
          "name": "sandwich",
          "success": true,
          "extractedUsd": 9352.62,
          "note": "sandwiched an unprotected victim swap on the target pool"
        },
        {
          "name": "oracle-manipulation",
          "success": true,
          "extractedUsd": 5374.82,
          "note": "pumped spot price, over-borrowed against inflated collateral, drained the reserve"
        },
        {
          "name": "share-inflation",
          "success": true,
          "extractedUsd": 100000,
          "note": "first-depositor rounding: victim shares floored to zero, deposit captured"
        },
        {
          "name": "reentrancy",
          "success": true,
          "extractedUsd": 245000,
          "note": "reentered withdraw before the balance update, drained pooled deposits"
        }
      ]
    },
    "quote": {
      "extractionUsd": 359727.44,
      "successfulClasses": 4,
      "riskMultiplier": 1.8,
      "annualPremiumUsd": 135976.97
    }
  },
  "hardened": {
    "report": {
      "target": "sample-suite-hardened",
      "chain": "tempo",
      "totalExtractedUsd": 0,
      "durationSec": 1.1,
      "modules": [
        {
          "name": "sandwich",
          "success": false,
          "extractedUsd": 0,
          "note": "blocked by target protection"
        },
        {
          "name": "oracle-manipulation",
          "success": false,
          "extractedUsd": 0,
          "note": "pumped spot price, over-borrowed against inflated collateral, drained the reserve"
        },
        {
          "name": "share-inflation",
          "success": false,
          "extractedUsd": 0,
          "note": "first-depositor rounding: victim shares floored to zero, deposit captured"
        },
        {
          "name": "reentrancy",
          "success": false,
          "extractedUsd": 0,
          "note": "blocked by target protection"
        }
      ]
    },
    "quote": {
      "extractionUsd": 0,
      "successfulClasses": 0,
      "riskMultiplier": 1,
      "annualPremiumUsd": 0
    }
  }
};

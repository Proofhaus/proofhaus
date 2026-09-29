import { describe, it, expect, afterAll } from "vitest";
import { ForkRunner } from "../src/fork";
import { deployAttestation, writeAttestation, usdToCents } from "../src/attest";
import { priceCover } from "../src/pricing";
import { read } from "../src/evm";
import type { ScanReport } from "../src/types";

interface OnChainReport {
  extractionCents: bigint;
  premiumCents: bigint;
  classes: number;
  timestamp: bigint;
  commit: `0x${string}`;
  exists: boolean;
}

describe("writeAttestation", () => {
  const fork = new ForkRunner({ port: 8608, accounts: 3 });

  afterAll(async () => {
    await fork.stop();
  });

  it("records the scan on-chain in cents", async () => {
    await fork.start();
    const w = fork.wallet(0);
    const attestation = await deployAttestation(w, w.account.address);

    const report: ScanReport = {
      target: "sample",
      chain: "tempo",
      totalExtractedUsd: 359727.44,
      durationSec: 1,
      modules: [
        { name: "a", success: true, extractedUsd: 100000 },
        { name: "b", success: true, extractedUsd: 259727.44 },
        { name: "c", success: false, extractedUsd: 0 }
      ]
    };
    const quote = priceCover(report);
    const target = fork.wallet(1).account.address;

    await writeAttestation(w, attestation, target, report, quote, "deadbeef");

    const onchain = await read<OnChainReport>(
      fork,
      attestation,
      "Attestation.sol",
      "Attestation",
      "latest",
      [target]
    );
    expect(onchain.extractionCents).toBe(usdToCents(359727.44));
    expect(onchain.premiumCents).toBe(usdToCents(quote.annualPremiumUsd));
    expect(onchain.classes).toBe(2);
    expect(onchain.exists).toBe(true);
  }, 60_000);
});

import { stringToHex, type Address, type Hex } from "viem";
import type { ScanReport } from "./types";
import type { PremiumQuote } from "./pricing";
import { deploy, send, type Wallet } from "./evm";

const ATT = "Attestation.sol";
const ATTN = "Attestation";

export function usdToCents(usd: number): bigint {
  return BigInt(Math.round(usd * 100));
}

// git commit -> bytes32, truncated to 32 chars and right-padded
export function commitToBytes32(commit: string): Hex {
  return stringToHex(commit.slice(0, 32), { size: 32 });
}

export async function deployAttestation(w: Wallet, attestor: Address): Promise<Address> {
  return deploy(w, ATT, ATTN, [attestor]);
}

// record a scan result on-chain from the authorized attestor key
export async function writeAttestation(
  attestor: Wallet,
  attestation: Address,
  target: Address,
  report: ScanReport,
  quote: PremiumQuote,
  commit = ""
): Promise<void> {
  const classes = report.modules.filter((m) => m.success).length;
  await send(attestor, attestation, ATT, ATTN, "attest", [
    target,
    usdToCents(report.totalExtractedUsd),
    usdToCents(quote.annualPremiumUsd),
    classes,
    commitToBytes32(commit)
  ]);
}

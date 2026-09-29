export interface Deployment {
  label: string;
  chainId: number;
  rpcUrl: string;
  currency: `0x${string}`;
  attestation: `0x${string}`;
  coverPool: `0x${string}`;
}

const ZERO = "0x0000000000000000000000000000000000000000" as const;

// fill these in from the `forge script Deploy` output on each testnet
export const deployments: Record<string, Deployment> = {
  tempo: {
    label: "Tempo testnet",
    chainId: 0,
    rpcUrl: process.env.NEXT_PUBLIC_TEMPO_RPC ?? "",
    currency: ZERO,
    attestation: ZERO,
    coverPool: ZERO
  },
  base: {
    label: "Base Sepolia",
    chainId: 84532,
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC ?? "https://sepolia.base.org",
    currency: ZERO,
    attestation: ZERO,
    coverPool: ZERO
  },
  robinhood: {
    label: "Robinhood testnet",
    chainId: 0,
    rpcUrl: process.env.NEXT_PUBLIC_ROBINHOOD_RPC ?? "",
    currency: ZERO,
    attestation: ZERO,
    coverPool: ZERO
  }
};

export const isDeployed = (d: Deployment): boolean => d.coverPool !== ZERO;

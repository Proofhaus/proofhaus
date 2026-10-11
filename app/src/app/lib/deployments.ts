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
    label: "Tempo testnet (Moderato)",
    chainId: 42431,
    rpcUrl: process.env.NEXT_PUBLIC_TEMPO_RPC ?? "https://rpc.moderato.tempo.xyz",
    currency: "0x3D30B84664E33CE51015a6B310544F45d63aA5D3",
    attestation: "0xfa820CB11e871eB05334d0f9567F7804c68CdB98",
    coverPool: "0xa46c8271C5344a21932ebea331DD8086189986DF"
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
    label: "Robinhood Chain testnet",
    chainId: 46630,
    rpcUrl: process.env.NEXT_PUBLIC_ROBINHOOD_RPC ?? "https://rpc.testnet.chain.robinhood.com",
    currency: ZERO,
    attestation: ZERO,
    coverPool: ZERO
  }
};

export const isDeployed = (d: Deployment): boolean => d.coverPool !== ZERO;

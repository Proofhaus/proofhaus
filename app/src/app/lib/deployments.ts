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
    currency: "0xfa820CB11e871eB05334d0f9567F7804c68CdB98",
    attestation: "0xa46c8271C5344a21932ebea331DD8086189986DF",
    coverPool: "0x1Dde2ad21ecf074B3539788C80D6F5caE3F23869"
  },
  robinhood: {
    label: "Robinhood Chain testnet",
    chainId: 46630,
    rpcUrl: process.env.NEXT_PUBLIC_ROBINHOOD_RPC ?? "https://rpc.testnet.chain.robinhood.com",
    currency: "0x2c12788fA1187fb46097A8BCA84d9DDa7f98f5e1",
    attestation: "0x8DAf1d94dB0A8e29d487cb8c458178eF080960fA",
    coverPool: "0x31E3F15ec535Ab2ea8E2475E8939b2B7c4775d01"
  }
};

export const isDeployed = (d: Deployment): boolean => d.coverPool !== ZERO;

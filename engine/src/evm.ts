import { formatEther, type Address } from "viem";
import type { ForkRunner } from "./fork";
import { loadArtifact } from "./artifacts";

export type Wallet = ReturnType<ForkRunner["wallet"]>;

export async function deploy(
  w: Wallet,
  sourceFile: string,
  name: string,
  args: unknown[]
): Promise<Address> {
  const { abi, bytecode } = loadArtifact(sourceFile, name);
  const hash = await w.deployContract({ abi, bytecode, args } as never);
  const receipt = await w.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error(`deploy of ${name} produced no address`);
  return receipt.contractAddress;
}

export async function send(
  w: Wallet,
  address: Address,
  sourceFile: string,
  name: string,
  fn: string,
  args: unknown[]
): Promise<void> {
  const { abi } = loadArtifact(sourceFile, name);
  const hash = await w.writeContract({ address, abi, functionName: fn, args } as never);
  await w.waitForTransactionReceipt({ hash });
}

export async function read<T>(
  fork: ForkRunner,
  address: Address,
  sourceFile: string,
  name: string,
  fn: string,
  args: unknown[]
): Promise<T> {
  const { abi } = loadArtifact(sourceFile, name);
  return (await fork.publicClient.readContract({ address, abi, functionName: fn, args })) as T;
}

// sample tokens are 18-decimal, ~$1 stablecoins, so wei maps to usd via formatEther
export function toUsd(wei: bigint): number {
  return Math.round(Number(formatEther(wei)) * 100) / 100;
}

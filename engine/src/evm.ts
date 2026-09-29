import { formatEther, type Abi, type Address } from "viem";
import type { ForkRunner } from "./fork";
import { loadArtifact, type Artifact } from "./artifacts";

export type Wallet = ReturnType<ForkRunner["wallet"]>;

export async function deployArtifact(w: Wallet, art: Artifact, args: unknown[]): Promise<Address> {
  const hash = await w.deployContract({ abi: art.abi, bytecode: art.bytecode, args } as never);
  const receipt = await w.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("deploy produced no address");
  return receipt.contractAddress;
}

export async function deploy(w: Wallet, sourceFile: string, name: string, args: unknown[]): Promise<Address> {
  return deployArtifact(w, loadArtifact(sourceFile, name), args);
}

export async function sendAbi(
  w: Wallet,
  address: Address,
  abi: Abi,
  fn: string,
  args: unknown[],
  value?: bigint
): Promise<void> {
  const params =
    value !== undefined
      ? { address, abi, functionName: fn, args, value }
      : { address, abi, functionName: fn, args };
  const hash = await w.writeContract(params as never);
  await w.waitForTransactionReceipt({ hash });
}

export async function send(
  w: Wallet,
  address: Address,
  sourceFile: string,
  name: string,
  fn: string,
  args: unknown[],
  value?: bigint
): Promise<void> {
  return sendAbi(w, address, loadArtifact(sourceFile, name).abi, fn, args, value);
}

export async function readAbi<T>(
  fork: ForkRunner,
  address: Address,
  abi: Abi,
  fn: string,
  args: unknown[]
): Promise<T> {
  return (await fork.publicClient.readContract({ address, abi, functionName: fn, args })) as T;
}

export async function read<T>(
  fork: ForkRunner,
  address: Address,
  sourceFile: string,
  name: string,
  fn: string,
  args: unknown[]
): Promise<T> {
  return readAbi<T>(fork, address, loadArtifact(sourceFile, name).abi, fn, args);
}

export function toUsd(wei: bigint): number {
  return Math.round(Number(formatEther(wei)) * 100) / 100;
}

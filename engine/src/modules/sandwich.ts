import { parseEther, maxUint256 } from "viem";
import type { AttackModule, ModuleResult, RunOptions } from "../types";
import type { ForkRunner } from "../fork";
import { deploy, deployArtifact, send, sendAbi, read, toUsd } from "../evm";
import { loadArtifact, type Artifact } from "../artifacts";

const M20 = "MockERC20.sol";
const M20N = "MockERC20";
const SW = "SandwichAttack.sol";
const SWN = "SandwichAttack";

export const sandwichModule: AttackModule = {
  name: "sandwich",
  async run(fork: ForkRunner, opts?: RunOptions): Promise<ModuleResult> {
    const hardened = opts?.hardened ?? false;
    const byoAmm = opts?.target?.kind === "amm" ? opts.target.artifact : undefined;
    const ammArtifact: Artifact =
      byoAmm ??
      loadArtifact(hardened ? "HardenedAMM.sol" : "VulnerableAMM.sol", hardened ? "HardenedAMM" : "VulnerableAMM");
    const aAbi = ammArtifact.abi;

    const deployer = fork.wallet(0);
    const victim = fork.wallet(2);
    const d = deployer.account.address;
    const v = victim.account.address;

    const usdc = await deploy(deployer, M20, M20N, ["USDC", "USDC"]);
    const dai = await deploy(deployer, M20, M20N, ["DAI", "DAI"]);
    const pool = await deployArtifact(deployer, ammArtifact, [usdc, dai]);

    await send(deployer, usdc, M20, M20N, "mint", [d, parseEther("2000000")]);
    await send(deployer, dai, M20, M20N, "mint", [d, parseEther("2000000")]);
    await send(deployer, usdc, M20, M20N, "approve", [pool, maxUint256]);
    await send(deployer, dai, M20, M20N, "approve", [pool, maxUint256]);
    await sendAbi(deployer, pool, aAbi, "addLiquidity", [parseEther("1000000"), parseEther("1000000")]);

    const atk = await deploy(deployer, SW, SWN, [pool, usdc, dai]);
    const capital = parseEther("100000");
    await send(deployer, usdc, M20, M20N, "mint", [atk, capital]);
    const before = await read<bigint>(fork, usdc, M20, M20N, "balanceOf", [atk]);

    try {
      await send(deployer, atk, SW, SWN, "frontRun", [parseEther("50000")]);
      await send(victim, usdc, M20, M20N, "mint", [v, parseEther("100000")]);
      await send(victim, usdc, M20, M20N, "approve", [pool, maxUint256]);
      await sendAbi(victim, pool, aAbi, "swap", [usdc, parseEther("100000"), v]);
      await send(deployer, atk, SW, SWN, "backRun", []);

      const after = await read<bigint>(fork, usdc, M20, M20N, "balanceOf", [atk]);
      const profit = after > before ? after - before : 0n;
      return {
        name: "sandwich",
        success: profit > 0n,
        extractedUsd: toUsd(profit),
        note: byoAmm
          ? "sandwiched a swap on the provided pool"
          : "sandwiched an unprotected victim swap on the target pool"
      };
    } catch {
      return { name: "sandwich", success: false, extractedUsd: 0, note: "blocked by target protection" };
    }
  }
};

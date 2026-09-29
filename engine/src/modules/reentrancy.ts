import { parseEther, formatEther } from "viem";
import type { AttackModule, ModuleResult } from "../types";
import type { ForkRunner } from "../fork";
import { deploy, send } from "../evm";

const BANK = "ReentrantBank.sol";
const BANKN = "ReentrantBank";
const RE = "ReentrancyAttack.sol";
const REN = "ReentrancyAttack";
const ETH_USD = 2450; // documented price assumption for native-eth extraction

export const reentrancyModule: AttackModule = {
  name: "reentrancy",
  async run(fork: ForkRunner): Promise<ModuleResult> {
    const deployer = fork.wallet(0);
    const attacker = fork.wallet(1);
    const victim = fork.wallet(2);

    const bank = await deploy(deployer, BANK, BANKN, []);
    const atk = await deploy(attacker, RE, REN, [bank]);

    // victim funds pooled in the bank
    await send(victim, bank, BANK, BANKN, "deposit", [], parseEther("100"));
    const bankBefore = await fork.publicClient.getBalance({ address: bank });

    // attacker drains via reentrancy with a small unit deposit
    await send(attacker, atk, RE, REN, "attack", [], parseEther("10"));
    const bankAfter = await fork.publicClient.getBalance({ address: bank });

    const drained = bankBefore > bankAfter ? bankBefore - bankAfter : 0n;
    const usd = Math.round(Number(formatEther(drained)) * ETH_USD * 100) / 100;

    return {
      name: "reentrancy",
      success: drained > 0n,
      extractedUsd: usd,
      note: "reentered withdraw before the balance update, drained pooled deposits"
    };
  }
};

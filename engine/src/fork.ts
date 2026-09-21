import { execa } from "execa";
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
  publicActions,
  type Address,
  type Hex
} from "viem";
import { anvil as anvilChain } from "viem/chains";
import { mnemonicToAccount } from "viem/accounts";

// anvil's default dev mnemonic, so derived accounts match the funded ones
const ANVIL_MNEMONIC = "test test test test test test test test test test test junk";

export interface ForkOptions {
  forkUrl?: string; // fork a live chain when set, else a fresh local chain
  port?: number;
  accounts?: number;
  balanceEth?: number;
}

function makePublic(rpcUrl: string) {
  return createPublicClient({ chain: anvilChain, transport: http(rpcUrl) });
}

function makeTest(rpcUrl: string) {
  return createTestClient({ chain: anvilChain, mode: "anvil", transport: http(rpcUrl) });
}

// boots an anvil instance and exposes snapshot/revert so each attack runs
// against clean state
export class ForkRunner {
  private proc: ReturnType<typeof execa> | undefined;
  private readonly opts: ForkOptions;

  readonly port: number;
  readonly rpcUrl: string;
  accounts: Address[] = [];

  publicClient!: ReturnType<typeof makePublic>;
  testClient!: ReturnType<typeof makeTest>;

  constructor(opts: ForkOptions = {}) {
    this.opts = opts;
    this.port = opts.port ?? 8545;
    this.rpcUrl = `http://127.0.0.1:${this.port}`;
  }

  async start(): Promise<void> {
    const n = this.opts.accounts ?? 10;
    const args = [
      "--port",
      String(this.port),
      "--accounts",
      String(n),
      "--balance",
      String(this.opts.balanceEth ?? 10_000),
      "--silent"
    ];
    if (this.opts.forkUrl) args.push("--fork-url", this.opts.forkUrl);

    this.proc = execa("anvil", args, { stdout: "ignore", stderr: "ignore" });
    this.publicClient = makePublic(this.rpcUrl);
    this.testClient = makeTest(this.rpcUrl);

    await this.waitReady();

    for (let i = 0; i < n; i++) {
      this.accounts.push(mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: i }).address);
    }
  }

  private async waitReady(timeoutMs = 15_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        await this.publicClient.getBlockNumber();
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    throw new Error(`anvil not ready on ${this.rpcUrl} within ${timeoutMs}ms`);
  }

  // wallet client for anvil account `index`, extended with read actions
  wallet(index: number) {
    const account = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: index });
    return createWalletClient({ account, chain: anvilChain, transport: http(this.rpcUrl) }).extend(
      publicActions
    );
  }

  async snapshot(): Promise<Hex> {
    return this.testClient.snapshot();
  }

  async revert(id: Hex): Promise<void> {
    await this.testClient.revert({ id });
  }

  async stop(): Promise<void> {
    this.proc?.kill("SIGTERM");
    try {
      await this.proc;
    } catch {
      // a killed subprocess rejects; that is expected
    }
    this.proc = undefined;
  }
}

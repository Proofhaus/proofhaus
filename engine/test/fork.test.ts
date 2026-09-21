import { describe, it, expect, afterAll } from "vitest";
import { ForkRunner } from "../src/fork";

describe("ForkRunner", () => {
  const fork = new ForkRunner({ port: 8599, accounts: 3 });

  afterAll(async () => {
    await fork.stop();
  });

  it("boots, snapshots, and reverts state", async () => {
    await fork.start();
    const addr = fork.accounts[1];

    const before = await fork.publicClient.getBalance({ address: addr });
    const snap = await fork.snapshot();

    await fork.testClient.setBalance({ address: addr, value: 12345n });
    expect(await fork.publicClient.getBalance({ address: addr })).toBe(12345n);

    await fork.revert(snap);
    expect(await fork.publicClient.getBalance({ address: addr })).toBe(before);
  }, 30_000);
});

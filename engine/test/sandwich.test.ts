import { describe, it, expect, afterAll } from "vitest";
import { ForkRunner } from "../src/fork";
import { sandwichModule } from "../src/modules/sandwich";

describe("sandwichModule", () => {
  const fork = new ForkRunner({ port: 8601, accounts: 3 });

  afterAll(async () => {
    await fork.stop();
  });

  it("extracts a positive dollar amount from an unprotected pool", async () => {
    await fork.start();
    const snap = await fork.snapshot();
    const res = await sandwichModule.run(fork);
    await fork.revert(snap);

    expect(res.name).toBe("sandwich");
    expect(res.success).toBe(true);
    expect(res.extractedUsd).toBeGreaterThan(0);
    // sanity bounds: a 50k front-run on a 1M pool nets thousands, not millions
    expect(res.extractedUsd).toBeGreaterThan(1000);
    expect(res.extractedUsd).toBeLessThan(50000);
  }, 60_000);
});

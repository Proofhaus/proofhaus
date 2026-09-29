# Proofhaus

**Economic security you run on every deploy.**

Proofhaus forks your protocol into a sandbox, actually attacks it, and reports the
dollars an attacker could extract. Run it locally, gate it in CI, and price cover
against the same number. Auditors read your code and nod. Proofhaus robs you in a
sandbox, tells you it was a real figure, and prices insurance on it.

## What it does

1. Forks a chain into a local sandbox (anvil), one snapshot per attack.
2. Runs a library of economic exploits against the target.
3. Reports a dollar extraction figure, not a severity label.
4. Prices annual cover from that figure and records it on-chain.
5. Exits non-zero over a budget, so it gates a deploy like a test.

## How it works

```
 target ->  fork chain  ->  run attacks  ->  $ extraction  ->  premium
            (anvil)         (4 classes)      (report)          + on-chain
                                                                attestation
                                                                + cover pool
```

- `contracts/` Foundry: attack modules, sample + hardened targets, Attestation, CoverPool
- `engine/` TypeScript: fork runner, attack modules, pricing, attestation writer, CLI, badge
- `app/` Next.js dashboard: live scan, extraction counter, report cards, hardening history, cover market

## The numbers (built-in sample suite)

| Attack class         | Extractable |
|----------------------|-------------|
| sandwich             | $9,352.62   |
| oracle manipulation  | $5,374.82   |
| share inflation      | $100,000.00 |
| reentrancy           | $245,000.00 |
| **total**            | **$359,727.44** |

Full scan runs in about one second. Annual premium on that target: **$135,976.97**
(risk multiplier x1.8). Re-scan the hardened variants and the total, and the
premium, collapse to zero.

## Quickstart

```bash
# contracts
cd contracts && forge test

# engine + scan
pnpm install
cd contracts && forge build           # produce artifacts the engine reads
pnpm -C engine test
pnpm -C engine scan -- --max 0         # exits non-zero: the sample is vulnerable
pnpm -C engine scan -- --hardened --max 0   # exits zero: hardened is clean

# dashboard
pnpm -C app dev                        # http://localhost:3000
```

## CI gate

`.github/workflows/ci.yml` builds contracts, runs both test suites, and proves the
gate both ways on every push and PR. Point the gate at your own target with a
budget:

```yaml
- run: pnpm -C engine scan -- --max 50000
```

The engine also produces a shields-style badge (endpoint JSON and SVG) so a
`$0 extractable` badge can be pinned to a README.

## On-chain market

```bash
cd contracts
cp .env.example .env    # PRIVATE_KEY + testnet RPC urls
forge script script/Deploy.s.sol:Deploy --rpc-url tempo --broadcast --private-key $PRIVATE_KEY
# repeat for base_sepolia and robinhood, then paste addresses into app/src/app/lib/deployments.ts
```

## What is real today, and what is next

Real and working: the fork-and-attack engine, four attack classes producing real
extraction figures, the pricing model, the on-chain Attestation and CoverPool, the
CLI gate, the CI pipeline, and the dashboard. The engine runs against representative
built-in targets.

Next: generalized target intake, pointing Proofhaus at your own compiled artifact or
a deployed address and matching the attack library to it. The hard part, turning an
exploit into a priced number, already works.

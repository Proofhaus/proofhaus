import Link from "next/link";
import "./landing.css";
import { HeroTerminal } from "./components/HeroTerminal";
import { Logo } from "./components/Logo";
import { OnchainState } from "./components/OnchainState";
import { ScanFlow } from "./components/ScanFlow";

const REPO = "https://github.com/Proofhaus/proofhaus";

const ROWS = [
  { name: "sandwich", vuln: "$9,352.62", fix: "swap size capped against reserves" },
  { name: "oracle manipulation", vuln: "$5,374.82", fix: "collateral priced off a fixed reference" },
  { name: "share inflation", vuln: "$100,000.00", fix: "virtual shares in the vault math" },
  { name: "reentrancy", vuln: "$245,000.00", fix: "balance cleared before the external call" }
];

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-nav-in">
          <Link href="/" className="lp-brand">
            <Logo height={30} />
          </Link>
          <nav className="lp-links" aria-label="sections">
            <a href="#how">how it works</a>
            <a href="#numbers">numbers</a>
            <a href="#ci">ci gate</a>
            <a href="#byo">your contract</a>
            <a href={REPO} target="_blank" rel="noreferrer">github</a>
          </nav>
          <Link href="/try" className="lp-btn sm">TRY IT</Link>
        </div>
      </header>

      <main>
        <section className="lp-hero lp-wrap">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow">economic security you run on every deploy</p>
            <h1>
              <span className="lp-l1">Auditors give you a label.</span>
              <em>We give you the number.</em>
            </h1>
            <p className="lp-sub">
              Proofhaus forks your protocol into a sandbox, runs real economic exploits against it, and
              reports the dollars an attacker could extract. In about a second, as a gate you run on
              every commit.
            </p>
            <div className="lp-cta">
              <Link href="/try" className="lp-btn">
                TRY IT <span aria-hidden>→</span>
              </Link>
              <a className="lp-btn ghost" href={REPO} target="_blank" rel="noreferrer">
                VIEW SOURCE
              </a>
            </div>
            <p className="lp-fine">Drop in a compiled contract and watch it get attacked. No signup.</p>
          </div>
          <HeroTerminal />
        </section>

        <section className="lp-wrap">
          <div className="lp-stats">
            <div><b>4</b><span>attack classes</span></div>
            <div><b>~1s</b><span>per full scan</span></div>
            <div><b>40</b><span>passing tests</span></div>
            <div><b>3</b><span>testnets deployed</span></div>
          </div>
        </section>

        <section className="lp-sec" id="problem">
          <div className="lp-wrap">
            <p className="lp-label"><b>01</b> / the problem</p>
            <h2 className="lp-h2">A severity label does not tell you what a hole costs.</h2>
            <p className="lp-p">
              Audits and scanners hand you a rating. Nobody can answer the question a treasury, an
              underwriter or a founder actually asks: how much can an attacker take? Proofhaus answers it
              by running the attack.
            </p>
            <div className="lp-vs">
              <div className="lp-card lp-old">
                <div className="lp-card-h">an audit says</div>
                <pre>{`SEVERITY   HIGH
FINDING    reentrancy risk in withdraw()
IMPACT     "could lead to loss of funds"
COST       unknown`}</pre>
              </div>
              <div className="lp-card lp-new">
                <div className="lp-card-h">proofhaus says</div>
                <pre>{`EXPLOITED  reentrancy         $245,000.00
EXPLOITED  share inflation    $100,000.00
EXPLOITED  sandwich             $9,352.62
EXPLOITED  oracle manipulation  $5,374.82
-----------------------------------------
EXTRACTABLE                   $359,727.44`}</pre>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="how">
          <div className="lp-wrap">
            <p className="lp-label"><b>02</b> / how it works</p>
            <h2 className="lp-h2">Fork it. Attack it. Measure it. Price it.</h2>
            <ScanFlow />
          </div>
        </section>

        <section className="lp-sec" id="numbers">
          <div className="lp-wrap">
            <p className="lp-label"><b>03</b> / the numbers</p>
            <h2 className="lp-h2">Same contracts. Patch them and the number goes to zero.</h2>
            <p className="lp-p">
              Figures below come from the real engine running the built-in sample suite. Each sample has a
              hardened twin with one targeted fix.
            </p>
            <div className="lp-table" role="table" aria-label="vulnerable versus hardened extraction">
              <div className="lp-tr lp-th" role="row">
                <span>attack</span>
                <span>vulnerable</span>
                <span>hardened</span>
                <span>the fix</span>
              </div>
              {ROWS.map((r) => (
                <div className="lp-tr" role="row" key={r.name}>
                  <span>{r.name}</span>
                  <span className="red">{r.vuln}</span>
                  <span className="grn">$0.00</span>
                  <span className="dim">{r.fix}</span>
                </div>
              ))}
              <div className="lp-tr lp-total" role="row">
                <span>extractable</span>
                <span className="red">$359,727.44</span>
                <span className="grn">$0.00</span>
                <span className="dim" />
              </div>
              <div className="lp-tr lp-total" role="row">
                <span>annual premium</span>
                <span className="red">$135,976.97</span>
                <span className="grn">$0.00</span>
                <span className="dim">risk multiplier x1.8 vs x1.0</span>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="ci">
          <div className="lp-wrap">
            <p className="lp-label"><b>04</b> / the ci gate</p>
            <h2 className="lp-h2">Security that runs like a test.</h2>
            <p className="lp-p">
              A scan takes about a second, so it fits in the pipeline. Set a budget. If the extractable
              figure goes over it, the build fails.
            </p>
            <div className="lp-two">
              <pre className="lp-code">{`$ proofhaus scan --max 50000

  EXPLOITED  reentrancy        $245,000.00
  EXPLOITED  share inflation   $100,000.00
  extractable                  $359,727.44

FAIL  extractable $359,727.44 exceeds max $50,000.00
exit 1`}</pre>
              <pre className="lp-code">{`# .github/workflows/ci.yml
- name: Economic security gate
  run: pnpm -C engine scan -- --max 50000

# patch the hole, push, and the gate goes green
PASS  extractable within max $50,000.00
exit 0`}</pre>
            </div>
            <div className="lp-badges">
              <span className="lp-badge"><i>proofhaus</i><u className="r">$360k extractable</u></span>
              <span className="lp-badge"><i>proofhaus</i><u className="g">$0 extractable</u></span>
              <span className="dim">a badge for your README, red until you fix it</span>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="cover">
          <div className="lp-wrap">
            <p className="lp-label"><b>05</b> / the cover market</p>
            <h2 className="lp-h2">The number is also the price.</h2>
            <p className="lp-p">
              Cover priced by governance vote is thin and often wrong. Proofhaus prices it off a measured
              attack, so hardening your code lowers your premium.
            </p>
            <div className="lp-flow">
              <div><b>SCAN</b><span>the engine measures what an attacker could take</span></div>
              <i aria-hidden>→</i>
              <div><b>ATTEST</b><span>the engine can write the result and premium to an Attestation contract</span></div>
              <i aria-hidden>→</i>
              <div><b>COVER</b><span>LPs fund a CoverPool, protocols buy a policy, a guardian triggers payout</span></div>
            </div>
            <p className="lp-fine">
              Attestation and CoverPool are written in Solidity with 16 Foundry tests and deployed to the
              Tempo, Base Sepolia and Robinhood Chain testnets. Payout is guardian-triggered in this
              version. The hosted scanner does not write attestations yet.
            </p>
            <OnchainState />
          </div>
        </section>

        <section className="lp-sec" id="byo">
          <div className="lp-wrap">
            <p className="lp-label"><b>06</b> / your contract</p>
            <h2 className="lp-h2">Drop in a contract. It works out what it is.</h2>
            <p className="lp-p">
              Upload a compiled Foundry artifact. Proofhaus reads the ABI, recognizes the shape, deploys
              it into the sandbox and runs the matching attacks. If it does not recognize the shape, it
              says so instead of guessing.
            </p>
            <div className="lp-table lp-shapes" role="table" aria-label="supported contract shapes">
              <div className="lp-tr lp-th" role="row">
                <span>shape</span>
                <span>detected by</span>
                <span>attacks run</span>
              </div>
              <div className="lp-tr" role="row">
                <span>AMM</span>
                <span className="dim">swap, getReserves</span>
                <span>sandwich, oracle manipulation</span>
              </div>
              <div className="lp-tr" role="row">
                <span>ERC4626 vault</span>
                <span className="dim">deposit, redeem</span>
                <span>share inflation</span>
              </div>
              <div className="lp-tr" role="row">
                <span>ETH bank</span>
                <span className="dim">deposit, withdraw</span>
                <span>reentrancy</span>
              </div>
            </div>
            <p className="lp-fine">
              Every security tool matches a library of known patterns. Ours executes them and returns a
              dollar figure. Each new attack class is one module.
            </p>
          </div>
        </section>

        <section className="lp-final">
          <div className="lp-wrap">
            <h2>Run the adversary on your protocol.</h2>
            <p>Find out what it would cost before an attacker does.</p>
            <Link href="/try" className="lp-btn big">
              TRY IT <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <span className="lp-foot-brand">
            <Logo height={22} />
            <span>economic security you run on every deploy</span>
          </span>
          <span>
            <a href={REPO} target="_blank" rel="noreferrer">github</a>
            <Link href="/try">try it</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

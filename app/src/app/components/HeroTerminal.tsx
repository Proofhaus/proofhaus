"use client";

import { useEffect, useState } from "react";
import { useTween } from "../lib/useTween";
import { usd, usd0 } from "../lib/format";

type Mode = "vuln" | "hard";

// figures from a real engine run against the built-in sample suite
const FINDINGS = [
  { name: "sandwich", usd: 9352.62 },
  { name: "oracle manipulation", usd: 5374.82 },
  { name: "share inflation", usd: 100000 },
  { name: "reentrancy", usd: 245000 }
];
const PREMIUM = 135976.97;
const STEP = 520;
const HOLD = 3800;

export function HeroTerminal() {
  const [mode, setMode] = useState<Mode>("vuln");
  const [shown, setShown] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      setShown(FINDINGS.length);
      return;
    }
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(setTimeout(() => alive && fn(), ms));
    };
    const cycle = (m: Mode) => {
      setMode(m);
      setShown(0);
      for (let i = 1; i <= FINDINGS.length; i++) later(() => setShown(i), 700 + STEP * i);
      later(() => cycle(m === "vuln" ? "hard" : "vuln"), 700 + STEP * FINDINGS.length + HOLD);
    };
    cycle("vuln");
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  const done = shown === FINDINGS.length;
  const vuln = mode === "vuln";
  const sum = FINDINGS.slice(0, shown).reduce((a, f) => a + f.usd, 0);
  const total = useTween(vuln ? sum : 0);
  const premium = useTween(vuln && done ? PREMIUM : 0);

  return (
    <div className="lp-term" aria-label="live preview of a proofhaus scan">
      <div className="chrome">
        <span className="dot r" />
        <span className="dot y" />
        <span className="dot g" />
        <span className="title">proofhaus scan</span>
      </div>
      <div className="screen">
        <div className="prompt">
          <span className="user">$ </span>
          <span className="cmd">proofhaus scan --mode {vuln ? "vulnerable" : "hardened"}</span>
        </div>

        <div className="lp-lines">
          {FINDINGS.map((f, i) =>
            i < shown ? (
              <div key={mode + f.name} className={`ln ${vuln ? "hit" : "safe"}`}>
                <span className="glyph">{vuln ? "✕" : "✓"}</span>
                <span className="name">{f.name}</span>
                <span className="lead" />
                <span className="amt">{vuln ? usd0(f.usd) : "safe"}</span>
              </div>
            ) : (
              <div key={mode + f.name} className="ln lp-ghost">
                <span className="glyph">·</span>
                <span className="name">{f.name}</span>
              </div>
            )
          )}
        </div>

        <div className="lp-sum">
          <div>
            <div className="k">Extractable</div>
            <div className={`lp-big ${vuln ? "" : "zero"}`}>{usd(total)}</div>
          </div>
          <div className="lp-sum-side">
            <div className="k">Annual premium</div>
            <div className="lp-prem">{usd0(premium)}</div>
          </div>
        </div>

        <div className="lp-verdict">
          {done && (vuln ? <span className="chip fail">FAIL</span> : <span className="chip pass">PASS</span>)}
          <span className="msg">
            {done
              ? vuln
                ? "4 attack classes landed, deploy blocked"
                : "nothing extractable, cleared to ship"
              : still
                ? ""
                : "attacking..."}
          </span>
        </div>
      </div>
    </div>
  );
}

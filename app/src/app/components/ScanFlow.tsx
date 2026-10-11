import type { CSSProperties } from "react";

const NODES = [
  { k: "01", name: "YOUR CONTRACT", line: "a compiled artifact, or a built-in sample" },
  { k: "02", name: "SANDBOX", line: "a private chain where nothing is real" },
  { k: "03", name: "ATTACK", line: "sandwich, oracle, share inflation, reentrancy", hot: true },
  { k: "04", name: "MEASURE", line: "the attacker's balance change, in dollars" },
  { k: "05", name: "REPORT", line: "extractable dollars and a cover quote", out: "$359,727 on the vulnerable sample" }
];

export function ScanFlow() {
  return (
    <div className="flow" aria-label="Proofhaus pipeline: contract, sandbox, attack, measure, report">
      <ol className="flow-row">
        {NODES.map((n, i) => (
          <li key={n.k} className="flow-item">
            <div className={`fnode${n.hot ? " hot" : ""}${n.out ? " final" : ""}`} style={{ "--i": i } as CSSProperties}>
              <span className="fk">{n.k}</span>
              <b>{n.name}</b>
              <span className="fl">{n.line}</span>
              {n.out && <span className="fo">{n.out}</span>}
            </div>
            {i < NODES.length - 1 && (
              <span className="flink" style={{ "--i": i } as CSSProperties} aria-hidden>
                <span className="fill" />
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

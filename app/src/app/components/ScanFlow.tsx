import type { CSSProperties } from "react";

const NODES = [
  { k: "01", name: "YOUR CONTRACT", line: "a compiled artifact, or a built-in sample" },
  { k: "02", name: "SANDBOX", line: "boots an anvil chain and snapshots state, so every attack starts clean" },
  { k: "03", name: "ATTACK", line: "sandwich, oracle manipulation, share inflation, reentrancy", hot: true },
  { k: "04", name: "MEASURE", line: "reads the attacker's balance change. Real dollars, not an estimate" },
  { k: "05", name: "REPORT", line: "feeds a premium model, ready to record in an Attestation contract", out: "$359,727 on the vulnerable sample" }
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

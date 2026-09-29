"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScanResponse, ModuleResult } from "../lib/types";
import { usd, usd0 } from "../lib/format";
import { CoverMarket } from "./CoverMarket";

type Mode = "vulnerable" | "hardened";
type Phase = "idle" | "running" | "streaming" | "done" | "error";
interface Run {
  mode: Mode;
  total: number;
  premium: number;
  at: number;
}

const LABELS: Record<string, string> = {
  sandwich: "sandwich",
  "oracle-manipulation": "oracle manipulation",
  "share-inflation": "share inflation",
  reentrancy: "reentrancy"
};
const HISTORY_KEY = "proofhaus_history";

function severity(m: ModuleResult): { cls: string; label: string } {
  if (!m.success || m.extractedUsd === 0) return { cls: "safe", label: "safe" };
  if (m.extractedUsd >= 100000) return { cls: "critical", label: "critical" };
  if (m.extractedUsd >= 10000) return { cls: "high", label: "high" };
  return { cls: "medium", label: "medium" };
}

function useCountUp(target: number, run: boolean, ms = 1400): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return val;
}

export function Terminal() {
  const [mode, setMode] = useState<Mode>("vulnerable");
  const [phase, setPhase] = useState<Phase>("idle");
  const [data, setData] = useState<ScanResponse | null>(null);
  const [shown, setShown] = useState<ModuleResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Run[]>([]);
  const [scanId, setScanId] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      // storage unavailable; history stays in-memory only
    }
  }, []);

  const pushRun = useCallback((run: Run) => {
    setHistory((prev) => {
      const next = [...prev, run].slice(-8);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  const run = useCallback(async () => {
    clearTimers();
    setScanId((n) => n + 1);
    setPhase("running");
    setData(null);
    setShown([]);
    setError(null);
    try {
      const res = await fetch(`/api/scan?mode=${mode}`, { cache: "no-store" });
      const json = (await res.json()) as ScanResponse & { error?: string };
      if (json.error || !json.report) throw new Error(json.error ?? "scan failed");

      setData(json);
      setPhase("streaming");
      json.report.modules.forEach((m, i) => {
        const t = setTimeout(() => {
          setShown((prev) => [...prev, m]);
          if (i === json.report.modules.length - 1) {
            const done = setTimeout(() => {
              setPhase("done");
              pushRun({
                mode,
                total: json.report.totalExtractedUsd,
                premium: json.quote.annualPremiumUsd,
                at: Date.now()
              });
            }, 420);
            timers.current.push(done);
          }
        }, 460 * (i + 1));
        timers.current.push(t);
      });
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  }, [mode, pushRun]);

  const total = data?.report.totalExtractedUsd ?? 0;
  const counting = phase === "done";
  const animated = useCountUp(total, counting);
  const busy = phase === "running" || phase === "streaming";
  const hMax = Math.max(1, ...history.map((h) => h.total));

  return (
    <div className="wrap">
      <div className="chrome">
        <span className="dot r" />
        <span className="dot y" />
        <span className="dot g" />
        <span className="title">proofhaus — economic security you run on every deploy</span>
      </div>

      <div className="screen">
        <div className="prompt">
          <span className="user">proofhaus@{mode === "hardened" ? "hardened" : "tempo"}</span>
          <span>:</span>
          <span className="path">~/protocol</span>
          <span>$ </span>
          <span className="cmd">proofhaus scan --mode {mode}</span>
        </div>

        <div className="controls">
          <div className="seg" role="tablist" aria-label="target mode">
            <button data-on={mode === "vulnerable"} onClick={() => !busy && setMode("vulnerable")} disabled={busy}>
              VULNERABLE
            </button>
            <button data-on={mode === "hardened"} onClick={() => !busy && setMode("hardened")} disabled={busy}>
              HARDENED
            </button>
          </div>
          <button className="run" onClick={run} disabled={busy}>
            {busy ? "SCANNING…" : "RUN SCAN"}
          </button>
        </div>

        {phase !== "done" && (
          <div className="out">
            {phase === "running" && (
              <div className="ln">
                <span className="sys">forking chain, deploying targets…</span>
              </div>
            )}
            {shown.map((m) => (
              <div key={m.name} className={`ln ${m.success ? "hit" : "safe"}`}>
                <span className="glyph">{m.success ? "✕" : "✓"}</span>
                <span className="name">{LABELS[m.name] ?? m.name}</span>
                <span className="lead" />
                <span className="amt">{m.success ? usd0(m.extractedUsd) : "safe"}</span>
              </div>
            ))}
            {phase === "idle" && (
              <div className="ln">
                <span className="sys">ready. select a target and run the adversary.</span>
                <span className="cursor" />
              </div>
            )}
            {error && <div className="err">✕ {error}</div>}
          </div>
        )}

        {data && phase === "done" && (
          <>
            <div className="summary">
              <div className="metric">
                <div className="k">Extractable</div>
                <div className={`big ${total === 0 ? "zero" : ""}`}>{usd(animated)}</div>
              </div>
              <div className="side">
                <div className="k">Annual premium</div>
                <div className="premium">{usd0(data.quote.annualPremiumUsd)}</div>
                <div className="k" style={{ marginTop: 10 }}>Risk multiplier</div>
                <div className="premium">×{data.quote.riskMultiplier}</div>
              </div>
              <div className="verdict">
                {total > 0 ? (
                  <>
                    <span className="chip fail">FAIL</span>
                    <span className="msg">{data.quote.successfulClasses} attack classes landed · deploy blocked</span>
                  </>
                ) : (
                  <>
                    <span className="chip pass">PASS</span>
                    <span className="msg">no value extractable · cleared to ship</span>
                  </>
                )}
              </div>
            </div>

            <div className="cards">
              {data.report.modules.map((m) => {
                const s = severity(m);
                return (
                  <div key={m.name} className={`card ${m.success ? "hit" : "safe"}`}>
                    <div className="top">
                      <span className="cname">{LABELS[m.name] ?? m.name}</span>
                      <span className={`sev ${s.cls}`}>{s.label}</span>
                    </div>
                    <div className="camt">{m.success ? usd(m.extractedUsd) : "$0.00"}</div>
                    {m.note && <div className="cnote">{m.note}</div>}
                  </div>
                );
              })}
            </div>

            <CoverMarket
              key={scanId}
              coverageUsd={total}
              premiumUsd={data.quote.annualPremiumUsd}
              riskMultiplier={data.quote.riskMultiplier}
            />
          </>
        )}

        {history.length > 0 && (
          <div className="history">
            <div className="htitle">Hardening history</div>
            <div className="hrow">
              {history.map((h, i) => {
                const hit = h.total > 0;
                const height = hit ? Math.max(8, Math.round((h.total / hMax) * 64)) : 4;
                return (
                  <div className="hbar" key={h.at + "-" + i}>
                    <div className={`bar ${hit ? "hit" : "safe"}`} style={{ height }} />
                    <span className="hval">{h.total === 0 ? "$0" : usd0(h.total)}</span>
                    <span className="hlabel">{h.mode === "hardened" ? "HARD" : "VULN"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="tag">
        <b>proofhaus</b> forks your protocol, attacks it, and prices cover on what it took.
      </div>
    </div>
  );
}

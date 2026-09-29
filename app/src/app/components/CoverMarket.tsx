"use client";

import { useState } from "react";
import { usd0 } from "../lib/format";

interface Props {
  coverageUsd: number;
  premiumUsd: number;
  riskMultiplier: number;
}

const SEED = 500000;
const LP_STEP = 250000;

export function CoverMarket({ coverageUsd, premiumUsd, riskMultiplier }: Props) {
  const [capacity, setCapacity] = useState(SEED);
  const [covered, setCovered] = useState(0);
  const [premiums, setPremiums] = useState(0);
  const [payouts, setPayouts] = useState(0);
  const [policies, setPolicies] = useState(0);

  const poolAssets = capacity + premiums - payouts;
  const available = poolAssets - covered;
  const lpValue = poolAssets;
  const utilization = poolAssets > 0 ? Math.min(100, (covered / poolAssets) * 100) : 0;
  const insurable = coverageUsd > 0;

  const buy = () => {
    if (!insurable || available < coverageUsd) return;
    setCovered((c) => c + coverageUsd);
    setPremiums((p) => p + premiumUsd);
    setPolicies((n) => n + 1);
  };
  const payout = () => {
    if (policies <= 0) return;
    setPayouts((p) => p + coverageUsd);
    setCovered((c) => Math.max(0, c - coverageUsd));
    setPolicies((n) => n - 1);
  };

  return (
    <div className="market">
      <div className="htitle">Cover market</div>
      <div className="mgrid">
        <div className="mcol">
          <div className="mk">Annual premium</div>
          <div className="mv">{insurable ? usd0(premiumUsd) : "$0"}</div>
          <div className="formula">
            coverage {usd0(coverageUsd)} × P(0.15) × load(1.4) × risk(×{riskMultiplier})
          </div>
          <div className="mbtns">
            <button className="mbtn" onClick={buy} disabled={!insurable || available < coverageUsd}>
              BUY COVER · {usd0(coverageUsd)}
            </button>
            <button className="mbtn danger" onClick={payout} disabled={policies <= 0}>
              SIMULATE EXPLOIT
            </button>
          </div>
        </div>

        <div className="mcol">
          <div className="mk">LP pool value</div>
          <div className="mv green">{usd0(lpValue)}</div>
          <div className="meter" aria-label="utilization">
            <div className="fill" style={{ width: `${utilization}%` }} />
          </div>
          <div className="mrow">
            <span>capacity <span className="num">{usd0(poolAssets)}</span></span>
            <span>utilized <span className="num">{Math.round(utilization)}%</span></span>
          </div>
          <div className="mrow">
            <span>premiums in <span className="num">{usd0(premiums)}</span></span>
            <span>payouts <span className="num">{usd0(payouts)}</span></span>
          </div>
          <div className="mbtns">
            <button className="mbtn" onClick={() => setCapacity((c) => c + LP_STEP)}>
              DEPOSIT LP · {usd0(LP_STEP)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

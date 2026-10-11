"use client";

import { useEffect, useState } from "react";
import { createPublicClient, formatUnits, http, parseAbi, type Address } from "viem";
import { deployments, isDeployed } from "../lib/deployments";

const POOL_ABI = parseAbi([
  "function poolAssets() view returns (uint256)",
  "function totalShares() view returns (uint256)",
  "function policiesCount() view returns (uint256)",
  "function guardian() view returns (address)",
  "function attestation() view returns (address)"
]);

interface PoolState {
  assets: string;
  shares: string;
  policies: string;
  guardian: Address;
  attestation: Address;
}

type Load = { kind: "loading" } | { kind: "ok"; state: PoolState } | { kind: "error" };

const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
const num = (v: bigint, decimals = 18) =>
  Number(formatUnits(v, decimals)).toLocaleString("en-US", { maximumFractionDigits: 2 });

export function OnchainState() {
  const keys = Object.keys(deployments).filter((k) => isDeployed(deployments[k]));
  const [key, setKey] = useState(keys[0]);
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const d = deployments[key];

  useEffect(() => {
    let live = true;
    setLoad({ kind: "loading" });
    const client = createPublicClient({ transport: http(d.rpcUrl) });
    const read = <F extends (typeof POOL_ABI)[number]["name"]>(fn: F) =>
      client.readContract({ address: d.coverPool, abi: POOL_ABI, functionName: fn });
    Promise.all([
      read("poolAssets"),
      read("totalShares"),
      read("policiesCount"),
      read("guardian"),
      read("attestation")
    ])
      .then(([assets, shares, policies, guardian, attestation]) => {
        if (!live) return;
        setLoad({
          kind: "ok",
          state: {
            assets: num(assets as bigint),
            shares: num(shares as bigint),
            policies: String(policies),
            guardian: guardian as Address,
            attestation: attestation as Address
          }
        });
      })
      .catch(() => live && setLoad({ kind: "error" }));
    return () => {
      live = false;
    };
  }, [d]);

  const link = (addr: string) => `${d.explorer}/address/${addr}`;

  return (
    <div className="onchain">
      <div className="htitle">
        Onchain state <span className="livetag">LIVE READ</span>
      </div>
      <p className="simnote">
        Read straight from the deployed CoverPool on each testnet. Pick a chain to query it. The scanner runs in a
        private sandbox and does not write here yet.
      </p>
      <div className="seg" role="tablist" aria-label="chain">
        {keys.map((k) => (
          <button key={k} data-on={k === key} onClick={() => setKey(k)}>
            {deployments[k].label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="ogrid">
        <div>
          <div className="mk">Pool assets (phUSD)</div>
          <div className="mv">{load.kind === "ok" ? load.state.assets : load.kind === "error" ? "n/a" : "..."}</div>
        </div>
        <div>
          <div className="mk">LP shares</div>
          <div className="mv">{load.kind === "ok" ? load.state.shares : load.kind === "error" ? "n/a" : "..."}</div>
        </div>
        <div>
          <div className="mk">Policies sold</div>
          <div className="mv">{load.kind === "ok" ? load.state.policies : load.kind === "error" ? "n/a" : "..."}</div>
        </div>
      </div>

      {load.kind === "error" && <div className="err">could not reach {d.label}. try again in a moment.</div>}

      <div className="addrs">
        <a href={link(d.coverPool)} target="_blank" rel="noreferrer">
          CoverPool <code>{short(d.coverPool)}</code>
        </a>
        <a href={link(d.attestation)} target="_blank" rel="noreferrer">
          Attestation <code>{short(d.attestation)}</code>
        </a>
        <a href={link(d.currency)} target="_blank" rel="noreferrer">
          phUSD <code>{short(d.currency)}</code>
        </a>
      </div>
      <div className="chainid">chain id {d.chainId}</div>
    </div>
  );
}

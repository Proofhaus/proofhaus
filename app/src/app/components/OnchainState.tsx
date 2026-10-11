"use client";

import { useEffect, useState } from "react";
import { createPublicClient, formatUnits, hexToString, http, parseAbi, type Address, type Hex } from "viem";
import { deployments, isDeployed, SAMPLE_TARGET } from "../lib/deployments";
import { usd } from "../lib/format";

const POOL_ABI = parseAbi([
  "function poolAssets() view returns (uint256)",
  "function totalShares() view returns (uint256)",
  "function policiesCount() view returns (uint256)",
  "function guardian() view returns (address)",
  "function attestation() view returns (address)"
]);

const ATTESTATION_ABI = [
  {
    type: "function",
    name: "latest",
    stateMutability: "view",
    inputs: [{ name: "target", type: "address" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "extractionCents", type: "uint256" },
          { name: "premiumCents", type: "uint256" },
          { name: "classes", type: "uint32" },
          { name: "timestamp", type: "uint64" },
          { name: "commit", type: "bytes32" },
          { name: "exists", type: "bool" }
        ]
      }
    ]
  }
] as const;

interface AttestationView {
  extractionUsd: number;
  premiumUsd: number;
  classes: number;
  commit: string;
  at: string;
}

interface PoolState {
  assets: string;
  shares: string;
  policies: string;
  guardian: Address;
  attestation: Address;
  report: AttestationView | null;
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
      .then(async ([assets, shares, policies, guardian, attestation]) => {
        const r = await client.readContract({
          address: attestation as Address,
          abi: ATTESTATION_ABI,
          functionName: "latest",
          args: [SAMPLE_TARGET]
        });
        if (!live) return;
        const report: AttestationView | null = r.exists
          ? {
              extractionUsd: Number(r.extractionCents) / 100,
              premiumUsd: Number(r.premiumCents) / 100,
              classes: r.classes,
              commit: hexToString(r.commit as Hex).replace(/\0+$/, "").slice(0, 7),
              at: new Date(Number(r.timestamp) * 1000).toISOString().slice(0, 10)
            }
          : null;
        setLoad({
          kind: "ok",
          state: {
            assets: num(assets as bigint),
            shares: num(shares as bigint),
            policies: String(policies),
            guardian: guardian as Address,
            attestation: attestation as Address,
            report
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
        Read straight from the deployed CoverPool on each testnet. Pick a chain to query it. The sample attestation and
        policy below were written once by a seed script. The scanner runs in a private sandbox and does not write here
        yet.
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

      {load.kind === "ok" && (
        <div className="attest">
          <div className="mk">Latest attestation, sample suite</div>
          {load.state.report ? (
            <div className="arow">
              <span>
                extractable <b>{usd(load.state.report.extractionUsd)}</b>
              </span>
              <span>
                premium <b>{usd(load.state.report.premiumUsd)}</b>
              </span>
              <span>
                attack classes <b>{load.state.report.classes}</b>
              </span>
              <span>
                commit <b>{load.state.report.commit}</b>
              </span>
              <span>
                attested <b>{load.state.report.at}</b>
              </span>
            </div>
          ) : (
            <div className="arow">
              <span>no attestation written on this chain yet</span>
            </div>
          )}
        </div>
      )}

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

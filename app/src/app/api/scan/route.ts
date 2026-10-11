import { NextResponse, type NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RECORDED } from "../../lib/recorded";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const engineDir = () => join(process.cwd(), "..", "engine");
const port = () => 8700 + Math.floor(Math.random() * 250);

// staged by scripts/prepare-hosted.mjs on vercel: a static anvil, artifacts and the bundled engine
function hostedVendor(): string | null {
  for (const dir of [join(process.cwd(), "vendor"), join(process.cwd(), "app", "vendor")]) {
    if (existsSync(join(dir, "engine", "cli.mjs"))) return dir;
  }
  return null;
}

// the bundle may not keep its exec bit, so run anvil from a copy in /tmp
function anvilPath(vendor: string): string {
  const dest = join(tmpdir(), "proofhaus-anvil");
  if (!existsSync(dest)) {
    copyFileSync(join(vendor, "bin", "anvil"), dest);
    chmodSync(dest, 0o755);
  }
  return dest;
}

const forceReplay = () => process.env.PROOFHAUS_REPLAY === "1";
// the engine could not start at all (no pnpm, no anvil, no bundle)
const missingTooling = (msg: string) => /ENOENT|EACCES/.test(msg);

const LOCAL_ONLY =
  "Scanning your own contract needs the engine, which is not available on this host. Clone the repo and run pnpm -C app dev.";

const NO_SHAPE =
  "No supported contract shape detected. Proofhaus recognizes AMMs (swap, getReserves), ERC4626 vaults (deposit, redeem) and ETH banks (deposit, withdraw).";

// keep stack traces out of the ui
const firstLine = (msg: string) => msg.replace(/^Error:\s*/, "").split("\n")[0].slice(0, 240);

type CliResult = { ok: true; data: unknown } | { ok: false; error: string };

// run the engine cli as a subprocess so anvil/execa stay out of the next bundle
function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve) => {
    const vendor = hostedVendor();
    const child = vendor
      ? spawn(process.execPath, [join(vendor, "engine", "cli.mjs"), ...args], {
          env: {
            ...process.env,
            HOME: tmpdir(),
            PROOFHAUS_ANVIL: anvilPath(vendor),
            PROOFHAUS_OUT_DIR: join(vendor, "artifacts")
          }
        })
      : spawn("pnpm", ["exec", "tsx", "src/cli.ts", ...args], { cwd: engineDir() });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => resolve({ ok: false, error: e.message }));
    child.on("close", () => {
      const start = out.indexOf("{");
      const end = out.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        try {
          return resolve({ ok: true, data: JSON.parse(out.slice(start, end + 1)) });
        } catch {
          // fall through to error
        }
      }
      resolve({ ok: false, error: (err || out || "scan failed").trim() });
    });
  });
}

// scan the built-in sample suite (vulnerable or hardened)
export async function GET(req: NextRequest) {
  const hardened = req.nextUrl.searchParams.get("mode") === "hardened";
  const replay = () => NextResponse.json({ ...RECORDED[hardened ? "hardened" : "vulnerable"], replay: true });
  if (forceReplay()) return replay();

  const args = ["--json", "--port", String(port())];
  if (hardened) args.push("--hardened");
  const r = await runCli(args);
  if (r.ok) return NextResponse.json(r.data);
  if (missingTooling(r.error)) return replay();
  return NextResponse.json({ error: firstLine(r.error) }, { status: 500 });
}

// scan a bring-your-own compiled artifact posted in the body
export async function POST(req: NextRequest) {
  let body: { artifact?: unknown };
  try {
    body = (await req.json()) as { artifact?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }
  if (!body.artifact || typeof body.artifact !== "object") {
    return NextResponse.json({ error: "body must include an { artifact } object" }, { status: 400 });
  }

  if (forceReplay()) return NextResponse.json({ error: LOCAL_ONLY, code: "local_only" }, { status: 501 });

  const dir = mkdtempSync(join(tmpdir(), "ph-scan-"));
  try {
    const artifactPath = join(dir, "artifact.json");
    const manifestPath = join(dir, "manifest.json");
    writeFileSync(artifactPath, JSON.stringify(body.artifact));
    writeFileSync(manifestPath, JSON.stringify({ artifact: artifactPath }));

    const r = await runCli(["--target", manifestPath, "--json", "--port", String(port())]);
    if (!r.ok) {
      if (missingTooling(r.error)) return NextResponse.json({ error: LOCAL_ONLY, code: "local_only" }, { status: 501 });
      if (/no supported target shape/i.test(r.error)) {
        return NextResponse.json({ error: NO_SHAPE, code: "no_shape" }, { status: 422 });
      }
      return NextResponse.json({ error: firstLine(r.error) }, { status: 500 });
    }
    return NextResponse.json(r.data);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

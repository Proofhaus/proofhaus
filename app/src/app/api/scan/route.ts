import { NextResponse, type NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const engineDir = () => join(process.cwd(), "..", "engine");
const port = () => 8700 + Math.floor(Math.random() * 250);

type CliResult = { ok: true; data: unknown } | { ok: false; error: string };

// run the engine cli as a subprocess so anvil/execa stay out of the next bundle
function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve) => {
    const child = spawn("pnpm", ["exec", "tsx", "src/cli.ts", ...args], { cwd: engineDir() });
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
  const args = ["--json", "--port", String(port())];
  if (hardened) args.push("--hardened");
  const r = await runCli(args);
  return r.ok ? NextResponse.json(r.data) : NextResponse.json({ error: r.error }, { status: 500 });
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

  const dir = mkdtempSync(join(tmpdir(), "ph-scan-"));
  try {
    const artifactPath = join(dir, "artifact.json");
    const manifestPath = join(dir, "manifest.json");
    writeFileSync(artifactPath, JSON.stringify(body.artifact));
    writeFileSync(manifestPath, JSON.stringify({ artifact: artifactPath }));

    const r = await runCli(["--target", manifestPath, "--json", "--port", String(port())]);
    if (!r.ok) {
      const noShape = /no supported target shape/i.test(r.error);
      return NextResponse.json({ error: r.error }, { status: noShape ? 422 : 500 });
    }
    return NextResponse.json(r.data);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// run the real engine as a subprocess so anvil/execa stay out of the next bundle
function runScan(hardened: boolean, port: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const engineDir = join(process.cwd(), "..", "engine");
    const args = ["exec", "tsx", "src/cli.ts", "--json", "--port", String(port)];
    if (hardened) args.push("--hardened");

    const child = spawn("pnpm", args, { cwd: engineDir });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", reject);
    child.on("close", () => {
      const start = out.indexOf("{");
      const end = out.lastIndexOf("}");
      if (start === -1 || end === -1) return reject(new Error(err || "no output"));
      try {
        resolve(JSON.parse(out.slice(start, end + 1)));
      } catch {
        reject(new Error(err || "bad json"));
      }
    });
  });
}

export async function GET(req: NextRequest) {
  const hardened = req.nextUrl.searchParams.get("mode") === "hardened";
  const port = 8700 + Math.floor(Math.random() * 250);
  try {
    return NextResponse.json(await runScan(hardened, port));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

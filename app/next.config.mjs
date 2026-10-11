import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // the repo root, so file tracing ignores stray lockfiles higher up the disk
  outputFileTracingRoot: path.join(here, ".."),
  // the scan route spawns these at runtime, so tracing cannot see them on its own
  outputFileTracingIncludes: {
    "/api/scan": ["./vendor/**/*"]
  }
};

export default nextConfig;

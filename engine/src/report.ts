import type { ModuleResult } from "./types";

// only successful attacks count toward extraction
export function sumExtraction(modules: ModuleResult[]): number {
  return modules.reduce((acc, m) => acc + (m.success ? m.extractedUsd : 0), 0);
}

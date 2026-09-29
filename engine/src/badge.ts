export interface ShieldsEndpoint {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
}

function usdShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
}

// shields.io endpoint schema: point a badge at a url returning this json
export function badgeEndpoint(extractionUsd: number): ShieldsEndpoint {
  const safe = extractionUsd <= 0;
  return {
    schemaVersion: 1,
    label: "proofhaus",
    message: safe ? "$0 extractable" : `${usdShort(extractionUsd)} extractable`,
    color: safe ? "brightgreen" : extractionUsd < 10000 ? "yellow" : "red"
  };
}

const COLOR_HEX: Record<string, string> = {
  brightgreen: "#4c1",
  yellow: "#dfb317",
  red: "#e05d44"
};

// self-contained flat badge svg, no external assets
export function badgeSvg(extractionUsd: number): string {
  const { label, message, color } = badgeEndpoint(extractionUsd);
  const hex = COLOR_HEX[color] ?? "#9f9f9f";
  const lw = 7 * label.length + 12;
  const mw = 7 * message.length + 12;
  const w = lw + mw;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" ` +
    `aria-label="${label}: ${message}">` +
    `<rect width="${lw}" height="20" fill="#555"/>` +
    `<rect x="${lw}" width="${mw}" height="20" fill="${hex}"/>` +
    `<g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">` +
    `<text x="${lw / 2}" y="14">${label}</text>` +
    `<text x="${lw + mw / 2}" y="14">${message}</text>` +
    `</g></svg>`
  );
}

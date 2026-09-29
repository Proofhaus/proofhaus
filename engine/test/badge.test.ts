import { describe, it, expect } from "vitest";
import { badgeEndpoint, badgeSvg } from "../src/badge";

describe("badge", () => {
  it("shows a green zero badge for a safe target", () => {
    const b = badgeEndpoint(0);
    expect(b.schemaVersion).toBe(1);
    expect(b.message).toBe("$0 extractable");
    expect(b.color).toBe("brightgreen");
  });

  it("shows red with an abbreviated amount for a large hole", () => {
    const b = badgeEndpoint(359727.44);
    expect(b.message).toBe("$360k extractable");
    expect(b.color).toBe("red");
  });

  it("uses yellow for a small hole", () => {
    expect(badgeEndpoint(5000).color).toBe("yellow");
  });

  it("renders a self-contained svg", () => {
    const svg = badgeSvg(0);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("$0 extractable");
    expect(svg).toContain("#4c1");
  });
});

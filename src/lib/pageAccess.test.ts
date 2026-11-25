import { describe, it, expect } from "vitest";
import { sharePercentages } from "./pageAccess";

describe("sharePercentages", () => {
  it("totals exactly 100 for uneven splits", () => {
    const p = sharePercentages([1, 1, 1]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
    expect(p).toEqual([33.4, 33.3, 33.3]);
  });
  it("matches proportions", () => {
    expect(sharePercentages([81, 49, 43, 32]).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
    expect(sharePercentages([3, 1])).toEqual([75, 25]);
  });
  it("returns zeros with no visits", () => {
    expect(sharePercentages([0, 0])).toEqual([0, 0]);
  });
});

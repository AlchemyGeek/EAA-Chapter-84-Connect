import { describe, it, expect } from "vitest";
import { pageAccessShares, sharePercentages, totalPageVisits } from "./pageAccess";

describe("pageAccessShares", () => {
  it("retains Member Home counts but excludes them from comparative shares", () => {
    const rows = pageAccessShares([
      { page: "directory", visits: 3, members: 2 },
      { page: "home", visits: 100, members: 50 },
      { page: "resources", visits: 1, members: 1 },
    ]);
    expect(rows[1]).toEqual({ page: "home", visits: 100, members: 50, percent: null });
    expect(rows.filter((row) => row.percent !== null).map((row) => row.percent)).toEqual([75, 25]);
    expect(totalPageVisits(rows)).toBe(104);
  });
  it("has no comparative shares when only Member Home was visited", () => {
    expect(pageAccessShares([{ page: "home", visits: 10 }])).toEqual([
      { page: "home", visits: 10, percent: null },
    ]);
  });
});

describe("totalPageVisits", () => {
  it("counts every page and historical services in the reconciled 30-day rows", () => {
    const rows = [
      { page: "home", visits: 10 },
      { page: "directory", visits: 7 },
      { page: "newsletters", visits: 3 },
      { page: "legacy_services", visits: 4 },
    ];
    expect(totalPageVisits(rows)).toBe(24);
  });
  it("returns zero when the 30-day range has no visits", () => {
    expect(totalPageVisits([])).toBe(0);
  });
});

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

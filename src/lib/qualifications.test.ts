import { describe, it, expect } from "vitest";
import { matchesQualifications, parseRatings, serializeRatings } from "./qualifications";

describe("qualifications", () => {
  it("serializes the spec example in category order", () => {
    expect(serializeRatings({ selected: ["CFII", "A&P", "ASEL", "CFI", "Instrument Airplane", "Private"], other: ["Tailwheel"] }))
      .toBe("Private, ASEL, Instrument Airplane, CFI, CFII, A&P, Tailwheel");
  });
  it("round-trips a canonical string", () => {
    const s = "Commercial, ASEL, CFI, CFII, High Performance, Complex";
    expect(serializeRatings(parseRatings(s))).toBe(s);
  });
  it("removes duplicates", () => {
    expect(serializeRatings({ selected: ["CFI", "CFI"], other: ["CFI", "Tailwheel", "Tailwheel"] })).toBe("CFI, Tailwheel");
  });
  it("keeps only one certificate", () => {
    expect(serializeRatings({ selected: ["ATP", "Private"], other: [] })).toBe("Private");
  });
  it("puts unknown old text into Other in order", () => {
    expect(parseRatings("PPL, ASEL, cfii")).toEqual({ selected: ["ASEL"], other: ["PPL", "cfii"] });
  });
  it("treats empty as no qualifications", () => {
    expect(parseRatings("")).toEqual({ selected: [], other: [] });
    expect(serializeRatings({ selected: [], other: [] })).toBe("");
  });
  it("requires every selected qualification to be present", () => {
    const r = "Private, ASEL, Instrument Airplane, CFI, CFII, A&P, Tailwheel";
    expect(matchesQualifications(r, ["CFII", "A&P"])).toBe(true);
    expect(matchesQualifications(r, ["CFII", "IA"])).toBe(false);
    expect(matchesQualifications(r, [])).toBe(true);
  });
  it("matches old free-text ratings ignoring case and hyphen style", () => {
    expect(matchesQualifications("cfii, rotorcraft‑helicopter", ["CFII", "Rotorcraft‑Helicopter"])).toBe(true);
    expect(matchesQualifications("Rotorcraft-Helicopter", ["Rotorcraft‑Helicopter"])).toBe(true);
    expect(matchesQualifications("", ["CFI"])).toBe(false);
  });
});

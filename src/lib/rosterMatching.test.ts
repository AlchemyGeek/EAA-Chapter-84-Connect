import { describe, expect, it } from "vitest";
import { findReconciliationMatch, normalizeEaa } from "../../supabase/functions/roster-import/memberMatching";

describe("authoritative roster matching for placeholder EAA numbers", () => {
  const local = { key_id: 149098, first_name: "Jake", last_name: "Torgerson", email: "jake_torgerson@live.com", eaa_number: "0", last_import_id: null };
  const roster = { key_id: 149332, first_name: "Jake", last_name: "Torgerson", email: "JAKE_TORGERSON@live.com", eaa_number: "1234567" };

  it("matches Jake's EAA 0 application to his authoritative roster entry", () => {
    expect(findReconciliationMatch(roster, [local])?.key_id).toBe(149098);
  });
  it("also matches the blank EAA number in Jake's latest imported record", () => {
    expect(findReconciliationMatch({ ...roster, eaa_number: " " }, [local])?.key_id).toBe(149098);
  });
  it("never treats zero as an EAA identity", () => {
    expect(normalizeEaa("0")).toBe("");
    expect(findReconciliationMatch({ ...roster, first_name: "Other", eaa_number: "0" }, [local])).toBeUndefined();
  });
  it("requires both matching name and matching email", () => {
    expect(findReconciliationMatch({ ...roster, email: "different@example.com" }, [local])).toBeUndefined();
    expect(findReconciliationMatch({ ...roster, first_name: "Glenn" }, [local])).toBeUndefined();
  });
  it("does not guess between multiple matching local records", () => {
    expect(findReconciliationMatch(roster, [local, { ...local, key_id: 2 }])).toBeUndefined();
  });
  it("does not merge conflicting real EAA numbers or two imported members", () => {
    expect(findReconciliationMatch(roster, [{ ...local, eaa_number: "9876543" }])).toBeUndefined();
    expect(findReconciliationMatch(roster, [{ ...local, last_import_id: "existing-import" }])).toBeUndefined();
  });
  it("continues matching normalized valid EAA numbers across changed keys", () => {
    expect(findReconciliationMatch(roster, [{ ...local, eaa_number: "EAA 123-4567" }])?.key_id).toBe(149098);
  });
});
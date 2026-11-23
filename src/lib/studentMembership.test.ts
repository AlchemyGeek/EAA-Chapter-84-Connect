import { describe, expect, it } from "vitest";
import { isStudentEligible, renewalFeeKind } from "./studentMembership";

const on = new Date(2026, 10, 23);

describe("student age rule", () => {
  it("allows an 18-year-old", () => expect(isStudentEligible("2008-01-01", on)).toBe(true));
  it("allows the day before the 19th birthday", () => expect(isStudentEligible("2007-11-24", on)).toBe(true));
  it("blocks on the 19th birthday", () => expect(isStudentEligible("2007-11-23", on)).toBe(false));
  it("blocks without a date of birth", () => expect(isStudentEligible("", on)).toBe(false));
});

describe("renewal fee by membership type", () => {
  it("students under 19 renew at the student fee", () =>
    expect(renewalFeeKind({ member_type: "Student", birth_date: "2010-05-01" }, on)).toBe("student"));
  it("students who turned 19 renew as regular", () =>
    expect(renewalFeeKind({ member_type: "Student", birth_date: "2005-05-01" }, on)).toBe("aged-out"));
  it("regular members keep the regular fee", () =>
    expect(renewalFeeKind({ member_type: "Regular", birth_date: "2010-05-01" }, on)).toBe("regular"));
});

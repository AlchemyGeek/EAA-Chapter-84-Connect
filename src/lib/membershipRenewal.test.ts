import { describe, expect, it } from "vitest";
import { membershipRenewalYear } from "./membershipRenewal";

const member = { current_standing: "Active", member_type: "Regular", expiration_date: "2027-03-09" };

describe("calendar-year renewal reminders", () => {
  it("starts on December 1, 2026 for a 2027 expiration, not November 30", () => {
    expect(membershipRenewalYear(member, new Date(2026, 10, 30, 23, 59))).toBeNull();
    expect(membershipRenewalYear(member, new Date(2026, 11, 1))).toBe(2027);
  });
  it("continues after January 1 through the March grace period", () => {
    expect(membershipRenewalYear(member, new Date(2027, 0, 1))).toBe(2027);
    expect(membershipRenewalYear(member, new Date(2027, 2, 9))).toBe(2027);
  });
  it("does not remind members paid through 2027 until December 1, 2027", () => {
    const prepaid = { ...member, expiration_date: "2028-03-07" };
    expect(membershipRenewalYear(prepaid, new Date(2026, 11, 1))).toBeNull();
    expect(membershipRenewalYear(prepaid, new Date(2027, 0, 1))).toBeNull();
    expect(membershipRenewalYear(prepaid, new Date(2027, 11, 1))).toBe(2028);
  });
  it("exempts Lifetime members even with a March 2027 expiration", () => {
    expect(membershipRenewalYear({ ...member, member_type: "Lifetime" }, new Date(2026, 11, 1))).toBeNull();
    expect(membershipRenewalYear({ ...member, member_type: "Lifetime" }, new Date(2027, 2, 10))).toBeNull();
  });
  it("keeps prospects out of the renewal workflow", () => {
    expect(membershipRenewalYear({ ...member, member_type: "Prospect" }, new Date(2026, 11, 1))).toBeNull();
  });
  it("leaves inactive members to their existing inactive notice", () => {
    expect(membershipRenewalYear({ ...member, current_standing: "Inactive" }, new Date(2026, 11, 1))).toBeNull();
  });
  it("does not guess a renewal year without a valid expiration", () => {
    expect(membershipRenewalYear({ ...member, expiration_date: null }, new Date(2026, 11, 1))).toBeNull();
    expect(membershipRenewalYear({ ...member, expiration_date: "invalid" }, new Date(2026, 11, 1))).toBeNull();
  });
  it("keeps unpaid regular members eligible for an overdue notice", () => {
    expect(membershipRenewalYear(member, new Date(2027, 2, 10))).toBe(2027);
  });
});
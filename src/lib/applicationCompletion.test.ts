import { describe, expect, it } from "vitest";
import { applicationCompletionUpdates } from "./applicationCompletion";

describe("completion of a previously incomplete application", () => {
  const updates = applicationCompletionUpdates("2026-11-11T16:21:28.646Z", "2027-03-09");

  it("clears the incomplete flag so the unsent completion email is available", () => {
    const application = { archived_at: "2026-10-21T21:41:25.606Z", fees_verified: true, welcome_sent_at: null, ...updates.application };
    expect(application.archived_at).toBeNull();
    expect(application.fees_verified && !application.archived_at && !application.welcome_sent_at).toBe(true);
  });

  it("restores the completed member to Active Regular standing", () => {
    expect(updates.roster.current_standing).toBe("Active");
    expect(updates.roster.member_type).toBe("Regular");
  });

  it("preserves any previously sent welcome email", () => {
    const application = { welcome_sent_at: "2026-11-10T12:00:00Z", ...updates.application };
    expect(application.welcome_sent_at).toBe("2026-11-10T12:00:00Z");
  });
});
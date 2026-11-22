interface RenewalMember {
  current_standing: string | null;
  member_type: string | null;
  expiration_date: string | null;
}

export function isLifetimeMember(memberType: string | null | undefined): boolean {
  return memberType?.trim().toLowerCase() === "lifetime";
}

/** The renewal year whose notice is open, or null if no notice is due. */
export function membershipRenewalYear(member: RenewalMember | null | undefined, now = new Date()): number | null {
  if (!member || member.current_standing !== "Active" || isLifetimeMember(member.member_type) ||
      member.member_type?.trim().toLowerCase() === "prospect" || !member.expiration_date) return null;

  const expiration = new Date(`${member.expiration_date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(expiration.getTime())) return null;
  const renewalYear = expiration.getFullYear();
  const remindersStart = new Date(renewalYear - 1, 11, 1);
  return now >= remindersStart ? renewalYear : null;
}
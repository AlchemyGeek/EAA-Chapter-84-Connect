// Student membership: under 19 (through the day before the 19th birthday).
export const STUDENT_MAX_AGE = 19;
export const STUDENT_NEW_MEMBER_FEE = "student-new-member";
export const STUDENT_RENEWAL_FEE = "student-renewal";

export function ageOn(dateOfBirth: string, on = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth || "");
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = on.getFullYear() - y;
  if (on.getMonth() + 1 < mo || (on.getMonth() + 1 === mo && on.getDate() < d)) age--;
  return age;
}

export function isStudentEligible(dateOfBirth: string | null | undefined, on = new Date()): boolean {
  if (!dateOfBirth) return false;
  const age = ageOn(dateOfBirth, on);
  return age !== null && age >= 0 && age < STUDENT_MAX_AGE;
}

export function isStudentMember(memberType: string | null | undefined): boolean {
  return memberType?.trim().toLowerCase() === "student";
}

/** Which renewal fee a member uses: student-renewal only for students still under 19. */
export function renewalFeeKind(
  member: { member_type: string | null; birth_date: string | null } | null | undefined,
  on = new Date(),
): "student" | "regular" | "aged-out" {
  if (!member || !isStudentMember(member.member_type)) return "regular";
  if (member.birth_date && !isStudentEligible(member.birth_date, on)) return "aged-out";
  return "student";
}

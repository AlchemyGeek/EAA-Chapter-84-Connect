type Member = Record<string, any>;

export function normalizeEaa(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "").replace(/^0+/, "");
  return digits;
}

const normalizeText = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

// A name alone or a shared email alone is not sufficient to merge members.
export function findReconciliationMatch(incoming: Member, candidates: Member[]): Member | undefined {
  const eaa = normalizeEaa(incoming.eaa_number);
  const byEaa = eaa ? candidates.filter(member => normalizeEaa(member.eaa_number) === eaa) : [];
  if (byEaa.length) return byEaa.length === 1 ? byEaa[0] : undefined;

  const email = normalizeText(incoming.email);
  const first = normalizeText(incoming.first_name);
  const last = normalizeText(incoming.last_name);
  if (!email || !first || !last) return undefined;
  const byIdentity = candidates.filter(member =>
    // Only reconcile locally-created records this way, not two authoritative roster entries.
    !member.last_import_id &&
    (!eaa || !normalizeEaa(member.eaa_number)) &&
    normalizeText(member.email) === email &&
    normalizeText(member.first_name) === first &&
    normalizeText(member.last_name) === last
  );
  return byIdentity.length === 1 ? byIdentity[0] : undefined;
}
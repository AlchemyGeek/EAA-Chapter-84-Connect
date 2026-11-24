export interface QualificationSection {
  key: "certificate" | "categoryClass" | "instrument" | "instructor" | "mechanic";
  label: string;
  single?: boolean;
  tokens: string[];
}

export const QUALIFICATION_SECTIONS: QualificationSection[] = [
  { key: "certificate", label: "Certificate", single: true, tokens: ["Student", "Sport Pilot", "Private", "Commercial", "ATP"] },
  { key: "categoryClass", label: "Category / Class", tokens: ["ASEL", "AMEL", "ASES", "AMES", "Glider", "Rotorcraft‑Helicopter", "Rotorcraft‑Gyroplane", "Lighter‑Than‑Air"] },
  { key: "instrument", label: "Instrument Rating", tokens: ["Instrument Airplane", "Instrument Helicopter"] },
  { key: "instructor", label: "Instructor Ratings", tokens: ["CFI", "CFII", "MEI"] },
  { key: "mechanic", label: "Mechanic", tokens: ["A&P", "IA", "Repairman (Experimental)"] },
];

export const ALL_QUALIFICATION_TOKENS = QUALIFICATION_SECTIONS.flatMap((s) => s.tokens);

export interface QualificationsValue {
  selected: string[];
  other: string[];
}

export function splitRatings(value: string | null | undefined): string[] {
  return (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export function parseRatings(value: string | null | undefined): QualificationsValue {
  const selected: string[] = [];
  const other: string[] = [];
  for (const seg of splitRatings(value)) {
    if (ALL_QUALIFICATION_TOKENS.includes(seg)) {
      if (!selected.includes(seg)) selected.push(seg);
    } else if (!other.includes(seg)) {
      other.push(seg);
    }
  }
  return { selected, other };
}

export function serializeRatings({ selected, other }: QualificationsValue): string {
  const out: string[] = [];
  for (const section of QUALIFICATION_SECTIONS) {
    const picks = section.tokens.filter((t) => selected.includes(t));
    out.push(...(section.single ? picks.slice(0, 1) : picks));
  }
  for (const o of other.map((s) => s.trim()).filter(Boolean)) {
    if (!out.includes(o)) out.push(o);
  }
  return out.join(", ");
}

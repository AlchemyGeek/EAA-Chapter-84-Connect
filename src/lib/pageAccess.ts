export const PAGE_LABELS: Record<string, string> = {
  home: "Member Home",
  directory: "Directory",
  profile: "Member Profile",
  resources: "Resources",
  newsletters: "Newsletters",
  briefing_room: "Briefing Room",
  briefing_room_archive: "Briefing Room Archive",
  volunteering: "Volunteering",
  hangar_talk: "Hangar Talk",
  classifieds: "Classifieds",
  flyover: "Flyover",
  dues_payment: "Dues Payment",
  legacy_services: "Services (combined, before split)",
};

export const pageLabel = (key: string) => PAGE_LABELS[key] ?? key;

/** Keep home counts, but compare shares only among the other pages. */
export function pageAccessShares<T extends { page: string; visits: number }>(rows: readonly T[]) {
  const comparedRows = rows.filter((row) => row.page !== "home");
  const percentages = sharePercentages(comparedRows.map((row) => row.visits));
  let index = 0;
  return rows.map((row) => ({
    ...row,
    percent: row.page === "home" ? null : percentages[index++],
  }));
}

/** Sum the already reconciled page rows, including historical combined services. */
export function totalPageVisits(rows: readonly { visits: number }[]): number {
  return rows.reduce((total, row) => total + row.visits, 0);
}

/** Largest-remainder rounding to 1 decimal so shares always total exactly 100. */
export function sharePercentages(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return counts.map(() => 0);
  const raw = counts.map((c) => (c / total) * 1000);
  const floors = raw.map(Math.floor);
  let left = 1000 - floors.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, rem: r - floors[i] }))
    .sort((a, b) => b.rem - a.rem)
    .forEach(({ i }) => { if (left > 0) { floors[i] += 1; left -= 1; } });
  return floors.map((f) => f / 10);
}

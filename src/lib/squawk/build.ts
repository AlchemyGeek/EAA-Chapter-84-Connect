import { supabase } from "@/integrations/supabase/client";
import { AVIATION_QUOTES } from "./quotes";
import type { SquawkEntry, SquawkSlide } from "./types";

const MAX_SLOTS = 10;
const MAX_MANUAL = 2;
const MAX_WELCOME = 1;
const MAX_PER_MEDIUM = 3; // classifieds, hangar talk, volunteering
const MAX_QUOTES_WITH_CONTENT = 2; // quotes mixed in when real content exists
const QUOTE_FALLBACK_SLOTS = 3; // only used when there is no real content at all



function pickRandom<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickUpTo<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

function truncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
}

async function fetchManual(): Promise<SquawkEntry[]> {
  const { data, error } = await supabase
    .from("squawk_entries" as any)
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as unknown) as SquawkEntry[];
}

async function fetchWelcome(): Promise<SquawkSlide[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("roster_members")
    .select("key_id, first_name, last_name, nickname, email, email_private, current_joined_on_date, current_standing")
    .eq("current_standing", "Active")
    .gte("current_joined_on_date", since);
  if (error || !data) return [];
  const eligible = data.filter((m) => m.email && !m.email_private);
  return eligible.map((m) => {
    const first = m.nickname?.trim() ? `${m.first_name} (${m.nickname.trim()})` : m.first_name;
    const display = `${first} ${m.last_name}`.trim();
    return {
      key: `welcome-${m.key_id}`,
      kind: "welcome",
      label: "New Member",
      title: `Welcome, ${display}!`,
      body: "New to the pattern 🛩️ — say hi and help them feel at home.",
      mailto: `mailto:${m.email}?subject=${encodeURIComponent("Welcome to EAA Chapter 84!")}`,
    } satisfies SquawkSlide;
  });
}

async function fetchClassifieds(): Promise<SquawkSlide[]> {
  const { data, error } = await supabase
    .from("classifieds")
    .select("id, title, description, category, status, created_at, expires_at")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !data) return [];
  return data.map((c: any) => ({
    key: `classifieds-${c.id}`,
    kind: "classifieds",
    label: "Classifieds",
    title: truncate(c.title, 80),
    body: c.description ? truncate(c.description, 120) : "New listing in the chapter classifieds.",
    href: `/classifieds/${c.id}`,
  }));
}

async function fetchVolunteering(): Promise<SquawkSlide[]> {
  const { data, error } = await supabase
    .from("volunteering_opportunities" as any)
    .select("id, title, status, description, created_at")
    .eq("status", "Active")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !data) return [];
  return (data as any[]).map((o) => ({
    key: `volunteer-${o.id}`,
    kind: "volunteering",
    label: "Volunteering",
    title: truncate(o.title, 80),
    body: o.description ? truncate(o.description, 120) : "New chapter volunteering opportunity.",
    href: `/member-volunteering/${o.id}`,
  }));
}

async function fetchHangarTalk(): Promise<SquawkSlide[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("hangar_talk_posts" as any)
    .select("id, title, body, type, resolved_at, last_activity_at")
    .is("resolved_at", null)
    .gte("last_activity_at", since)
    .order("last_activity_at", { ascending: false })
    .limit(10);
  if (error || !data) return [];
  return (data as any[]).map((p) => {
    const label =
      p.type === "help_wanted" ? "Help Wanted" : p.type === "question" ? "Question" : "Hangar Talk";
    return {
      key: `hangar-${p.id}`,
      kind: "hangar_talk",
      label,
      title: truncate(p.title, 80),
      body: p.body ? truncate(p.body, 120) : "Active in Hangar Talk — join the conversation.",
      href: `/hangar-talk/${p.id}`,
    } satisfies SquawkSlide;
  });
}

function manualToSlide(m: SquawkEntry): SquawkSlide {
  return {
    key: `manual-${m.id}`,
    kind: m.type,
    label: m.type === "announcement" ? "Announcement" : "What's New",
    title: m.title,
    body: m.message,
    href: m.link || undefined,
  };
}

function quoteSlide(idx: number): SquawkSlide {
  const q = AVIATION_QUOTES[idx % AVIATION_QUOTES.length];
  return {
    key: `quote-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "quote",
    label: "Quote",
    title: `"${q.text}"`,
    body: q.author ? `— ${q.author}` : "",
  };
}

export async function buildSquawkSlides(): Promise<SquawkSlide[]> {
  const [manual, welcome, classifieds, hangar, volunteer] = await Promise.all([
    fetchManual(),
    fetchWelcome(),
    fetchClassifieds(),
    fetchHangarTalk(),
    fetchVolunteering(),
  ]);

  // Show only as many slots as we have real content for.
  const eligibleCount =
    Math.min(manual.length, MAX_MANUAL) +
    Math.min(welcome.length, MAX_WELCOME) +
    Math.min(classifieds.length, MAX_PER_MEDIUM) +
    Math.min(hangar.length, MAX_PER_MEDIUM) +
    Math.min(volunteer.length, MAX_PER_MEDIUM);
  const targetSlots = Math.min(MAX_SLOTS, eligibleCount);

  const slides: SquawkSlide[] = [];

  // 1. Manual takes priority — up to 2.
  const manualPick = pickUpTo(manual, MAX_MANUAL).map(manualToSlide);
  slides.push(...manualPick);

  // 2. Welcome — high priority.
  const w = pickRandom(welcome);
  if (w && slides.length < targetSlots) slides.push(w);

  // 3. Medium-priority categories share equal weight; include up to MAX_PER_MEDIUM from each.
  const mediumPool: SquawkSlide[] = shuffle([
    ...pickUpTo(classifieds, MAX_PER_MEDIUM),
    ...pickUpTo(hangar, MAX_PER_MEDIUM),
    ...pickUpTo(volunteer, MAX_PER_MEDIUM),
  ]);
  for (const s of mediumPool) {
    if (slides.length >= targetSlots) break;
    slides.push(s);
  }

  // 4. Quotes are a last-resort fallback: only when there is no real content at all.
  if (slides.length === 0) {
    const shuffledQuotes = shuffle(AVIATION_QUOTES.map((_, i) => i));
    for (let i = 0; i < QUOTE_FALLBACK_SLOTS && i < shuffledQuotes.length; i++) {
      slides.push(quoteSlide(shuffledQuotes[i]));
    }
  } else {
    // Mix in a couple of quotes with real content.
    const shuffledQuotes = shuffle(AVIATION_QUOTES.map((_, i) => i));
    let added = 0;
    for (const idx of shuffledQuotes) {
      if (slides.length >= MAX_SLOTS) break;
      if (added >= MAX_QUOTES_WITH_CONTENT) break;
      slides.push(quoteSlide(idx));
      added++;
    }
  }

  return slides.slice(0, MAX_SLOTS);

}

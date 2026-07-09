import { supabase } from "@/integrations/supabase/client";
import { AVIATION_QUOTES } from "./quotes";
import type { SquawkEntry, SquawkSlide } from "./types";

const MIN_SLOTS = 5;
const MAX_SLOTS = 5;
const MAX_MANUAL = 2;


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
    const display = m.nickname?.trim() ? `${m.first_name} (${m.nickname.trim()})` : m.first_name;
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
    .select("id, title, category, status, created_at, expires_at")
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
    body: "New listing in the chapter classifieds.",
    href: `/classifieds/${c.id}`,
  }));
}

async function fetchHangarTalk(): Promise<SquawkSlide[]> {
  const { data, error } = await supabase
    .from("hangar_talk_posts" as any)
    .select("id, title, type, resolved_at, last_activity_at")
    .is("resolved_at", null)
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
      body: "Active in Hangar Talk — join the conversation.",
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
  const [manual, welcome, classifieds, hangar] = await Promise.all([
    fetchManual(),
    fetchWelcome(),
    fetchClassifieds(),
    fetchHangarTalk(),
  ]);

  const slides: SquawkSlide[] = [];

  // 1. Manual takes priority — up to 2.
  const manualPick = shuffle(manual).slice(0, MAX_MANUAL).map(manualToSlide);
  slides.push(...manualPick);

  // 2. Auto pool by priority.
  const targetSlots = Math.min(MAX_SLOTS, Math.max(MIN_SLOTS, slides.length + 3));

  const w = pickRandom(welcome);
  if (w && slides.length < targetSlots) slides.push(w);

  const c = pickRandom(classifieds);
  if (c && slides.length < targetSlots) slides.push(c);

  const h = pickRandom(hangar);
  if (h && slides.length < targetSlots) slides.push(h);

  // 3. Fill remaining with quotes (allowed to repeat as filler).
  const shuffledQuotes = shuffle(AVIATION_QUOTES.map((_, i) => i));
  let qi = 0;
  while (slides.length < targetSlots) {
    slides.push(quoteSlide(shuffledQuotes[qi % shuffledQuotes.length]));
    qi++;
    if (qi > MAX_SLOTS * 2) break; // safety
  }

  return slides.slice(0, MAX_SLOTS);
}

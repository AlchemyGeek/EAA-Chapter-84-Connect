import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed, errorResult, jsonResult } from "../supabase";

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function normalizeHeadline(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const wa = new Set(normalizeHeadline(a).split(" ").filter((w) => w.length > 2));
  const wb = new Set(normalizeHeadline(b).split(" ").filter((w) => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  wa.forEach((w) => {
    if (wb.has(w)) shared++;
  });
  return shared / Math.max(wa.size, wb.size);
}

export default defineTool({
  name: "check_duplicate",
  title: "Check for a duplicate Briefing Room item",
  description:
    "Given a candidate article URL and headline, report whether a matching or near-matching item already exists in the recent Briefing Room archive.",
  inputSchema: {
    source_url: z.string().describe("Candidate article URL."),
    headline: z.string().describe("Candidate headline."),
    days: z.number().int().optional().describe("How far back to compare, in days (default 45)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ source_url, headline, days }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);
    const since = new Date(Date.now() - (days ?? 45) * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("briefing_room_items")
      .select("id,headline,source_url,source_name,status,added_at")
      .gte("added_at", since)
      .order("added_at", { ascending: false })
      .limit(500);
    if (error) return errorResult(error.message);

    const candidateUrl = normalizeUrl(source_url);
    const rows = data ?? [];

    const exact = rows.find((r: any) => normalizeUrl(r.source_url) === candidateUrl);
    if (exact) {
      return jsonResult(
        { duplicate: true, reason: "url_match", match: exact },
        { duplicate: true, reason: "url_match", match: exact },
      );
    }

    let best: { row: any; score: number } | null = null;
    for (const r of rows) {
      const score = similarity(headline, r.headline as string);
      if (!best || score > best.score) best = { row: r, score };
    }
    if (best && best.score >= 0.6) {
      return jsonResult(
        { duplicate: true, reason: "headline_similarity", score: best.score, match: best.row },
        { duplicate: true, reason: "headline_similarity", score: best.score, match: best.row },
      );
    }

    return jsonResult(
      { duplicate: false, closest_score: best?.score ?? 0 },
      { duplicate: false, closest_score: best?.score ?? 0 },
    );
  },
});

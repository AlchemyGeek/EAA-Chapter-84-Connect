import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "list_recent_by_source",
  title: "List recent Briefing Room items by source",
  description:
    "List recently added Briefing Room items, optionally filtered to one source, so the agent can pace itself and avoid over-relying on a single outlet. Omit the source to get a per-source count summary.",
  inputSchema: {
    source: z.string().optional().describe("Exact source name; omit for a summary across sources."),
    days: z.number().int().optional().describe("Look-back window in days (default 30)."),
    limit: z.number().int().optional().describe("Max rows, 1-100 (default 50)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ source, days, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);
    const since = new Date(Date.now() - (days ?? 30) * 24 * 60 * 60 * 1000).toISOString();

    let q = supabase
      .from("briefing_room_items")
      .select("id,headline,source_name,source_url,image_url,category,status,added_at")
      .gte("added_at", since)
      .order("added_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 50, 1), 100));
    if (source) q = q.eq("source_name", source);

    const { data, error } = await q;
    if (error) return errorResult(error.message);

    const rows = data ?? [];
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const name = (r as any).source_name as string;
      counts[name] = (counts[name] ?? 0) + 1;
    }

    return jsonResult(
      { window_days: days ?? 30, counts_by_source: counts, items: rows },
      { counts_by_source: counts, items: rows, count: rows.length },
    );
  },
});

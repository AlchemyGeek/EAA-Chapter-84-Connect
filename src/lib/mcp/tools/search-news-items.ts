import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed, errorResult, jsonResult } from "../supabase";

const CATEGORIES = [
  "homebuilding",
  "safety_regulatory",
  "industry_news",
  "events_airshows",
  "eaa",
] as const;

export default defineTool({
  name: "search_news_items",
  title: "Search Briefing Room items",
  description:
    "Search existing EAA Chapter 84 Briefing Room news items by keyword, source, category, or date range. Useful for context and duplicate checking.",
  inputSchema: {
    query: z.string().optional().describe("Keyword matched against headline and summary."),
    source: z.string().optional().describe("Exact source name, e.g. 'AVweb'."),
    category: z.enum(CATEGORIES).optional().describe("Category filter."),
    added_since: z.string().optional().describe("ISO date/time; only items added on or after this."),
    added_before: z.string().optional().describe("ISO date/time; only items added before this."),
    include_unpublished: z
      .boolean()
      .optional()
      .describe("Include pending/rejected/archived items (officers only). Default false."),
    limit: z.number().int().optional().describe("Max rows, 1-100 (default 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

    let q = supabase
      .from("briefing_room_items")
      .select(
        "id,headline,summary,source_name,source_url,image_url,source_published_at,added_at,published_at,category,status",
      );

    if (!input.include_unpublished) q = q.eq("status", "published");
    if (input.query) {
      const term = input.query.replace(/[%,()]/g, " ").trim();
      if (term) q = q.or(`headline.ilike.%${term}%,summary.ilike.%${term}%`);
    }
    if (input.source) q = q.eq("source_name", input.source);
    if (input.category) q = q.eq("category", input.category);
    if (input.added_since) q = q.gte("added_at", input.added_since);
    if (input.added_before) q = q.lt("added_at", input.added_before);

    const { data, error } = await q.order("added_at", { ascending: false }).limit(limit);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? [], { items: data ?? [], count: data?.length ?? 0 });
  },
});

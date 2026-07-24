import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "list_hangar_talk_posts",
  title: "List Hangar Talk posts",
  description:
    "List recent Hangar Talk community posts (questions, help requests, and FYIs) from EAA Chapter 84.",
  inputSchema: {
    type: z
      .enum(["question", "help", "fyi"])
      .optional()
      .describe("Optional filter by post type."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("hangar_talk_posts")
      .select("id,type,title,body,author_key_id,last_activity_at,created_at,resolved_at")
      .order("last_activity_at", { ascending: false })
      .limit(limit ?? 20);
    if (type) q = q.eq("type", type);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult(data ?? [], { posts: data ?? [], count: data?.length ?? 0 });
  },
});

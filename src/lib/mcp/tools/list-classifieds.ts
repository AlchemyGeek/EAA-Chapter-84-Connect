import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "list_classifieds",
  title: "List classifieds",
  description:
    "List active EAA Chapter 84 classified listings (for-sale, wanted, free items).",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("classifieds")
      .select("id,title,description,category,tags,price,author_name,posted_at,expires_at,status")
      .eq("status", "active")
      .order("posted_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? [], { classifieds: data ?? [], count: data?.length ?? 0 });
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "list_volunteering_opportunities",
  title: "List volunteering opportunities",
  description:
    "List active EAA Chapter 84 volunteering opportunities members can sign up for.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("volunteering_opportunities")
      .select("id,title,description,num_volunteers,status,created_by_name,created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? [], { opportunities: data ?? [], count: data?.length ?? 0 });
  },
});

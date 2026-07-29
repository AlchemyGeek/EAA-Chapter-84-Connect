import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "list_directory",
  title: "List member directory",
  description:
    "List active EAA Chapter 84 members visible to the signed-in user. Respects each member's privacy settings and RLS.",
  inputSchema: {
    search: z
      .string()
      .optional()
      .describe("Optional case-insensitive name substring to filter by (first or last name)."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("roster_members")
      .select(
        "key_id,first_name,last_name,nickname,email,preferred_city,preferred_state,ratings,aircraft_owned"
      )
      .eq("current_standing", "Active")
      .order("last_name")
      .limit(limit ?? 50);
    if (search && search.trim()) {
      const s = search.trim();
      q = q.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,nickname.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult(data ?? [], { members: data ?? [], count: data?.length ?? 0 });
  },
});

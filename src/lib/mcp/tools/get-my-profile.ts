import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, notAuthed, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description:
    "Get the signed-in member's roster profile from EAA Chapter 84 Connect (name, email, membership standing, expiration, aircraft, ratings).",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const email = ctx.getUserEmail();
    if (!email) return errorResult("No email in token");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("roster_members")
      .select(
        "key_id,eaa_number,member_type,first_name,last_name,nickname,email,current_standing,expiration_date,ratings,aircraft_owned,aircraft_project,aircraft_built,preferred_city,preferred_state"
      )
      .ilike("email", email)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("No roster record found for signed-in email.");
    return jsonResult(data, { member: data });
  },
});

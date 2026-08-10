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
  name: "create_news_item",
  title: "Create a Briefing Room item",
  description:
    "Add a news item to the EAA Chapter 84 Briefing Room. Connect sets the status from the current publish mode (pending officer review unless auto-publish is on). Requires an officer account.",
  inputSchema: {
    headline: z.string().describe("Short story title."),
    summary: z.string().describe("2-4 sentence summary of the story."),
    source_name: z.string().describe("Display name of the outlet, e.g. 'AVweb'."),
    source_url: z.string().describe("Link to the original article."),
    source_published_at: z
      .string()
      .optional()
      .describe("ISO date/time the source published the article."),
    category: z.enum(CATEGORIES).describe("Category for the item."),
    image_url: z
      .string()
      .optional()
      .describe(
        "Direct https link to a representative image for the story (article photo or outlet image). Ignored if not https.",
      ),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const supabase = supabaseForUser(ctx);

    const { data: settings } = await supabase
      .from("briefing_room_settings")
      .select("auto_publish")
      .eq("id", 1)
      .maybeSingle();
    const autoPublish = !!settings?.auto_publish;

    const { data, error } = await supabase
      .from("briefing_room_items")
      .insert({
        headline: input.headline.trim(),
        summary: input.summary.trim(),
        source_name: input.source_name.trim(),
        source_url: input.source_url.trim(),
        source_published_at: input.source_published_at ?? null,
        image_url:
          input.image_url && /^https:\/\//i.test(input.image_url.trim())
            ? input.image_url.trim()
            : null,
        category: input.category,
        status: autoPublish ? "published" : "pending_review",
        published_at: autoPublish ? new Date().toISOString() : null,
        created_by: ctx.getUserId(),
      })
      .select("id,status,headline")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return errorResult("An item with this source URL already exists in Briefing Room.");
      }
      return errorResult(error.message);
    }
    return jsonResult(data, { item: data });
  },
});

// Public RSS feed for the EAA Chapter 84 Briefing Room.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_URL = "https://eaa84connect.lovable.app";
const FEED_TITLE = "EAA Chapter 84 — Briefing Room";
const FEED_DESC =
  "General aviation and homebuilding news curated for EAA Chapter 84 members.";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 30) || 30, 100);

  let q = supabase
    .from("briefing_room_items")
    .select("id,headline,summary,source_name,source_url,image_url,category,published_at,added_at,source_published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) {
    return new Response(`Feed unavailable: ${error.message}`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  const items = (data ?? [])
    .map((i: any) => {
      const img = typeof i.image_url === "string" && i.image_url.startsWith("https://")
        ? `\n      <enclosure url="${esc(i.image_url)}" type="image/jpeg" length="0" />\n      <media:content url="${esc(i.image_url)}" medium="image" />`
        : "";
      const date = new Date(i.published_at ?? i.source_published_at ?? i.added_at).toUTCString();
      return `    <item>
      <title>${esc(i.headline)}</title>
      <link>${esc(i.source_url)}</link>
      <guid isPermaLink="false">${i.id}</guid>
      <pubDate>${date}</pubDate>
      <category>${esc(i.category)}</category>
      <source url="${esc(i.source_url)}">${esc(i.source_name)}</source>
      <description>${esc(i.summary)}</description>${img}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${esc(FEED_TITLE)}</title>
    <link>${SITE_URL}/briefing-room</link>
    <description>${esc(FEED_DESC)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${esc(req.url)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900",
    },
  });
});

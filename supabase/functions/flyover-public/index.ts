import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const [briefingRes, volRes, classRes] = await Promise.all([
      supabase
        .from("briefing_room_items")
        .select(
          "id,headline,summary,source_name,source_url,source_published_at,added_at,published_at,category,status,image_url,edited,edited_by_name,edited_at",
        )
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("added_at", { ascending: false })
        .limit(10),
      supabase
        .from("volunteering_opportunities")
        .select("id,title,description,num_volunteers,created_at")
        .eq("status", "Active")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("classifieds")
        .select("id,title,description,category,tags,price,links,posted_at,expires_at")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("posted_at", { ascending: false })
        .limit(20),
    ]);

    const classifieds = classRes.data ?? [];

    // Attach photos (signed URLs) for the listings we return.
    let photosByListing: Record<string, string[]> = {};
    if (classifieds.length > 0) {
      const { data: photoRows } = await supabase
        .from("classified_photos")
        .select("classified_id,storage_path,sort_order")
        .in(
          "classified_id",
          classifieds.map((c) => c.id),
        )
        .order("sort_order", { ascending: true });

      const paths = (photoRows ?? []).map((p) => p.storage_path);
      if (paths.length > 0) {
        const { data: signed } = await supabase.storage
          .from("classifieds")
          .createSignedUrls(paths, 60 * 60);
        const urlByPath = new Map(
          (signed ?? []).map((s) => [s.path ?? "", s.signedUrl]),
        );
        photosByListing = (photoRows ?? []).reduce(
          (acc: Record<string, string[]>, row) => {
            const url = urlByPath.get(row.storage_path);
            if (!url) return acc;
            (acc[row.classified_id] ||= []).push(url);
            return acc;
          },
          {},
        );
      }
    }

    const body = {
      briefing: briefingRes.data ?? [],
      volunteering: volRes.data ?? [],
      classifieds: classifieds.map((c) => ({
        ...c,
        photos: photosByListing[c.id] ?? [],
      })),
    };

    return new Response(JSON.stringify(body), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    console.error("flyover-public error", e);
    return new Response(JSON.stringify({ error: "Failed to load" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

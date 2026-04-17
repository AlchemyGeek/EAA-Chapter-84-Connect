import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is officer/admin
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const email = userData.user.email ?? "";
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roleRows ?? []).some((r: any) => r.role === "admin");
    const { data: isOfficer } = await admin.rpc("is_officer", {
      _user_email: email,
    });
    if (!isAdmin && !isOfficer) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const newsletterId = body?.newsletter_id as string | undefined;
    if (!newsletterId) {
      return new Response(
        JSON.stringify({ error: "newsletter_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: row, error: rowErr } = await admin
      .from("newsletters")
      .select("id, storage_path")
      .eq("id", newsletterId)
      .single();
    if (rowErr || !row) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: file, error: dlErr } = await admin.storage
      .from("newsletters")
      .download(row.storage_path);
    if (dlErr || !file) {
      await admin
        .from("newsletters")
        .update({
          extraction_status: "failed",
          extraction_error: dlErr?.message ?? "download failed",
        })
        .eq("id", newsletterId);
      return new Response(
        JSON.stringify({ error: "download failed", details: dlErr?.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const buf = new Uint8Array(await file.arrayBuffer());
    let extracted = "";
    try {
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });
      extracted = Array.isArray(text) ? text.join("\n\n") : (text ?? "");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin
        .from("newsletters")
        .update({ extraction_status: "failed", extraction_error: msg })
        .eq("id", newsletterId);
      return new Response(JSON.stringify({ error: "extract failed", details: msg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("newsletters")
      .update({
        extracted_text: extracted,
        extraction_status: "done",
        extraction_error: null,
      })
      .eq("id", newsletterId);

    return new Response(
      JSON.stringify({ ok: true, chars: extracted.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function detectIssueDate(text: string): string | null {
  if (!text) return null;
  const head = text.slice(0, 5000);
  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  const monthRe = "(jan(?:uary|\\.)?|feb(?:ruary|\\.)?|mar(?:ch|\\.)?|apr(?:il|\\.)?|may|jun(?:e|\\.)?|jul(?:y|\\.)?|aug(?:ust|\\.)?|sep(?:tember|t|\\.)?|oct(?:ober|\\.)?|nov(?:ember|\\.)?|dec(?:ember|\\.)?)";
  const re = new RegExp(`\\b${monthRe}\\s*,?\\s+(?:(\\d{1,2})\\s*,\\s*)?(20\\d{2})\\b`, "gi");

  type Cand = { date: string; index: number; score: number };
  const candidates: Cand[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(head)) !== null) {
    const key = m[1].toLowerCase().replace(".", "").slice(0, 3);
    const monthIdx = months.findIndex((mo) => mo.startsWith(key));
    if (monthIdx < 0) continue;
    const day = m[2] ? Math.min(Math.max(parseInt(m[2], 10), 1), 28) : 1;
    const date = `${m[3]}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // Earlier in doc = better (likely masthead). Penalize references to prior meetings.
    let score = -m.index;
    const after = head.slice(m.index + m[0].length, m.index + m[0].length + 40).toLowerCase();
    if (/^\s*(meeting\s+minutes|minutes|meeting)\b/.test(after)) score -= 100000;
    const before = head.slice(Math.max(0, m.index - 20), m.index).toLowerCase();
    if (/(since|©|\(c\)|copyright|established|est\.|founded)\s*$/.test(before)) score -= 100000;

    candidates.push({ date, index: m.index, score });
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].date;
  }

  const ym = head.match(/\b(20\d{2})[\-/](0?[1-9]|1[0-2])\b/) ||
             head.match(/\b(0?[1-9]|1[0-2])[\-/](20\d{2})\b/);
  if (ym) {
    const [year, month] = ym[1].length === 4 ? [ym[1], ym[2]] : [ym[2], ym[1]];
    return `${year}-${month.padStart(2, "0")}-01`;
  }
  return null;
}

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

    // Try download up to 3 times — storage can return transient errors
    let file: Blob | null = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await admin.storage
        .from("newsletters")
        .download(row.storage_path);
      if (data && !error) {
        file = data;
        lastErr = null;
        break;
      }
      lastErr = error;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
    if (!file) {
      const errMsg =
        lastErr instanceof Error
          ? lastErr.message
          : (lastErr as { message?: string })?.message ??
            (lastErr ? JSON.stringify(lastErr, Object.getOwnPropertyNames(lastErr as object)) : "unknown") ??
            "download failed";
      const details = `path=${row.storage_path}; ${errMsg}`;
      await admin
        .from("newsletters")
        .update({ extraction_status: "failed", extraction_error: details })
        .eq("id", newsletterId);
      return new Response(
        JSON.stringify({ error: "download failed", details }),
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
      // Extract per-page so we keep page boundaries as paragraph breaks.
      const { text } = await extractText(pdf, { mergePages: false });
      const pages = Array.isArray(text) ? text : [text ?? ""];
      // Join pages with double newlines, then add a newline after sentence
      // terminators so Postgres ts_headline has fragment boundaries to work with.
      extracted = pages
        .map((p) => (p ?? "").replace(/([.!?])\s+(?=[A-Z0-9"'(\[])/g, "$1\n"))
        .join("\n\n");
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

    const detected = detectIssueDate(extracted);
    const updates: Record<string, unknown> = {
      extracted_text: extracted,
      extraction_status: "done",
      extraction_error: null,
    };
    if (detected) updates.issue_date = detected;

    await admin
      .from("newsletters")
      .update(updates)
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

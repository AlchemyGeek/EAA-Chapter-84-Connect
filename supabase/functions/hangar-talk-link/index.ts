// Handles Hangar Talk email links: View Thread (auto-login) and unsubscribe.
// Token validation uses HMAC; sessions are minted via Supabase admin.generateLink.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "../_shared/hangarTalkToken.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://eaa84connect.lovable.app";

function htmlPage(title: string, body: string): Response {
  const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;margin:0;padding:0;">
  <div style="max-width:520px;margin:60px auto;background:#ffffff;border-radius:8px;padding:32px 28px;text-align:center;border:1px solid #e5e7eb;">
    <div style="font-size:14px;color:#6b7280;margin-bottom:6px;">EAA Chapter 84 Connect</div>
    <h1 style="font-size:20px;color:#1e3a5f;margin:0 0 12px;">${title}</h1>
    <div style="font-size:15px;color:#374151;line-height:1.5;">${body}</div>
    <div style="margin-top:24px;">
      <a href="${APP_URL}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:6px;">Open Connect</a>
    </div>
  </div>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return htmlPage("Invalid link", "Missing token.");

    const secret = Deno.env.get("HANGAR_TALK_LINK_SECRET")!;
    const payload = await verifyToken(token, secret);
    if (!payload) {
      return htmlPage(
        "Link expired",
        "This link has expired or is invalid. Please sign in to Connect and continue from there.",
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    if (payload.a === "unsub-thread") {
      if (!payload.k || !payload.p) return htmlPage("Invalid link", "Missing details.");
      await admin
        .from("hangar_talk_subscriptions")
        .delete()
        .eq("key_id", payload.k)
        .eq("post_id", payload.p);
      return htmlPage(
        "Unsubscribed",
        "You won't get further digest emails about this thread. You can re-subscribe anytime from the thread in Connect.",
      );
    }

    if (payload.a === "unsub-all") {
      if (!payload.k) return htmlPage("Invalid link", "Missing details.");
      await admin
        .from("hangar_talk_subscriptions")
        .delete()
        .eq("key_id", payload.k);
      return htmlPage(
        "Unsubscribed",
        "All your Hangar Talk thread subscriptions have been removed. You can subscribe again to any thread from Connect.",
      );
    }

    if (payload.a === "view") {
      if (!payload.p || !payload.e) return htmlPage("Invalid link", "Missing details.");
      const redirectTo = `${APP_URL}/hangar-talk/${payload.p}`;
      const { data, error } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: payload.e,
        options: { redirectTo },
      });
      if (error || !data?.properties?.action_link) {
        // Fall back: send user to /auth, they can request OTP.
        return Response.redirect(`${APP_URL}/auth?next=${encodeURIComponent(`/hangar-talk/${payload.p}`)}`, 302);
      }
      return Response.redirect(data.properties.action_link, 302);
    }

    return htmlPage("Invalid link", "Unknown action.");
  } catch (error) {
    console.error("hangar-talk-link error:", error);
    return htmlPage("Something went wrong", "Please try again or open Connect directly.");
  }
});

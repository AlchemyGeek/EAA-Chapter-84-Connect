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

function unsubscribeRedirect(status: "success" | "invalid"): Response {
  return Response.redirect(`${APP_URL}/unsubscribe?source=hangar-talk&status=${status}`, 302);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return unsubscribeRedirect("invalid");

    const secret = Deno.env.get("HANGAR_TALK_LINK_SECRET")!;
    const payload = await verifyToken(token, secret);
    if (!payload) {
      return unsubscribeRedirect("invalid");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    if (payload.a === "unsub-thread") {
      if (!payload.k || !payload.p) return unsubscribeRedirect("invalid");
      await admin
        .from("hangar_talk_subscriptions")
        .delete()
        .eq("key_id", payload.k)
        .eq("post_id", payload.p);
      return unsubscribeRedirect("success");
    }

    if (payload.a === "unsub-all") {
      if (!payload.k) return unsubscribeRedirect("invalid");
      await admin
        .from("hangar_talk_subscriptions")
        .delete()
        .eq("key_id", payload.k);
      return unsubscribeRedirect("success");
    }

    if (payload.a === "view") {
      if (!payload.p || !payload.e) return unsubscribeRedirect("invalid");
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

    return unsubscribeRedirect("invalid");
  } catch (error) {
    console.error("hangar-talk-link error:", error);
    return unsubscribeRedirect("invalid");
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { WELCOME_HTML } from "../_shared/new-member-emails/welcome.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerEmail = userData.user.email ?? "";
    const callerId = userData.user.id;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    const { data: officerCheck } = await supabase.rpc("is_officer", {
      _user_email: callerEmail,
    });
    if (!isAdmin && !officerCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { application_id } = await req.json();
    if (!application_id) {
      return new Response(JSON.stringify({ error: "Missing application_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: app, error: appError } = await supabase
      .from("new_member_applications")
      .select("*")
      .eq("id", application_id)
      .maybeSingle();
    if (appError || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!app.fees_verified) {
      return new Response(JSON.stringify({ error: "Dues have not been verified yet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (app.welcome_sent_at) {
      return new Response(JSON.stringify({ error: "A welcome email has already been sent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipient = String(app.email || "").trim();
    if (!recipient) {
      return new Response(JSON.stringify({ error: "Applicant has no email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = "Welcome to EAA Chapter 84";
    const firstName = escapeHtml(String(app.first_name || "").trim() || "there");

    const htmlBody = WELCOME_HTML.replace(/\{\{first_name\}\}/g, firstName);
    const textBody = htmlBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    const messageId = crypto.randomUUID();

    const { data: existingToken } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", recipient)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const unsubscribeToken = existingToken?.token ?? crypto.randomUUID();
    if (!existingToken) {
      await supabase
        .from("email_unsubscribe_tokens")
        .insert({ email: recipient, token: unsubscribeToken });
    }

    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: recipient,
        cc: ["membership@eaa84.org"],
        from: "Membership <notify@notify.eaa84.org>",
        reply_to: "membership@eaa84.org",
        sender_domain: "notify.eaa84.org",
        subject,
        html: htmlBody,
        text: textBody,
        purpose: "transactional",
        label: "new_member_welcome",
        idempotency_key: `new-member-welcome-${application_id}`,
        unsubscribe_token: unsubscribeToken,
        message_id: messageId,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error("Failed to enqueue welcome:", enqueueError.message);
      return new Response(JSON.stringify({ error: "Failed to enqueue welcome" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("new_member_applications")
      .update({ welcome_sent_at: new Date().toISOString() })
      .eq("id", application_id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in new-member-welcome:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

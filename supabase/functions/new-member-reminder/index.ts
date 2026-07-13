import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { COMPLETE_MEMBERSHIP_HTML } from "../_shared/new-member-emails/complete-membership.ts";

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

function escapeHtmlAttr(str: string): string {
  return escapeHtml(str);
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

    if (app.fees_verified) {
      return new Response(JSON.stringify({ error: "Dues already paid for this applicant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (app.reminder_sent_at) {
      return new Response(JSON.stringify({ error: "A reminder has already been sent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve pro-rated fee (URL + amount) by quarter.
    const { data: fees } = await supabase
      .from("chapter_fees")
      .select("name, amount, payment_url")
      .order("sort_order");

    const quarterMatch = String(app.quarter_applied || "")
      .toUpperCase()
      .match(/Q[1-4]/);
    const quarter = quarterMatch ? quarterMatch[0] : "";

    let paymentUrl: string | null = null;
    let feeAmount: number | null = null;
    if (quarter && fees) {
      const match = fees.find((f: any) => {
        const upper = String(f.name || "").toUpperCase();
        return (
          upper.startsWith(quarter + " ") &&
          /(PRO-?RATED|NEW MEMBERSHIP)/.test(upper)
        );
      });
      paymentUrl = match?.payment_url ?? null;
      feeAmount = match?.amount != null ? Number(match.amount) : null;
    }
    // Fallback to the amount stored on the application if no chapter fee matched.
    if (feeAmount == null && app.fee_amount != null) {
      feeAmount = Number(app.fee_amount);
    }

    const recipient = String(app.email || "").trim();
    if (!recipient) {
      return new Response(JSON.stringify({ error: "Applicant has no email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = "Complete Your EAA Chapter 84 Membership";
    const firstName = escapeHtml(String(app.first_name || "").trim() || "there");
    const duesAmount = feeAmount && feeAmount > 0
      ? `$${feeAmount % 1 === 0 ? feeAmount.toFixed(0) : feeAmount.toFixed(2)}`
      : "your dues";

    // Personalize template
    let htmlBody = COMPLETE_MEMBERSHIP_HTML
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{dues_amount\}\}/g, escapeHtml(duesAmount));

    // Rewrite the CTA link to the resolved payment URL when available.
    if (paymentUrl) {
      htmlBody = htmlBody.replace(
        /href="https:\/\/eaa84connect\.lovable\.app\/join"/g,
        `href="${escapeHtmlAttr(paymentUrl)}"`,
      );
    }

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
        label: "new_member_dues_reminder",
        idempotency_key: `new-member-reminder-${application_id}`,
        unsubscribe_token: unsubscribeToken,
        message_id: messageId,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error("Failed to enqueue reminder:", enqueueError.message);
      return new Response(JSON.stringify({ error: "Failed to enqueue reminder" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("new_member_applications")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", application_id);

    return new Response(
      JSON.stringify({ success: true, paymentUrl, duesAmount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in new-member-reminder:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

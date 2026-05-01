import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Verify caller is an authenticated officer/admin
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

    // Check role: admin or officer
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

    // Load the application
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

    // Resolve payment URL by quarter
    const { data: fees } = await supabase
      .from("chapter_fees")
      .select("name, payment_url")
      .order("sort_order");

    const quarter = String(app.quarter_applied || "").toUpperCase();
    let paymentUrl: string | null = null;
    if (quarter && fees) {
      const match = fees.find((f: any) =>
        String(f.name || "").toUpperCase().includes(quarter)
      );
      paymentUrl = match?.payment_url ?? null;
    }
    if (!paymentUrl && fees) {
      const fallback = fees.find((f: any) =>
        /annual|renewal/i.test(String(f.name || ""))
      );
      paymentUrl = fallback?.payment_url ?? null;
    }

    const recipient = String(app.email || "").trim();
    if (!recipient) {
      return new Response(JSON.stringify({ error: "Applicant has no email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = "Complete Your Chapter 84 Membership";
    const safePaymentUrl = paymentUrl ? escapeHtml(paymentUrl) : null;

    const paymentBlock = safePaymentUrl
      ? `<p>When you’re ready, you can complete your membership by submitting your dues here:</p>
         <p><a href="${safePaymentUrl}" style="display:inline-block;background-color:#1e3a5f;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;">Pay Membership Dues</a></p>
         <p style="font-size:12px;color:#666;">Or copy this link: ${safePaymentUrl}</p>`
      : `<p>When you’re ready, please reach out to membership@eaa84.org and we’ll provide a payment link.</p>`;

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color:#222; line-height:1.5;">
  <p>Hi,</p>
  <p>Thank you for submitting your application to join EAA Chapter 84. We’re glad to see your interest in becoming part of the chapter.</p>
  <p>It looks like your membership application is still pending, as we have not yet received your dues payment. Once dues are completed, your membership will be activated and you’ll be able to fully participate in chapter activities and benefits.</p>
  <p>As a member, you’ll be part of an active aviation community with access to our monthly meetings (second Tuesday of each month at Harvey Field) featuring guest speakers on aircraft building, safety, and flying adventures. You’ll also have access to the chapter hangar and tool crib to support aircraft construction and maintenance, receive the chapter newsletter with updates and opportunities, and be able to participate in events and volunteer activities. In addition, our Member Portal helps you stay connected—manage your information, browse the member directory, and explore ways to get involved.</p>
  ${paymentBlock}
  <p>If you have any questions or need assistance, feel free to reply to this email or reach out to membership@eaa84.org.</p>
  <p>We hope to welcome you soon.</p>
  <p>Best regards,<br/>EAA Chapter 84 Membership</p>
</div>`.trim();

    const textBody = htmlBody.replace(/<[^>]+>/g, "").replace(/\n\s*\n/g, "\n\n");

    const messageId = crypto.randomUUID();

    // Get or create unsubscribe token
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

    // Mark reminder as sent
    await supabase
      .from("new_member_applications")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", application_id);

    return new Response(
      JSON.stringify({ success: true, paymentUrl }),
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

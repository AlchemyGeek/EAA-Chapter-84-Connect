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

    // Verify the caller is using the service_role key (internal/server-side only)
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKeyHeader = req.headers.get("apikey") ?? "";
    const providedKey = authHeader.replace("Bearer ", "") || apiKeyHeader;

    if (providedKey !== supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { first_name, last_name, eaa_number, email, city, state } = await req.json();

    if (!first_name || !last_name || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find Membership Coordinator(s) from chapter_leadership
    const { data: coordinators } = await supabase
      .from("chapter_leadership")
      .select("key_id")
      .eq("role", "Membership Coordinator");

    const coordinatorKeyIds = (coordinators ?? []).map((c: any) => c.key_id);

    if (coordinatorKeyIds.length === 0) {
      console.log("No Membership Coordinators assigned — skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No coordinators to notify", emailSent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get coordinator emails
    const { data: coordinatorMembers } = await supabase
      .from("roster_members")
      .select("email, first_name, last_name")
      .in("key_id", coordinatorKeyIds);

    const recipientEmails = (coordinatorMembers ?? [])
      .filter((c: any) => c.email)
      .map((c: any) => c.email!);

    if (recipientEmails.length === 0) {
      console.log("Membership Coordinators have no email addresses");
      return new Response(
        JSON.stringify({ success: true, message: "Coordinators have no emails", emailSent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Escape all user-controlled values before embedding in HTML
    const safeFirstName = escapeHtml(String(first_name));
    const safeLastName = escapeHtml(String(last_name));
    const safeApplicantName = `${safeFirstName} ${safeLastName}`.trim();
    const safeEmail = escapeHtml(String(email));
    const safeEaaNumber = escapeHtml(String(eaa_number || "Not provided"));
    const safeLocation = escapeHtml(
      [city, state].filter(Boolean).join(", ") || "Not provided"
    );

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e3a5f;">New Member Application Received</h2>
  <p>A new membership application has been submitted for <strong>EAA Chapter 84</strong>.</p>
  
  <div style="background-color: #f4f6f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <h3 style="margin-top: 0; color: #1e3a5f;">Applicant Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 4px 8px; color: #666;">Name:</td><td style="padding: 4px 8px;"><strong>${safeApplicantName}</strong></td></tr>
      <tr><td style="padding: 4px 8px; color: #666;">Email:</td><td style="padding: 4px 8px;">${safeEmail}</td></tr>
      <tr><td style="padding: 4px 8px; color: #666;">EAA #:</td><td style="padding: 4px 8px;">${safeEaaNumber}</td></tr>
      <tr><td style="padding: 4px 8px; color: #666;">Location:</td><td style="padding: 4px 8px;">${safeLocation}</td></tr>
    </table>
  </div>
  
  <p>Please log in to <a href="https://eaa84connect.lovable.app">Chapter 84 Connect</a> to review and process this application.</p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
  <p style="color: #999; font-size: 12px;">— Chapter 84 Connect</p>
</div>`.trim();

    // Use unescaped name for subject line (email subjects are plaintext, not HTML)
    const applicantName = `${first_name} ${last_name}`.trim();
    const subject = `New Member Application - ${applicantName}`;
    const messageId = crypto.randomUUID();
    let enqueued = 0;

    for (const recipient of recipientEmails) {
      const recipientMessageId = `${messageId}-${recipient}`;

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
          from: "EAA Chapter 84 <notify@notify.eaa84.org>",
          sender_domain: "notify.eaa84.org",
          subject,
          html: htmlBody,
          text: htmlBody.replace(/<[^>]+>/g, ""),
          purpose: "transactional",
          label: "new_member_application",
          idempotency_key: `new-member-notify-${messageId}-${recipient}`,
          unsubscribe_token: unsubscribeToken,
          message_id: recipientMessageId,
          queued_at: new Date().toISOString(),
        },
      });

      if (enqueueError) {
        console.error(`Failed to enqueue email to ${recipient}:`, enqueueError.message);
      } else {
        enqueued++;
        console.log(`Enqueued new member notification to ${recipient}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: enqueued > 0
          ? `${enqueued} coordinator(s) will be notified`
          : "Failed to enqueue notifications",
        emailSent: enqueued > 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in new-member-notify:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

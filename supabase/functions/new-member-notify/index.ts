import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ success: true, message: "Email not configured", emailSent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const applicantName = `${first_name} ${last_name}`.trim();
    const location = [city, state].filter(Boolean).join(", ") || "Not provided";

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e3a5f;">New Member Application Received</h2>
  <p>A new membership application has been submitted for <strong>EAA Chapter 84</strong>.</p>
  
  <div style="background-color: #f4f6f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <h3 style="margin-top: 0; color: #1e3a5f;">Applicant Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 4px 8px; color: #666;">Name:</td><td style="padding: 4px 8px;"><strong>${applicantName}</strong></td></tr>
      <tr><td style="padding: 4px 8px; color: #666;">Email:</td><td style="padding: 4px 8px;"><a href="mailto:${email}">${email}</a></td></tr>
      <tr><td style="padding: 4px 8px; color: #666;">EAA #:</td><td style="padding: 4px 8px;">${eaa_number || "Not provided"}</td></tr>
      <tr><td style="padding: 4px 8px; color: #666;">Location:</td><td style="padding: 4px 8px;">${location}</td></tr>
    </table>
  </div>
  
  <p>Please log in to <a href="https://eaa84connect.lovable.app">Chapter 84 Connect</a> to review and process this application.</p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
  <p style="color: #999; font-size: 12px;">— Chapter 84 Connect</p>
</div>`.trim();

    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Chapter 84 Connect <notify@notify.eaa84.org>",
          to: recipientEmails,
          subject: `New Member Application - ${applicantName}`,
          html: htmlBody,
        }),
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        console.error(`Resend API error [${resendRes.status}]:`, JSON.stringify(resendData));
        return new Response(
          JSON.stringify({ success: true, message: "Application saved, email failed", emailSent: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("New member notification sent to:", recipientEmails.join(", "), "id:", resendData.id);
      return new Response(
        JSON.stringify({ success: true, message: "Coordinators notified", emailSent: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (emailErr) {
      console.error("Failed to send notification:", emailErr);
      return new Response(
        JSON.stringify({ success: true, message: "Email send failed", emailSent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in new-member-notify:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

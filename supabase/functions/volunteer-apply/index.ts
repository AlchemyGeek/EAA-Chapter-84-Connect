import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FROM_ADDRESS = "Chapter 84 Connect <noreply@eaa84.org>";

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
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user via getUser
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = userData.user.id;
    const callerEmail = userData.user.email as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { opportunity_id, on_behalf_of_key_id } = await req.json();
    if (!opportunity_id) {
      return new Response(JSON.stringify({ error: "opportunity_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine the target member
    let member: any;

    if (on_behalf_of_key_id) {
      // Verify the caller is an admin
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: callerUserId,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Only admins can apply on behalf of others" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the target member by key_id
      const { data: targetMember } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, email, cell_phone, home_phone")
        .eq("key_id", on_behalf_of_key_id)
        .maybeSingle();

      if (!targetMember) {
        return new Response(JSON.stringify({ error: "Target member not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      member = targetMember;
    } else {
      // Get member record for the logged-in user
      const { data: selfMember } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, email, cell_phone, home_phone")
        .eq("email", callerEmail)
        .maybeSingle();

      if (!selfMember) {
        return new Response(JSON.stringify({ error: "Member record not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      member = selfMember;
    }

    // Get opportunity
    const { data: opportunity } = await supabase
      .from("volunteering_opportunities")
      .select("*")
      .eq("id", opportunity_id)
      .single();

    if (!opportunity) {
      return new Response(JSON.stringify({ error: "Opportunity not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert application
    const memberName = `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim();
    const { error: insertError } = await supabase
      .from("volunteering_applications")
      .insert({
        opportunity_id,
        key_id: member.key_id,
        member_name: memberName,
        member_email: member.email,
        member_phone: member.cell_phone || member.home_phone,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ error: on_behalf_of_key_id
            ? "This member has already applied to this opportunity"
            : "You have already applied to this opportunity" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw insertError;
    }

    // Get contact members for this opportunity
    const { data: contacts } = await supabase
      .from("volunteering_opportunity_contacts")
      .select("key_id")
      .eq("opportunity_id", opportunity_id);

    const contactKeyIds = (contacts ?? []).map((c: any) => c.key_id);
    let emailSent = false;

    if (contactKeyIds.length > 0) {
      const { data: contactMembers } = await supabase
        .from("roster_members")
        .select("email, first_name, last_name")
        .in("key_id", contactKeyIds);

      const contactEmails = (contactMembers ?? [])
        .filter((c: any) => c.email)
        .map((c: any) => c.email!);

      if (contactEmails.length > 0) {
          const resendApiKey = Deno.env.get("RESEND_API_KEY");
          if (!resendApiKey) {
            console.error("RESEND_API_KEY is not configured");
          } else {
            const phone = member.cell_phone || member.home_phone || "Not provided";

            const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e3a5f;">New Volunteer Application</h2>
  <p>A new volunteer has applied for <strong>"${opportunity.title}"</strong>.</p>
  
  <div style="background-color: #f4f6f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <h3 style="margin-top: 0; color: #1e3a5f;">Volunteer Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 4px 8px; color: #666;">Name:</td><td style="padding: 4px 8px;"><strong>${memberName}</strong></td></tr>
      <tr><td style="padding: 4px 8px; color: #666;">Email:</td><td style="padding: 4px 8px;"><a href="mailto:${member.email ?? ""}">${member.email ?? "Not provided"}</a></td></tr>
      <tr><td style="padding: 4px 8px; color: #666;">Phone:</td><td style="padding: 4px 8px;">${phone}</td></tr>
    </table>
  </div>
  
  <p>Please reach out to coordinate this volunteering opportunity.</p>
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
                  from: FROM_ADDRESS,
                  to: contactEmails,
                  subject: `New Volunteer Application - ${opportunity.title}`,
                  html: htmlBody,
                }),
              });

              const resendData = await resendRes.json();
              if (!resendRes.ok) {
                console.error(`Resend API error [${resendRes.status}]:`, JSON.stringify(resendData));
              } else {
                emailSent = true;
                console.log("Email sent successfully via Resend:", resendData.id);
              }
            } catch (emailErr) {
              console.error("Failed to send email via Resend:", emailErr);
            }
          }
      }
    }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: emailSent
          ? "Application submitted and contacts notified via email"
          : "Application submitted successfully",
        emailSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in volunteer-apply:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

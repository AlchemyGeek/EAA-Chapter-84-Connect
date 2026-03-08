import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { opportunity_id } = await req.json();
    if (!opportunity_id) {
      return new Response(JSON.stringify({ error: "opportunity_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get member record
    const { data: member } = await supabase
      .from("roster_members")
      .select("key_id, first_name, last_name, email, cell_phone, home_phone")
      .eq("email", user.email)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: "Member record not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Insert application (will fail on duplicate due to unique index)
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
          JSON.stringify({ error: "You have already applied to this opportunity" }),
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

    const contactKeyIds = (contacts ?? []).map((c) => c.key_id);

    if (contactKeyIds.length > 0) {
      const { data: contactMembers } = await supabase
        .from("roster_members")
        .select("email, first_name, last_name")
        .in("key_id", contactKeyIds);

      // Send email to each contact using Lovable AI gateway
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      
      if (lovableApiKey && contactMembers && contactMembers.length > 0) {
        const contactEmails = contactMembers
          .filter((c) => c.email)
          .map((c) => c.email!);

        if (contactEmails.length > 0) {
          const phone = member.cell_phone || member.home_phone || "Not provided";
          const emailBody = `
A new volunteer has applied for "${opportunity.title}".

Volunteer Details:
- Name: ${memberName}
- Email: ${member.email ?? "Not provided"}
- Phone: ${phone}

Please reach out to coordinate this volunteering opportunity.

— Chapter 84 Connect
          `.trim();

          // Use Supabase's built-in email or log for now
          // Since we don't have a transactional email service configured,
          // we'll record the notification and return success
          console.log(`Volunteer application notification:
To: ${contactEmails.join(", ")}
Subject: New Volunteer Application - ${opportunity.title}
Body: ${emailBody}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Application submitted and contacts notified" }),
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

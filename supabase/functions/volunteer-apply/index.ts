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
    let queuedEmailCount = 0;

    if (contactKeyIds.length > 0) {
      const { data: contactMembers } = await supabase
        .from("roster_members")
        .select("email, first_name, last_name")
        .in("key_id", contactKeyIds);

      const contactEmails = (contactMembers ?? [])
        .filter((c: any) => c.email)
        .map((c: any) => c.email!);

      if (contactEmails.length > 0) {
        const phone = member.cell_phone || member.home_phone || "Not provided";

        // Send one notification per contact via the transactional email system
        for (const contactEmail of contactEmails) {
          try {
            const { data: emailResponse, error: emailInvokeError } = await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "volunteer-application-notification",
                recipientEmail: contactEmail,
                idempotencyKey: `volunteer-apply-${opportunity_id}-${member.key_id}-${contactEmail}`,
                templateData: {
                  opportunityTitle: opportunity.title,
                  memberName: memberName,
                  memberEmail: member.email ?? undefined,
                  memberPhone: phone,
                },
              },
              headers: {
                Authorization: `Bearer ${supabaseServiceKey}`,
                apikey: supabaseServiceKey,
              },
            });

            if (emailInvokeError) {
              console.error(`Failed to queue volunteer notification for ${contactEmail}:`, emailInvokeError);
              continue;
            }

            if (emailResponse?.error || emailResponse?.success === false || !emailResponse?.queued) {
              console.error(`Volunteer notification was not accepted for ${contactEmail}:`, emailResponse);
              continue;
            }

            queuedEmailCount += 1;
            console.log(`Volunteer notification queued for ${contactEmail}`);
          } catch (emailErr) {
            console.error(`Failed to queue volunteer notification for ${contactEmail}:`, emailErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: queuedEmailCount > 0
          ? "Application submitted and contacts notified via email"
          : "Application submitted, but contact notification email could not be queued",
        emailSent: queuedEmailCount > 0,
        queuedEmailCount,
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

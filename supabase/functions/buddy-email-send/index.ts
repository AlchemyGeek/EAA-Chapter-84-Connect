import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify caller is authenticated and has officer/admin role (or is service_role from cron)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if this is a service_role call (from cron/internal)
    const isServiceRole = token === supabaseServiceKey

    if (!isServiceRole) {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const userId = claimsData.claims.sub as string

      // Check officer or admin role
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
      const rosterLookup = await supabase.from('roster_members').select('key_id').ilike('email', claimsData.claims.email as string).limit(1).maybeSingle()
      const { data: isOfficerRow } = await supabase
        .from('chapter_leadership')
        .select('id')
        .eq('key_id', rosterLookup.data?.key_id ?? -1)
        .limit(1)
        .maybeSingle()

      if (!isAdmin && !isOfficerRow) {
        return new Response(JSON.stringify({ error: 'Forbidden: officer or admin role required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const supabase = adminClient

    const { assignment_id, email_type } = await req.json()
    if (!assignment_id || !email_type) {
      return new Response(JSON.stringify({ error: 'assignment_id and email_type required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['intro', 'reminder'].includes(email_type)) {
      return new Response(JSON.stringify({ error: 'email_type must be intro or reminder' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if already sent
    const { data: existingLog } = await supabase
      .from('buddy_email_log')
      .select('id')
      .eq('assignment_id', assignment_id)
      .eq('email_type', email_type)
      .limit(1)

    if (existingLog && existingLog.length > 0) {
      return new Response(JSON.stringify({ message: `${email_type} email already sent` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get assignment
    const { data: assignment, error: assignErr } = await supabase
      .from('buddy_assignments')
      .select('id, volunteer_key_id, application_id')
      .eq('id', assignment_id)
      .single()

    if (assignErr || !assignment) {
      return new Response(JSON.stringify({ error: 'Assignment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get new member info from application
    const { data: app } = await supabase
      .from('new_member_applications')
      .select('first_name, last_name, email')
      .eq('id', assignment.application_id)
      .single()

    if (!app) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get buddy info from roster
    const { data: buddy } = await supabase
      .from('roster_members')
      .select('first_name, last_name, email')
      .eq('key_id', assignment.volunteer_key_id)
      .single()

    if (!buddy) {
      return new Response(JSON.stringify({ error: 'Buddy volunteer not found in roster' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get template
    const { data: template } = await supabase
      .from('buddy_email_templates')
      .select('subject, body')
      .eq('template_key', email_type)
      .single()

    if (!template) {
      return new Response(JSON.stringify({ error: `Template '${email_type}' not found` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Replace placeholders
    const newMemberName = app.first_name || 'New Member'
    const buddyName = buddy.first_name || 'Buddy'
    const processedSubject = template.subject
      .replace(/\[NewMemberName\]/g, newMemberName)
      .replace(/\[BuddyName\]/g, buddyName)
    const processedBody = template.body
      .replace(/\[NewMemberName\]/g, newMemberName)
      .replace(/\[BuddyName\]/g, buddyName)

    // Test phase: add intended recipients as first line, send to membership@eaa84.org
    const intendedTo = [app.email, buddy.email].filter(Boolean).join(', ')
    const testBody = `To: ${intendedTo}\nCC: membership@eaa84.org\n\n${processedBody}`

    // Convert plain text to simple HTML
    const htmlBody = testBody.replace(/\n/g, '<br>')

    // Generate a unique message ID for idempotency
    const messageId = crypto.randomUUID()
    const testRecipient = 'stathis@gmail.com'

    const { data: existingUnsubscribeToken, error: tokenLookupError } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', testRecipient)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (tokenLookupError) {
      throw new Error(`Failed to load unsubscribe token: ${tokenLookupError.message}`)
    }

    const unsubscribeToken = existingUnsubscribeToken?.token ?? crypto.randomUUID()

    if (!existingUnsubscribeToken) {
      const { error: tokenInsertError } = await supabase
        .from('email_unsubscribe_tokens')
        .insert({ email: testRecipient, token: unsubscribeToken })

      if (tokenInsertError) {
        throw new Error(`Failed to create unsubscribe token: ${tokenInsertError.message}`)
      }
    }

    // Enqueue via the transactional email queue
    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        to: testRecipient,
        from: 'EAA Chapter 84 <notify@notify.eaa84.org>',
        sender_domain: 'notify.eaa84.org',
        subject: processedSubject,
        html: htmlBody,
        text: testBody,
        purpose: 'transactional',
        label: `buddy_${email_type}`,
        idempotency_key: `buddy-${assignment_id}-${email_type}`,
        unsubscribe_token: unsubscribeToken,
        message_id: messageId,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      throw new Error(`Failed to enqueue email: ${enqueueError.message}`)
    }

    // Log the send
    await supabase
      .from('buddy_email_log')
      .insert({ assignment_id, email_type })

    return new Response(JSON.stringify({ success: true, email_type }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('buddy-email-send error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

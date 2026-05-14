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

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Accept service role key directly (from cron/internal calls)
    const isServiceRole = token === supabaseServiceKey

    if (!isServiceRole) {
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user }, error: userError } = await anonClient.auth.getUser()
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check officer or admin role
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
      const rosterLookup = await supabase.from('roster_members').select('key_id').ilike('email', user.email ?? '').limit(1).maybeSingle()
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

    const { assignment_id, email_type } = await req.json()
    if (!assignment_id || !email_type) {
      return new Response(JSON.stringify({ error: 'assignment_id and email_type required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['intro', 'check_in'].includes(email_type)) {
      return new Response(JSON.stringify({ error: 'email_type must be intro or check_in' }), {
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
    const baseProcessedBody = template.body
      .replace(/\[NewMemberName\]/g, newMemberName)
      .replace(/\[BuddyName\]/g, buddyName)

    // Build recipient list: new member + buddy volunteer + membership archive
    // NOTE: The email queue dispatcher does not forward `cc`, so we send to
    // membership@eaa84.org as a direct recipient to ensure they receive a copy.
    const recipients = [app.email, buddy.email, 'membership@eaa84.org'].filter(Boolean) as string[]
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid recipient emails found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Append a contact block so participants can reply directly to each other.
    // The queue dispatcher sends one email per recipient (no shared To/Cc),
    // so we must surface both email addresses in the body itself.
    const newMemberFullName = [app.first_name, app.last_name].filter(Boolean).join(' ') || 'New Member'
    const buddyFullName = [buddy.first_name, buddy.last_name].filter(Boolean).join(' ') || 'Buddy'
    const contactTextLines = [
      '',
      '---',
      'Contact information:',
      app.email ? `  • ${newMemberFullName} (new member): ${app.email}` : null,
      buddy.email ? `  • ${buddyFullName} (buddy): ${buddy.email}` : null,
      'Reply directly to the other party to coordinate.',
    ].filter(Boolean).join('\n')
    const processedBody = `${baseProcessedBody}\n${contactTextLines}`

    const contactHtml =
      `<hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;" />` +
      `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;">` +
      `<strong>Contact information:</strong><br>` +
      (app.email ? `${newMemberFullName} (new member): <a href="mailto:${app.email}">${app.email}</a><br>` : '') +
      (buddy.email ? `${buddyFullName} (buddy): <a href="mailto:${buddy.email}">${buddy.email}</a><br>` : '') +
      `<span style="color:#666;">Reply directly to the other party to coordinate.</span>` +
      `</div>`

    // Convert plain text body to simple HTML, then append contact block
    const htmlBody = baseProcessedBody.replace(/\n/g, '<br>') + contactHtml

    // Generate a unique message ID for idempotency
    const messageId = crypto.randomUUID()

    // Send to each recipient individually (required by transactional email queue)
    for (const recipient of recipients) {
      const recipientMessageId = `${messageId}-${recipient}`

      const { data: existingUnsubscribeToken } = await supabase
        .from('email_unsubscribe_tokens')
        .select('token')
        .eq('email', recipient)
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const unsubscribeToken = existingUnsubscribeToken?.token ?? crypto.randomUUID()

      if (!existingUnsubscribeToken) {
        await supabase
          .from('email_unsubscribe_tokens')
          .insert({ email: recipient, token: unsubscribeToken })
      }

      const { error: enqueueError } = await supabase.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          to: recipient,
          from: 'EAA Chapter 84 <notify@notify.eaa84.org>',
          sender_domain: 'notify.eaa84.org',
          subject: processedSubject,
          html: htmlBody,
          text: processedBody,
          purpose: 'transactional',
          label: `buddy_${email_type}`,
          idempotency_key: `buddy-${assignment_id}-${email_type}-${recipientMessageId}`,
          unsubscribe_token: unsubscribeToken,
          message_id: recipientMessageId,
          queued_at: new Date().toISOString(),
        },
      })

      if (enqueueError) {
        throw new Error(`Failed to enqueue email to ${recipient}: ${enqueueError.message}`)
      }
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

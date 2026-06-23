import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function htmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    // Idempotency: already sent?
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

    const newMemberName = app.first_name || 'New Member'
    const buddyName = buddy.first_name || 'Buddy'
    const newMemberEmail = (app.email || '').trim()
    const buddyEmail = (buddy.email || '').trim()

    if (!newMemberEmail || !buddyEmail) {
      return new Response(JSON.stringify({ error: 'Missing buddy or new member email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const applyPlaceholders = (s: string, escape: boolean) => {
      const v = (x: string) => (escape ? htmlEscape(x) : x)
      return s
        .replace(/\[NewMemberName\]/g, v(newMemberName))
        .replace(/\[BuddyName\]/g, v(buddyName))
        .replace(/\[NewMemberEmail\]/g, v(newMemberEmail))
        .replace(/\[BuddyEmail\]/g, v(buddyEmail))
    }
    const processedSubject = applyPlaceholders(template.subject, false)
    const baseProcessedBody = applyPlaceholders(template.body, true)
    const plainTextBody = applyPlaceholders(template.body, false)

    let htmlBody = baseProcessedBody.replace(/\n/g, '<br>')
    htmlBody = htmlBody.split(htmlEscape(newMemberEmail)).join(
      `<a href="mailto:${htmlEscape(newMemberEmail)}">${htmlEscape(newMemberEmail)}</a>`
    )
    htmlBody = htmlBody.split(htmlEscape(buddyEmail)).join(
      `<a href="mailto:${htmlEscape(buddyEmail)}">${htmlEscape(buddyEmail)}</a>`
    )

    // Send via Resend: one email To: [buddy, new member], BCC: membership@
    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EAA Chapter 84 <noreply@connect.eaa84.org>',
        to: [newMemberEmail, buddyEmail],
        bcc: ['membership@eaa84.org'],
        reply_to: [newMemberEmail, buddyEmail],
        subject: processedSubject,
        html: htmlBody,
        text: plainTextBody,
        headers: { 'X-Entity-Ref-ID': `buddy-${assignment_id}-${email_type}` },
        tags: [{ name: 'category', value: `buddy_${email_type}` }],
      }),
    })

    const resendBody = await resendResp.json().catch(() => ({}))
    if (!resendResp.ok) {
      console.error('Resend send failed', resendResp.status, resendBody)
      return new Response(JSON.stringify({ error: 'Resend send failed', details: resendBody }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase
      .from('buddy_email_log')
      .insert({ assignment_id, email_type })

    return new Response(JSON.stringify({ success: true, email_type, message_id: resendBody?.id }), {
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

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
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EAA Chapter 84 <notify@notify.eaa84.org>',
        to: ['membership@eaa84.org'],
        subject: processedSubject,
        text: testBody,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Resend API error [${res.status}]: ${errBody}`)
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

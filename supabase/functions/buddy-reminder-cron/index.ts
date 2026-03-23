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

    // Verify caller is authenticated (service role from cron or officer/admin)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = claimsData.claims.sub as string
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: isAdmin } = await adminClient.rpc('has_role', { _user_id: userId, _role: 'admin' })
    const { data: isOfficerRow } = await adminClient
      .from('chapter_leadership')
      .select('id')
      .eq('key_id', (await adminClient.from('roster_members').select('key_id').ilike('email', claimsData.claims.email as string).limit(1).single()).data?.key_id ?? -1)
      .limit(1)
      .maybeSingle()

    if (!isAdmin && !isOfficerRow) {
      return new Response(JSON.stringify({ error: 'Forbidden: officer or admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = adminClient

    // Find assignments where intro was sent 3+ days ago but no reminder sent
    const { data: introLogs, error: logErr } = await supabase
      .from('buddy_email_log')
      .select('assignment_id, sent_at')
      .eq('email_type', 'intro')

    if (logErr) throw logErr

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    const eligibleIntros = (introLogs || []).filter(
      (log) => new Date(log.sent_at) <= threeDaysAgo
    )

    if (eligibleIntros.length === 0) {
      return new Response(JSON.stringify({ message: 'No reminders to send', count: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check which already have reminders
    const assignmentIds = eligibleIntros.map((l) => l.assignment_id)
    const { data: reminderLogs } = await supabase
      .from('buddy_email_log')
      .select('assignment_id')
      .eq('email_type', 'reminder')
      .in('assignment_id', assignmentIds)

    const alreadySent = new Set((reminderLogs || []).map((r) => r.assignment_id))
    const pendingIds = assignmentIds.filter((id) => !alreadySent.has(id))

    let sentCount = 0
    for (const assignmentId of pendingIds) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/buddy-email-send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assignment_id: assignmentId, email_type: 'reminder' }),
        })
        if (res.ok) sentCount++
        else console.error(`Failed to send reminder for ${assignmentId}:`, await res.text())
      } catch (e) {
        console.error(`Error sending reminder for ${assignmentId}:`, e)
      }
    }

    return new Response(JSON.stringify({ message: 'Reminders processed', sent: sentCount, pending: pendingIds.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('buddy-reminder-cron error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

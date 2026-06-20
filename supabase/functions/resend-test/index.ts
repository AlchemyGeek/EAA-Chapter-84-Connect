// Temporary diagnostic function — sends one test email via Resend.
// Safe to delete once verified.
const RESEND_URL = 'https://api.resend.com/emails';

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'missing RESEND_API_KEY' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  let from = 'EAA Chapter 84 <noreply@eaa84.org>';
  let to: string[] = ['stathis@gmail.com', 'stathis67@hotmail.com'];
  let bcc: string[] = ['membership@eaa84.org'];
  try {
    const body = await req.json();
    if (body?.from) from = body.from;
    if (Array.isArray(body?.to)) to = body.to;
    if (Array.isArray(body?.bcc)) bcc = body.bcc;
  } catch (_) { /* allow empty body */ }

  const payload = {
    from,
    to,
    bcc,
    subject: 'Chapter 84 Connect — Resend integration test',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#1e3a5f">Resend test</h2>
      <p>This is a test of the new Resend email path for EAA Chapter 84 Connect.</p>
      <p>If you can see this, multi-recipient <code>To:</code> and <code>Bcc:</code> are working.</p>
      <p style="color:#666;font-size:12px">Sent ${new Date().toISOString()}</p>
    </div>`,
    text: 'Resend test — if you see this, multi-recipient To and Bcc are working.',
  };

  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': RESEND_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  return new Response(JSON.stringify({ status: res.status, response: text, sent: payload }, null, 2), {
    status: res.ok ? 200 : 500,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});

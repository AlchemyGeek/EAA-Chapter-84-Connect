Deno.serve(async () => {
  const key = Deno.env.get('RESEND_API_KEY')!;
  const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } });
  return new Response(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json' } });
});

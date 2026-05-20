export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const body = req.body || {};

    if (body.action === 'register') {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': process.env.SUPABASE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ name: body.name, referral_code: body.referral_code || null })
        }).catch(() => {});
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (body.action === 'mark_paid') {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(body.email)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': process.env.SUPABASE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_KEY}` },
          body: JSON.stringify({ has_paid: true })
        }).catch(() => {});
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (body.prompt) {
      const GROQ_KEY = process.env.GROQ_KEY;
      if (!GROQ_KEY) { res.status(500).json({ error: { message: 'GROQ_KEY not configured' } }); return; }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a travel data API. Return ONLY raw JSON arrays. Never add markdown, code fences, or any text outside the JSON. Start directly with [ and end with ].' },
            { role: 'user', content: body.prompt }
          ],
          max_tokens: 3000,
          temperature: 0.5
        })
      });

      const data = await response.json();
      if (!response.ok) { res.status(200).json({ error: data.error || { message: 'Groq error' } }); return; }
      res.status(200).json(data);
      return;
    }

    res.status(400).json({ error: { message: 'No action or prompt provided' } });

  } catch (err) {
    res.status(500).json({ error: { message: err.message || 'Server error' } });
  }
}

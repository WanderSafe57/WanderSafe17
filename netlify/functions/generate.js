exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const body = JSON.parse(event.body);

    // ── SAVE NEW USER TO SUPABASE ──────────────────────
    if (body.action === 'register') {
      const { name, email } = body;
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ name, email })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // ── MARK USER AS PAID ──────────────────────────────
    if (body.action === 'mark_paid') {
      await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/users?email=eq.${body.email}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_KEY}`
          },
          body: JSON.stringify({ has_paid: true })
        }
      );
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // ── AI GENERATE ────────────────────────────────────
    if (body.prompt) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a travel expert. Always respond with valid JSON only. No markdown, no explanation, just the JSON.'
            },
            { role: 'user', content: body.prompt }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

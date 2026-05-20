exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    // ── REGISTER USER ──────────────────────────────
    if (body.action === 'register') {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            name: body.name,
            referral_code: body.referral_code || null
          })
        }).catch(() => {}); // Don't fail if Supabase not configured
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // ── MARK PAID ──────────────────────────────────
    if (body.action === 'mark_paid') {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        await fetch(
          `${process.env.SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(body.email)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_KEY}`
            },
            body: JSON.stringify({ has_paid: true })
          }
        ).catch(() => {});
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // ── AI GENERATE ────────────────────────────────
    if (body.prompt) {
      const GROQ_KEY = process.env.GROQ_KEY;
      if (!GROQ_KEY) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: { message: 'GROQ_KEY not set in Netlify environment variables.' } })
        };
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a travel data API. You ONLY return raw JSON arrays or objects. Never return markdown, code fences, explanations or any text outside the JSON. Your response must start with [ and end with ].'
            },
            {
              role: 'user',
              content: body.prompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.5
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            error: data.error || { message: 'Groq API error: ' + response.status }
          })
        };
      }

      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: { message: 'No action or prompt provided' } })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: { message: err.message || 'Internal server error' } })
    };
  }
};

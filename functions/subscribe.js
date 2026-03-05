export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': 'https://komilab.org',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();

    // Validation email basique
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email invalide.' }), { status: 400, headers });
    }

    // Appel API MailerLite
    const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MAILERLITE_API_KEY}`,
      },
      body: JSON.stringify({
        email: email,
        groups: [env.MAILERLITE_GROUP_ID],
      }),
    });

    const data = await res.json();

    if (res.ok || res.status === 200 || res.status === 201) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    // Déjà abonné
    if (res.status === 409 || (data.message && data.message.includes('already'))) {
      return new Response(JSON.stringify({ error: 'Cet email est déjà abonné.' }), { status: 409, headers });
    }

    return new Response(JSON.stringify({ error: 'Erreur MailerLite.' }), { status: 500, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), { status: 500, headers });
  }
}

// Preflight CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://komilab.org',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

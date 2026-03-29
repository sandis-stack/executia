export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html } = req.body;

  if (!to || !to.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_G7juX3rC_6zCQrBFZYi9PdRvFaXPgk4VB',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'EXECUTIA <onboarding@resend.dev>',
        to,
        subject: subject || 'EXECUTIA // EXECUTION REQUEST RECEIVED',
        html
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

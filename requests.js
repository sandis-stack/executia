export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  const adminKey = process.env.ADMIN_KEY;

  // Simple auth check
  if (req.headers["x-admin-key"] !== adminKey) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }

  if (req.method === "GET") {
    const r = await fetch(`${url}/rest/v1/executia_requests?select=*&order=created_at.desc`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    });
    const data = await r.json();
    return res.json(data);
  }

  if (req.method === "POST") {
    const { id, status } = req.body;
    await fetch(`${url}/rest/v1/executia_requests?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "apikey": key, "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json", "Prefer": "return=minimal"
      },
      body: JSON.stringify({ status })
    });
    return res.json({ ok: true });
  }

  res.status(405).end();
}

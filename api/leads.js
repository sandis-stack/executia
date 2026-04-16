// /api/leads.js
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  try {
    const accessKey = req.headers["x-dashboard-key"];
    if (!process.env.DASHBOARD_ACCESS_KEY || accessKey !== process.env.DASHBOARD_ACCESS_KEY) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const baseUrl    = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!baseUrl || !serviceKey) return res.status(500).json({ error: "SUPABASE_ENV_MISSING" });
    const response = await fetch(
      `${baseUrl}/rest/v1/leads?select=*&order=created_at.desc`,
      { method: "GET", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" } }
    );
    const raw = await response.text();
    if (!response.ok) return res.status(response.status).json({ error: raw });
    return res.status(200).json(JSON.parse(raw));
  } catch (e) {
    return res.status(500).json({ error: e.message || "SERVER_ERROR" });
  }
}

// /api/lead-detail.js

function mapLeadActivity(item) {
  const payload = item?.payload || {};
  return {
    source: "lead_activity",
    event: item.event_type || item.activity_type || "SYSTEM_EVENT",
    created_at: item.created_at || null,
    actor: payload.actor || "SYSTEM",
    note: payload.note || payload.error || payload.subject || payload.email || null,
    meta: payload,
    raw: item,
  };
}

function mapOperatorActivity(item) {
  let note = item.note || null;
  if (!note && (item.old_status || item.new_status)) {
    note = `Status: ${item.old_status || "—"} → ${item.new_status || "—"}`;
  }
  return {
    source: "operator_activity",
    event: item.event_type || "OPERATOR_EVENT",
    created_at: item.created_at || null,
    actor: item.actor || "EXECUTIA_OPERATOR",
    note,
    old_status: item.old_status || null,
    new_status: item.new_status || null,
    meta: null,
    raw: item,
  };
}

function sortTimeline(items) {
  return [...items].sort((a, b) => {
    const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return aTime - bTime;
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const accessKey = req.headers["x-dashboard-key"];
  if (!process.env.DASHBOARD_ACCESS_KEY || accessKey !== process.env.DASHBOARD_ACCESS_KEY) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }

  const executionId = req.query.executionId;
  if (!executionId) return res.status(400).json({ error: "MISSING_EXECUTION_ID" });

  const baseUrl    = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) return res.status(500).json({ error: "SUPABASE_ENV_MISSING" });

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

  try {
    // 1. Load lead by execution_id
    const leadRes = await fetch(
      `${baseUrl}/rest/v1/leads?execution_id=eq.${encodeURIComponent(executionId)}&select=*`,
      { method: "GET", headers }
    );
    const leadRaw = await leadRes.text();
    if (!leadRes.ok) return res.status(leadRes.status).json({ error: leadRaw });
    const lead = JSON.parse(leadRaw)[0] || null;
    if (!lead) return res.status(404).json({ error: "LEAD_NOT_FOUND" });

    // 2. Load lead_activity by lead.id
    const laRes  = await fetch(
      `${baseUrl}/rest/v1/lead_activity?lead_id=eq.${lead.id}&select=*&order=created_at.asc`,
      { method: "GET", headers }
    );
    const leadActivity = laRes.ok ? (JSON.parse(await laRes.text()) || []) : [];

    // 3. Load operator_activity by execution_id
    const oaRes = await fetch(
      `${baseUrl}/rest/v1/operator_activity?execution_id=eq.${encodeURIComponent(executionId)}&select=*&order=created_at.asc`,
      { method: "GET", headers }
    );
    const operatorActivity = oaRes.ok ? (JSON.parse(await oaRes.text()) || []) : [];

    // 4. Normalize + merge + sort
    const timeline = sortTimeline([
      ...leadActivity.map(mapLeadActivity),
      ...operatorActivity.map(mapOperatorActivity),
    ]);

    return res.status(200).json({ lead, timeline, leadActivity, operatorActivity });
  } catch (e) {
    return res.status(500).json({ error: e.message || "SERVER_ERROR" });
  }
}

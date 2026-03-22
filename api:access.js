const FREE_DOMAINS = [
  "gmail.com","yahoo.com","hotmail.com","outlook.com",
  "icloud.com","mail.com","protonmail.com","aol.com","live.com"
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://executia.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { organization, country, role, email, message } = req.body || {};

  if (!email || !organization) {
    return res.status(400).json({ status: "REJECTED", reason: "INCOMPLETE_SUBMISSION" });
  }

  const domain = (email.split("@")[1] || "").toLowerCase().trim();

  // Free email → instant reject
  if (FREE_DOMAINS.includes(domain)) {
    await log({ organization, country, role, email, message, domain, score: 0, status: "REJECTED" });
    return res.json({ status: "REJECTED", reason: "NON_INSTITUTIONAL_DOMAIN" });
  }

  let score = 0;

  // Domain trust level
  if (domain.endsWith(".gov") || domain.endsWith(".mil") || domain.endsWith(".int")) {
    score += 50;
  } else if (domain.endsWith(".org") || domain.endsWith(".edu")) {
    score += 30;
  } else {
    score += 20;
  }

  // Organization signal
  if (organization?.trim().length > 3) score += 10;

  // Role signal
  if (/director|head|minister|lead|chief|secretary|officer|president|ceo|cto/i.test(role || "")) {
    score += 20;
  }

  // Message depth
  if ((message || "").trim().length > 20) score += 10;

  const status = score >= 70 ? "ACCEPTED" : score >= 40 ? "UNDER_REVIEW" : "REJECTED";

  // Save to Supabase if configured
  await log({ organization, country, role, email, message, domain, score, status });

  return res.json({ status, score });
}

async function log(data) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return; // skip if not configured yet

  try {
    await fetch(`${url}/rest/v1/executia_requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(data)
    });
  } catch (e) {
    // silent fail — don't block response
  }
}

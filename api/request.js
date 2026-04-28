function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

function cleanText(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) return { skipped: true };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || "EXECUTIA <no-reply@executia.io>",
      to,
      subject,
      html
    })
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("RESEND_EMAIL_FAILED:", text);
    return { ok: false, error: text };
  }

  return { ok: true };
}

async function forwardToEngine(payload) {
  const url =
    process.env.ENGINE_CONTROL_REQUEST_URL ||
    "https://execution.executia.io/api/v1/control-request";

  const token = process.env.ENGINE_REQUEST_TOKEN;

  if (!token) {
    console.error("ENGINE_REQUEST_TOKEN_MISSING");
    return { ok: false, error: "ENGINE_REQUEST_TOKEN_MISSING" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    console.error("ENGINE_FORWARD_FAILED:", data);
    return { ok: false, error: data.error || "ENGINE_FORWARD_FAILED" };
  }

  return { ok: true, data };
}

export default async function handler(req, res) {
  setJsonHeaders(res);

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    const body = req.body || {};

    const organization = cleanText(body.organization || body.company);
    const operator = cleanText(body.operator || body.name);
    const email = cleanText(body.email);
    const sector = cleanText(body.sector || body.area || "Not specified");
    const context = cleanText(body.context || body.message);
    const outcome = cleanText(body.outcome || "Not specified");

    if (!organization || !operator || !email || !context) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_REQUIRED_FIELDS",
        required: ["organization", "operator", "email", "context"]
      });
    }

    if (!isEmail(email)) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_EMAIL"
      });
    }

    const requestId = `REQ-${Date.now()}`;

    const payload = {
      request_id: requestId,
      organization,
      operator,
      email,
      sector,
      context,
      outcome,
      source: "executia.io/request",
      mode: "INTAKE_ONLY",
      received_at: new Date().toISOString()
    };

    /*
      EXECUTIA ENTRY RULE:
      This endpoint is INTAKE ONLY.

      It must NOT:
      - validate execution
      - approve execution
      - reject execution
      - calculate execution status
      - create execution truth
      - write to execution ledger
    */

    const engineForward = await forwardToEngine(payload);

    await sendEmail({
      to: [process.env.OPERATOR_EMAIL].filter(Boolean),
      subject: `EXECUTIA Pilot Intake — ${organization}`,
      html: `
        <h2>EXECUTIA Pilot Intake</h2>

        <p><strong>Request ID:</strong> ${escapeHtml(requestId)}</p>
        <p><strong>Organization:</strong> ${escapeHtml(organization)}</p>
        <p><strong>Responsible Operator:</strong> ${escapeHtml(operator)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Sector:</strong> ${escapeHtml(sector)}</p>

        <hr />

        <p><strong>Execution Context:</strong></p>
        <p>${escapeHtml(context)}</p>

        <p><strong>Expected Control Outcome:</strong></p>
        <p>${escapeHtml(outcome)}</p>

        <hr />

        <p><strong>Mode:</strong> INTAKE ONLY</p>
        <p><strong>Forwarded to ENGINE:</strong> ${engineForward.ok ? "YES" : "NO"}</p>
        <p><strong>Received:</strong> ${escapeHtml(payload.received_at)}</p>
      `
    });

    await sendEmail({
      to: [email],
      subject: "EXECUTIA pilot request received",
      html: `
        <h2>Request received</h2>

        <p>Your EXECUTIA pilot intake has been received.</p>

        <p><strong>Request ID:</strong> ${escapeHtml(requestId)}</p>
        <p><strong>Status:</strong> UNDER REVIEW</p>
        <p><strong>Next step:</strong> operator review and execution scope evaluation.</p>

        <hr />

        <p>
          This request does not create an execution decision.
          Execution decisions are made only by the EXECUTIA Engine.
        </p>
      `
    });

    return res.status(200).json({
      ok: true,
      request_id: requestId,
      status: "UNDER_REVIEW",
      mode: "INTAKE_ONLY",
      engine_forwarded: engineForward.ok,
      message: "REQUEST_RECEIVED"
    });
  } catch (error) {
    console.error("REQUEST_HANDLER_FAILED:", error);

    return res.status(500).json({
      ok: false,
      error: "REQUEST_FAILED",
      message: error.message
    });
  }
}

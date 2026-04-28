export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    const {
      organization,
      operator,
      email,
      sector,
      context,
      outcome
    } = req.body || {};

    if (!organization || !operator || !email || !sector || !context) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_REQUIRED_FIELDS"
      });
    }

    const requestId = `REQ-${Date.now()}`;

    const payload = {
      request_id: requestId,
      organization: cleanText(organization),
      operator: cleanText(operator),
      email: cleanText(email),
      sector: cleanText(sector),
      context: cleanText(context),
      outcome: cleanText(outcome || "Not specified"),
      source: "executia.io/request",
      mode: "INTAKE_ONLY",
      received_at: new Date().toISOString()
    };

    await notifyOperator(payload);
    await confirmRequester(payload);
    await forwardToEngineIntake(payload);

    return res.status(200).json({
      ok: true,
      request_id: requestId,
      status: "UNDER_REVIEW",
      mode: "INTAKE_ONLY",
      message: "REQUEST_RECEIVED"
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "REQUEST_FAILED",
      message: error.message
    });
  }
}

/*
  EXECUTIA ENTRY RULE

  This endpoint is intake only.

  It must NOT:
  - validate execution
  - approve execution
  - reject execution
  - calculate execution status
  - create execution truth
  - write to execution ledger

  Allowed:
  - receive pilot intake
  - send email notification
  - forward raw intake to ENGINE control-request endpoint
*/

async function notifyOperator(payload) {
  if (!process.env.RESEND_API_KEY || !process.env.OPERATOR_EMAIL) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || "EXECUTIA <no-reply@executia.io>",
      to: [process.env.OPERATOR_EMAIL],
      subject: `EXECUTIA Pilot Intake — ${payload.organization}`,
      html: `
        <h2>EXECUTIA Pilot Intake</h2>

        <p><strong>Request ID:</strong> ${escapeHtml(payload.request_id)}</p>
        <p><strong>Organization:</strong> ${escapeHtml(payload.organization)}</p>
        <p><strong>Responsible Operator:</strong> ${escapeHtml(payload.operator)}</p>
        <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
        <p><strong>Sector:</strong> ${escapeHtml(payload.sector)}</p>

        <hr />

        <p><strong>Execution Context:</strong></p>
        <p>${escapeHtml(payload.context)}</p>

        <p><strong>Expected Control Outcome:</strong></p>
        <p>${escapeHtml(payload.outcome)}</p>

        <hr />

        <p><strong>Source:</strong> ${escapeHtml(payload.source)}</p>
        <p><strong>Mode:</strong> INTAKE ONLY</p>
        <p><strong>Received:</strong> ${escapeHtml(payload.received_at)}</p>
      `
    })
  });

  if (!response.ok) {
    console.error("Operator email failed:", await response.text());
  }
}

async function confirmRequester(payload) {
  if (!process.env.RESEND_API_KEY) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || "EXECUTIA <no-reply@executia.io>",
      to: [payload.email],
      subject: "EXECUTIA pilot request received",
      html: `
        <h2>Request received</h2>

        <p>Your EXECUTIA pilot intake has been received.</p>

        <p><strong>Request ID:</strong> ${escapeHtml(payload.request_id)}</p>
        <p><strong>Status:</strong> UNDER REVIEW</p>
        <p><strong>Next step:</strong> operator review and execution scope evaluation.</p>

        <hr />

        <p>
          EXECUTIA is an execution control standard between decision and reality.
        </p>

        <p>
          This request does not create an execution decision.
          Execution decisions are made only by the EXECUTIA Engine.
        </p>
      `
    })
  });

  if (!response.ok) {
    console.error("Requester email failed:", await response.text());
  }
}

async function forwardToEngineIntake(payload) {
  if (
    !process.env.ENGINE_CONTROL_REQUEST_URL ||
    !process.env.ENGINE_REQUEST_TOKEN
  ) {
    return;
  }

  const response = await fetch(process.env.ENGINE_CONTROL_REQUEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ENGINE_REQUEST_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    console.error("Engine intake forward failed:", await response.text());
  }
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

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "https://executia.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

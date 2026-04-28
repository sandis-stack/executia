export default async function handler(req, res) {
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

    if (!organization || !operator || !email || !context) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_REQUIRED_FIELDS"
      });
    }

    const requestId = `REQ-${Date.now()}`;

    const payload = {
      request_id: requestId,
      organization,
      operator,
      email,
      sector: sector || "Not specified",
      context,
      outcome: outcome || "Not specified",
      source: "executia.io/request",
      received_at: new Date().toISOString()
    };

    /*
      ENTRY RULE:
      This endpoint must NOT validate execution,
      approve, reject, calculate status,
      or create execution truth.

      It only receives pilot intake and sends notification.
    */

    if (process.env.RESEND_API_KEY && process.env.OPERATOR_EMAIL) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || "EXECUTIA <no-reply@executia.io>",
          to: [process.env.OPERATOR_EMAIL],
          subject: `EXECUTIA Pilot Request — ${organization}`,
          html: `
            <h2>EXECUTIA Pilot Request</h2>
            <p><strong>Request ID:</strong> ${requestId}</p>
            <p><strong>Organization:</strong> ${organization}</p>
            <p><strong>Responsible Operator:</strong> ${operator}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Sector:</strong> ${sector || "Not specified"}</p>
            <hr />
            <p><strong>Execution Context:</strong></p>
            <p>${escapeHtml(context)}</p>
            <p><strong>Expected Outcome:</strong></p>
            <p>${escapeHtml(outcome || "Not specified")}</p>
          `
        })
      });
    }

    if (process.env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || "EXECUTIA <no-reply@executia.io>",
          to: [email],
          subject: "EXECUTIA pilot request received",
          html: `
            <h2>Request received</h2>
            <p>Your EXECUTIA pilot request has been received.</p>
            <p><strong>Request ID:</strong> ${requestId}</p>
            <p><strong>Status:</strong> UNDER REVIEW</p>
            <p><strong>Next step:</strong> execution scope review by operator.</p>
          `
        })
      });
    }

    return res.status(200).json({
      ok: true,
      request_id: requestId,
      status: "UNDER_REVIEW",
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

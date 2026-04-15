// /api/send-email.js
// EXECUTIA — Dual email intake system

const RATE_MAP = {};

function rateLimit(ip) {
  const now = Date.now();
  if (!RATE_MAP[ip]) RATE_MAP[ip] = [];
  RATE_MAP[ip] = RATE_MAP[ip].filter((t) => now - t < 60_000);
  if (RATE_MAP[ip].length >= 5) return false;
  RATE_MAP[ip].push(now);
  return true;
}

function isBusinessEmail(email = "") {
  return !/@gmail\.|@outlook\.|@hotmail\.|@icloud\.|@yahoo\./i.test(email);
}

function classifyLead({ email, entity, volume, risk }) {
  const businessEmail = isBusinessEmail(email);
  const hasEntity = !!entity && entity.trim().length >= 2;
  const hasRisk = !!risk && risk.trim().length >= 20;
  const highVolume = /100M_1B|1B_plus/i.test(volume || "");
  const midVolume = /10M_100M/i.test(volume || "");

  if (highVolume || (businessEmail && hasEntity && hasRisk)) return "ELEVATED";
  if (midVolume || businessEmail || hasEntity || hasRisk) return "STANDARD";
  return "LOW";
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendViaResend({ apiKey, from, to, subject, text, html, replyTo }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text, html, reply_to: replyTo }),
  });

  const raw = await response.text();
  if (!response.ok) throw new Error(`RESEND_${response.status}: ${raw}`);

  try { return JSON.parse(raw); } catch { return { raw }; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  if (!rateLimit(ip)) return res.status(429).json({ error: "RATE_LIMIT_EXCEEDED" });

  try {
    const {
      executionId, email, status, lossExposure, riskScore, budget, timestamp,
      entity, operator, type, volume, avg_transaction, current_system, risk, country,
    } = req.body || {};

    if (!executionId) return res.status(400).json({ error: "INVALID_EXECUTION_ID" });
    if (!email || !email.includes("@") || !email.includes(".")) return res.status(400).json({ error: "INVALID_EMAIL" });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "MISSING_RESEND_API_KEY" });

    const ts = timestamp || new Date().toISOString().replace("T", " ").substring(0, 19);
    const fromAddress = "EXECUTIA <onboarding@mail.executia.io>";
    const replyTo = email;
    const isRequest = !!entity;

    const statusLabel =
      status === "APPROVED" ? "APPROVED"
      : status === "REQUIRES_REVIEW" ? "REQUIRES REVIEW"
      : status === "ACCESS_REQUEST" ? "UNDER REVIEW"
      : "BLOCKED";

    const exposure = lossExposure && !Number.isNaN(Number(lossExposure))
      ? `\u20ac${Number(lossExposure).toLocaleString()}` : "\u2014";

    const volumeLabel = {
      "1M_10M": "\u20ac1M \u2013 \u20ac10M", "10M_100M": "\u20ac10M \u2013 \u20ac100M",
      "100M_1B": "\u20ac100M \u2013 \u20ac1B", "1B_plus": "\u20ac1B+",
    }[volume] || volume || "\u2014";

    const leadClass = classifyLead({ email, entity, volume, risk });

    // Non-blocking Firestore
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const fbApiKey  = process.env.FIREBASE_API_KEY;
      if (projectId && fbApiKey) {
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/execution_flows?key=${fbApiKey}`,
          { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: {
              executionId: { stringValue: executionId }, email: { stringValue: email },
              entity: { stringValue: entity || "\u2014" }, operator: { stringValue: operator || "\u2014" },
              volume: { stringValue: volumeLabel }, risk: { stringValue: risk || "\u2014" },
              country: { stringValue: country || "\u2014" }, status: { stringValue: statusLabel },
              priority: { stringValue: leadClass },
              source: { stringValue: isRequest ? "pilot_request_v3" : "decision_notice_v2" },
              timestamp: { stringValue: ts },
            }})
          }
        );
      }
    } catch (dbErr) { console.warn("Firestore write failed:", dbErr.message); }

    // CLIENT EMAIL
    const clientSubject = isRequest
      ? `EXECUTIA \u2014 Request received (${executionId})`
      : `EXECUTIA \u2014 Execution decision (${executionId})`;

    const clientText = isRequest ? [
      "EXECUTIA \u2014 REQUEST RECEIVED", "========================================", "",
      `Execution ID: ${executionId}`, "Status:       UNDER REVIEW",
      `Priority:     ${leadClass}`, `Timestamp:    ${ts}`, "",
      "Your request has entered the EXECUTIA control system.", "",
      "Next:", "\u2014 initial validation", "\u2014 risk screening", "\u2014 operator review", "",
      "Response window: 24\u201348h", "", "EXECUTIA", "Execution Control Infrastructure", "control@executia.io",
    ].join("\n") : [
      "EXECUTIA \u2014 EXECUTION DECISION", "========================================", "",
      `Execution ID: ${executionId}`, `Status:       ${statusLabel}`,
      `Risk score:   ${riskScore || "\u2014"}%`, `Exposure:     ${exposure}`, `Timestamp:    ${ts}`, "",
      "This decision has been evaluated by EXECUTIA.", "",
      "Next step:", "Submit full project parameters:", "https://www.executia.io/request", "",
      "EXECUTIA", "Execution Control Infrastructure", "control@executia.io",
    ].join("\n");

    const clientHtml = isRequest
      ? `<div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;">
          <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #DEE2E6;padding:32px;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#6B7280;margin-bottom:16px;">EXECUTIA &middot; REQUEST RECEIVED</div>
            <h1 style="margin:0 0 16px;font-size:30px;line-height:1.1;color:#0A1F44;">Your request has entered the system.</h1>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4B5563;">We received your request and linked it to the EXECUTIA control flow.</p>
            <div style="border-left:3px solid #0A1F44;padding:16px 18px;background:#F5F7FA;margin-bottom:24px;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:2;">
              EXECUTION ID: ${escapeHtml(executionId)}<br>STATUS: UNDER REVIEW<br>PRIORITY: ${escapeHtml(leadClass)}<br>RESPONSE WINDOW: 24&ndash;48H
            </div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;line-height:2;color:#374151;margin-bottom:24px;">
              NEXT:<br>&mdash; initial validation<br>&mdash; risk screening<br>&mdash; operator review
            </div>
            <a href="https://www.executia.io/execution" style="display:inline-block;background:#0A1F44;color:#fff;text-decoration:none;padding:14px 22px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.1em;">&rarr; ENTER EXECUTION</a>
            <div style="margin-top:28px;padding-top:18px;border-top:1px solid #DEE2E6;font-family:'JetBrains Mono',monospace;font-size:10px;line-height:2;color:#6B7280;">EXECUTIA<br>Execution Control Infrastructure<br>control@executia.io</div>
          </div>
        </div>`
      : `<div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;">
          <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #DEE2E6;padding:32px;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#6B7280;margin-bottom:16px;">EXECUTIA &middot; EXECUTION DECISION</div>
            <h1 style="margin:0 0 16px;font-size:30px;line-height:1.1;color:#0A1F44;">Execution evaluated.</h1>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4B5563;">This decision has been processed by the EXECUTIA control layer.</p>
            <div style="border-left:3px solid #DC2626;padding:16px 18px;background:rgba(220,38,38,.04);margin-bottom:24px;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:2;">
              EXECUTION ID: ${escapeHtml(executionId)}<br>STATUS: ${escapeHtml(statusLabel)}<br>RISK SCORE: ${escapeHtml(String(riskScore || "\u2014"))}%<br>FINANCIAL EXPOSURE: ${escapeHtml(exposure)}
            </div>
            <a href="https://www.executia.io/request" style="display:inline-block;background:#0A1F44;color:#fff;text-decoration:none;padding:14px 22px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.1em;">&rarr; REQUEST FULL VALIDATION</a>
            <div style="margin-top:28px;padding-top:18px;border-top:1px solid #DEE2E6;font-family:'JetBrains Mono',monospace;font-size:10px;line-height:2;color:#6B7280;">EXECUTIA<br>Execution Control Infrastructure<br>control@executia.io</div>
          </div>
        </div>`;

    // INTERNAL EMAIL
    const internalSubject = isRequest
      ? `[${leadClass}] PILOT REQUEST \u2014 ${executionId} \u2014 ${entity || email}`
      : `[${leadClass}] EXECUTION DECISION \u2014 ${executionId} \u2014 ${statusLabel}`;

    const internalText = [
      isRequest ? "EXECUTIA \u2014 PILOT REQUEST RECEIVED" : "EXECUTIA \u2014 EXECUTION DECISION",
      "========================================", "",
      `EXECUTION ID:     ${executionId}`, `PRIORITY:         ${leadClass}`, `TIMESTAMP:        ${ts}`, "",
      `COMPANY:          ${entity || "\u2014"}`, `CONTACT:          ${operator || "\u2014"}`,
      `EMAIL:            ${email}`, `PAYMENT TYPE:     ${type || "\u2014"}`,
      `MONTHLY VOLUME:   ${volumeLabel}`, `AVG TRANSACTION:  ${avg_transaction || "\u2014"}`,
      `CURRENT SYSTEM:   ${current_system || "\u2014"}`, `COUNTRY:          ${country || "\u2014"}`, "",
      "EXECUTION RISK DESCRIPTION:", risk || "\u2014 not provided \u2014", "",
      `STATUS:           ${statusLabel}`, `RISK SCORE:       ${riskScore || "\u2014"}%`, `EXPOSURE:         ${exposure}`, "",
      "SYSTEM STATUS:    ENFORCING EXECUTION CONTROL", "OVERRIDE:         DISABLED", "",
      "EXECUTIA EXECUTION CONTROL INFRASTRUCTURE", "control@executia.io | PCT/IB2026/050141",
    ].join("\n");

    // SEND BOTH
    const clientResult   = await sendViaResend({ apiKey, from: fromAddress, to: [email], subject: clientSubject, text: clientText, html: clientHtml, replyTo });
    const internalResult = await sendViaResend({ apiKey, from: fromAddress, to: ["sandis@gmail.com"], subject: internalSubject, text: internalText, replyTo: email });

    return res.status(200).json({
      ok: true, executionId, priority: leadClass,
      clientEmailId:   clientResult?.id   || null,
      internalEmailId: internalResult?.id || null,
    });

  } catch (e) {
    console.error("SEND EMAIL ERROR:", e);
    return res.status(500).json({ error: "SERVER_ERROR", details: e.message || "Unknown error" });
  }
}

function json(res, code, payload) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(code).json(payload);
}
function clean(v) { return String(v || "").trim(); }
function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v)); }
function esc(v) { return String(v||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }

function mailTemplate(title, lines, body) {
  const rows = lines.map(([k,v]) => `<strong>${esc(k)}:</strong> ${esc(v)}<br/>`).join("");
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#0f2d4a"><table width="100%" cellpadding="0" cellspacing="0" style="padding:38px 14px;background:#f3f6fa"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;background:#fff;border:1px solid #d9e1ea"><tr><td style="padding:40px"><div style="font-size:12px;letter-spacing:4px;color:#60758b;font-weight:700;margin-bottom:24px">EXECUTIA · EXECUTION CONTROL</div><h1 style="margin:0 0 18px;font-size:32px;line-height:1.12;color:#0f2d4a">${esc(title)}</h1><p style="margin:0 0 26px;font-size:16px;line-height:1.6;color:#415168">${esc(body)}</p><div style="background:#f1f5f9;border-left:4px solid #0f2d4a;padding:20px 24px;font-family:Courier New,monospace;font-size:14px;line-height:1.8;color:#2a4260">${rows}</div><div style="height:1px;background:#d9e1ea;margin:34px 0 22px"></div><p style="margin:0;font-size:14px;line-height:1.6;color:#60758b">EXECUTIA™<br/>Execution Control Standard<br/>ENTRY → ENGINE → PROOF → REQUEST</p></td></tr></table></td></tr></table></body></html>`;
}

// ── sendEmail — isolated, 8s timeout, never throws ──────────────────────────
async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY_MISSING");
    return { ok:false, skipped:true, error:"RESEND_API_KEY_MISSING" };
  }
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) return { ok:false, skipped:true, error:"NO_RECIPIENTS" };

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: { Authorization:`Bearer ${process.env.RESEND_API_KEY}`, "Content-Type":"application/json" },
      body:    JSON.stringify({
        from: process.env.FROM_EMAIL || "EXECUTIA <no-reply@mail.executia.io>",
        to:   recipients,
        subject,
        html
      }),
      signal: controller.signal
    });
    const text = await r.text().catch(() => "");
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!r.ok) {
      console.error("RESEND_FAILED", r.status, JSON.stringify(data));
      return { ok:false, status:r.status, error:data };
    }
    return { ok:true, data };
  } catch (e) {
    const reason = e.name === "AbortError" ? "RESEND_TIMEOUT" : e.message;
    console.error("RESEND_ERROR", reason);
    return { ok:false, error:reason };
  } finally {
    clearTimeout(timeout);
  }
}

// ── forwardToEngine — secondary, 8s timeout, fire-and-forget ────────────────
async function forwardToEngine(payload) {
  const token = process.env.ENGINE_REQUEST_TOKEN;
  const url   = process.env.ENGINE_CONTROL_REQUEST_URL || "https://execution.executia.io/api/v1/control-request";
  if (!token) return { ok:false, skipped:true, error:"ENGINE_REQUEST_TOKEN_MISSING" };

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body:    JSON.stringify(payload),
      signal:  controller.signal
    });
    const text = await r.text().catch(() => "");
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw:text }; }
    return r.ok
      ? { ok:true,  status:r.status, data }
      : { ok:false, status:r.status, error:data.error||"ENGINE_FORWARD_FAILED" };
  } catch (e) {
    return { ok:false, error: e.name==="AbortError" ? "ENGINE_TIMEOUT" : e.message };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok:false, error:"METHOD_NOT_ALLOWED" });

  try {
    const b = req.body || {};
    const organization = clean(b.organization || b.company);
    const operator     = clean(b.operator     || b.name);
    const email        = clean(b.email);
    const sector       = clean(b.sector       || "Not specified");
    const context      = clean(b.context      || b.message);
    const outcome      = clean(b.outcome      || b.value || "Not specified");

    if (!organization || !operator || !email || !context)
      return json(res, 400, { ok:false, error:"MISSING_REQUIRED_FIELDS" });
    if (!emailOk(email))
      return json(res, 400, { ok:false, error:"INVALID_EMAIL" });

    const requestId  = `EXE-${Date.now()}`;
    const receivedAt = new Date().toISOString();

    const userHtml = mailTemplate(
      "Execution request registered.",
      [["EXECUTION ID",requestId],["STATUS","UNDER REVIEW"],["RESPONSE WINDOW","24–48H"],["ENGINE","https://execution.executia.io/dashboard"]],
      "Your EXECUTIA pilot request has been registered. The next step is to define one execution point and measurable control result."
    );
    const operatorHtml = mailTemplate(
      "New EXECUTIA pilot request received.",
      [["EXECUTION ID",requestId],["ORGANIZATION",organization],["OPERATOR",operator],["EMAIL",email],["SECTOR",sector],["CONTEXT",context],["EXPECTED VALUE",outcome],["RECEIVED",receivedAt]],
      "Review the requested execution point and define the controlled pilot scope."
    );

    // ── Emails first — parallel, fully isolated, never throw ────────────────
    const [userEmail, operatorEmail] = await Promise.all([
      sendEmail({ to:email, subject:`EXECUTIA — Request registered (${requestId})`, html:userHtml }),
      sendEmail({ to:process.env.OPERATOR_EMAIL||"control@executia.io", subject:`EXECUTIA — New pilot request (${requestId})`, html:operatorHtml })
    ]);

    // ── Engine forward — fire and forget, never blocks response ─────────────
    forwardToEngine({ request_id:requestId, organization, operator, email, sector, context, outcome, source:"executia.io/request", mode:"PILOT_INTAKE", received_at:receivedAt })
      .then(r => console.log("ENGINE_FORWARD", r.ok?"OK":r.error, requestId))
      .catch(e => console.error("ENGINE_FORWARD_UNHANDLED", e.message));

    // ── Hardened truth rule: no false success ───────────────────────────────
    // EXECUTIA must never confirm an execution/request unless both required
    // notification paths were actually accepted by the email provider.
    const emailsOk = userEmail.ok && operatorEmail.ok;
    if (!emailsOk) {
      console.error("REQUEST_EMAIL_NOT_CONFIRMED", requestId, {
        user: userEmail.ok,
        operator: operatorEmail.ok,
        user_error: userEmail.error,
        operator_error: operatorEmail.error
      });
      return json(res, 500, {
        ok: false,
        request_id: requestId,
        status: "REQUEST_NOT_CONFIRMED",
        error: "EMAIL_DELIVERY_NOT_CONFIRMED",
        email_user_sent: userEmail.ok,
        email_operator_sent: operatorEmail.ok,
        ...(userEmail.ok ? {} : { email_user_error: userEmail.error }),
        ...(operatorEmail.ok ? {} : { email_operator_error: operatorEmail.error })
      });
    }

    return json(res, 200, {
      ok: true,
      request_id: requestId,
      status: "REQUEST_RECEIVED",
      email_user_sent: true,
      email_operator_sent: true
    });

  } catch (e) {
    console.error("HANDLER_FAILED", e.message);
    return json(res, 500, { ok:false, error:"REQUEST_FAILED" });
  }
}

// /lib/email-templates.js
// EXECUTIA — Unified email templates
// baseLightEmail  → clients (request received, approved, blocked)
// baseDarkOperatorEmail → operator alerts (new request)

function baseLightEmail({ eyebrow, title, intro, metaRows = [], nextSteps = [], ctaLabel, ctaUrl, footerEmail = 'control@executia.io' }) {
  const metaHtml = metaRows.map(row => `
    <div style="font-family:'JetBrains Mono',monospace;font-size:13px;line-height:2;color:#111827;">
      <strong>${row.label}</strong>&nbsp;&nbsp;${row.value}
    </div>
  `).join('');

  const nextHtml = nextSteps.length ? `
    <div style="margin-top:28px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.14em;color:#6B7280;margin-bottom:10px;">NEXT:</div>
      ${nextSteps.map(step => `
        <div style="font-family:'JetBrains Mono',monospace;font-size:14px;line-height:2;color:#111827;">– ${step}</div>
      `).join('')}
    </div>
  ` : '';

  const ctaHtml = ctaLabel && ctaUrl ? `
    <div style="margin-top:30px;">
      <a href="${ctaUrl}" style="display:inline-block;background:#0A1F44;color:#ffffff;text-decoration:none;padding:16px 26px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;letter-spacing:.12em;">
        → ${ctaLabel}
      </a>
    </div>
  ` : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>EXECUTIA</title>
</head>
<body style="margin:0;padding:0;background:#eef2f6;font-family:Inter,Arial,sans-serif;color:#0A1F44;">
  <div style="padding:30px 20px;">
    <div style="max-width:930px;margin:0 auto;background:#f3f5f8;padding:42px 34px;">
      <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #d9dee7;padding:42px 42px 34px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.24em;color:#6B7280;margin-bottom:24px;">${eyebrow}</div>
        <div style="font-size:28px;line-height:1.25;font-weight:800;color:#0A1F44;margin-bottom:18px;">${title}</div>
        <div style="font-size:16px;line-height:1.7;color:#4B5563;margin-bottom:28px;">${intro}</div>
        <div style="border-left:4px solid #0A1F44;background:#f3f5f8;padding:20px 24px;margin-bottom:24px;">${metaHtml}</div>
        ${nextHtml}
        ${ctaHtml}
        <div style="margin-top:38px;border-top:1px solid #d9dee7;padding-top:26px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.9;color:#6B7280;">
            EXECUTIA<br>Execution Control Infrastructure<br>
            <a href="mailto:${footerEmail}" style="color:#2563eb;text-decoration:underline;">${footerEmail}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function baseDarkOperatorEmail({ eyebrow, title, intro, metaRows = [], blocks = [], nextSteps = [], ctaLabel, ctaUrl }) {
  const metaHtml = metaRows.map(row => `
    <div style="font-family:'JetBrains Mono',monospace;font-size:12px;line-height:2;color:#E5E7EB;">
      <strong style="color:#9CA3AF;">${row.label}</strong>&nbsp;&nbsp;${row.value}
    </div>
  `).join('');

  const blocksHtml = blocks.map(block => `
    <div style="margin-bottom:22px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;color:#6B7280;margin-bottom:10px;">${block.label}</div>
      <div style="background:#0B1220;border:1px solid rgba(255,255,255,0.08);padding:16px 18px;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.9;color:#E5E7EB;">${block.value || '—'}</div>
    </div>
  `).join('');

  const nextHtml = nextSteps.length ? `
    <div style="margin-bottom:28px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;color:#6B7280;margin-bottom:10px;">REQUIRED NEXT STEP</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:13px;line-height:2;color:#E5E7EB;">
        ${nextSteps.map(s => `– ${s}<br>`).join('')}
      </div>
    </div>
  ` : '';

  const ctaHtml = ctaLabel && ctaUrl ? `
    <div style="margin-bottom:24px;">
      <a href="${ctaUrl}" style="display:inline-block;background:#DC2626;color:#ffffff;text-decoration:none;padding:15px 24px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:.12em;">
        → ${ctaLabel}
      </a>
    </div>
  ` : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>EXECUTIA Operator Alert</title>
</head>
<body style="margin:0;padding:0;background:#0B1220;font-family:Inter,Arial,sans-serif;color:#E5E7EB;">
  <div style="padding:32px 20px;background:#0B1220;">
    <div style="max-width:920px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);background:#111827;">

      <div style="padding:18px 28px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;letter-spacing:.18em;color:#E5E7EB;">EXECUTIA™</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#9CA3AF;">OPERATOR ALERT</div>
      </div>

      <div style="padding:28px 28px 14px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.22em;color:#6B7280;margin-bottom:16px;">${eyebrow}</div>
        <div style="font-size:28px;line-height:1.2;font-weight:800;color:#F9FAFB;margin-bottom:12px;">${title}</div>
        <div style="font-size:16px;line-height:1.7;color:#9CA3AF;max-width:720px;">${intro}</div>
      </div>

      <div style="padding:24px 28px;">
        <div style="background:#0F172A;border-left:4px solid #DC2626;padding:18px 20px;margin-bottom:22px;">${metaHtml}</div>
        ${blocksHtml}
        ${nextHtml}
        ${ctaHtml}
      </div>

      <div style="padding:20px 28px;border-top:1px solid rgba(255,255,255,0.08);background:#0B1220;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.9;color:#6B7280;">
          EXECUTIA<br>Execution Control Infrastructure<br>
          <a href="mailto:control@executia.io" style="color:#93C5FD;text-decoration:underline;">control@executia.io</a>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;
}

// ── Request Received (client, light) ─────────────────────────────────
export function requestReceivedEmail({ executionId }) {
  const subject = `EXECUTIA — Request received (${executionId})`;

  const text = [
    'EXECUTIA — REQUEST RECEIVED', '',
    `EXECUTION ID: ${executionId}`,
    'STATUS: UNDER REVIEW', 'PRIORITY: STANDARD', 'RESPONSE WINDOW: 24–48H', '',
    'NEXT:', '- initial validation', '- risk screening', '- operator review', '',
    `TRACK: https://www.executia.io/status?id=${executionId}`,
    'DIRECT CONTACT: control@executia.io', '',
    'EXECUTIA — Standard of Execution'
  ].join('\n');

  const html = baseLightEmail({
    eyebrow:   'EXECUTIA · REQUEST RECEIVED',
    title:     'Your request has entered the system.',
    intro:     'We received your request and linked it to the EXECUTIA control flow.',
    metaRows:  [
      { label: 'EXECUTION ID:',    value: executionId },
      { label: 'STATUS:',          value: 'UNDER REVIEW' },
      { label: 'PRIORITY:',        value: 'STANDARD' },
      { label: 'RESPONSE WINDOW:', value: '24–48H' }
    ],
    nextSteps: ['initial validation', 'risk screening', 'operator review'],
    ctaLabel:  'TRACK YOUR REQUEST',
    ctaUrl:    `https://www.executia.io/status?id=${executionId}`
  });

  return { subject, text, html };
}

// ── Request Approved (client, light) ─────────────────────────────────
export function requestApprovedEmail({ executionId, operatorNote }) {
  const subject = `EXECUTIA — Request approved (${executionId})`;

  const text = [
    'EXECUTIA — REQUEST APPROVED', '',
    `EXECUTION ID: ${executionId}`, 'STATUS: APPROVED', '',
    'Your request has been approved for the next step.',
    'An operator will follow up with pilot or implementation instructions.', '',
    `OPERATOR NOTE: ${operatorNote || '—'}`, '',
    `TRACK: https://www.executia.io/status?id=${executionId}`,
    'DIRECT CONTACT: control@executia.io', '',
    'EXECUTIA — Standard of Execution'
  ].join('\n');

  const html = baseLightEmail({
    eyebrow:   'EXECUTIA · REQUEST APPROVED',
    title:     'Your request has been approved.',
    intro:     'Your request passed operator review and is now cleared for the next step.',
    metaRows:  [
      { label: 'EXECUTION ID:',  value: executionId },
      { label: 'STATUS:',        value: 'APPROVED' },
      { label: 'NEXT STATE:',    value: 'OPERATOR FOLLOW-UP' },
      { label: 'OPERATOR NOTE:', value: operatorNote || '—' }
    ],
    nextSteps: ['operator follow-up', 'pilot configuration or implementation scope', 'execution setup'],
    ctaLabel:  'OPEN STATUS RECORD',
    ctaUrl:    `https://www.executia.io/status?id=${executionId}`
  });

  return { subject, text, html };
}

// ── Request Blocked (client, light) ──────────────────────────────────
export function requestBlockedEmail({ executionId, operatorNote }) {
  const subject = `EXECUTIA — Request blocked (${executionId})`;

  const text = [
    'EXECUTIA — REQUEST BLOCKED', '',
    `EXECUTION ID: ${executionId}`, 'STATUS: BLOCKED', '',
    'Your request is currently blocked pending additional review or missing conditions.', '',
    `OPERATOR NOTE: ${operatorNote || '—'}`, '',
    `TRACK: https://www.executia.io/status?id=${executionId}`,
    'DIRECT CONTACT: control@executia.io', '',
    'If needed, resubmit updated information through /request.', '',
    'EXECUTIA — Standard of Execution'
  ].join('\n');

  const html = baseLightEmail({
    eyebrow:   'EXECUTIA · REQUEST BLOCKED',
    title:     'Your request is currently blocked.',
    intro:     'The request cannot proceed in its current form and requires additional conditions or clarification.',
    metaRows:  [
      { label: 'EXECUTION ID:',  value: executionId },
      { label: 'STATUS:',        value: 'BLOCKED' },
      { label: 'CURRENT STATE:', value: 'ADDITIONAL REVIEW REQUIRED' },
      { label: 'OPERATOR NOTE:', value: operatorNote || '—' }
    ],
    nextSteps: ['review operator note', 'update missing or unclear input', 'resubmit through the request form if needed'],
    ctaLabel:  'OPEN STATUS RECORD',
    ctaUrl:    `https://www.executia.io/status?id=${executionId}`
  });

  return { subject, text, html };
}

// ── Operator New Request Alert (dark) ─────────────────────────────────
export function operatorNewRequestEmail({ executionId, entity, operator, email, country, volume, risk, consequence }) {
  const subject = `[EXECUTIA] New request — ${executionId} — ${entity || 'Unknown Entity'}`;

  const text = [
    'EXECUTIA — NEW REQUEST', '',
    `EXECUTION ID: ${executionId}`,
    `ENTITY: ${entity || '—'}`, `CONTACT: ${operator || '—'}`,
    `EMAIL: ${email || '—'}`, `COUNTRY: ${country || '—'}`,
    `MONTHLY VOLUME: ${volume || '—'}`, '',
    'EXECUTION RISK:', risk || '—', '',
    'WHAT HAPPENS IF THIS FAILS:', consequence || '—', '',
    `OPEN STATUS: https://www.executia.io/status?id=${executionId}`, '',
    'EXECUTIA — Standard of Execution'
  ].join('\n');

  const html = baseDarkOperatorEmail({
    eyebrow:   'EXECUTIA · NEW REQUEST · UNDER REVIEW',
    title:     'New execution request detected.',
    intro:     'A new request has entered the control flow and requires operator attention.',
    metaRows:  [
      { label: 'EXECUTION ID:',   value: executionId },
      { label: 'ENTITY:',         value: entity    || '—' },
      { label: 'CONTACT:',        value: operator  || '—' },
      { label: 'EMAIL:',          value: email     || '—' },
      { label: 'COUNTRY:',        value: country   || '—' },
      { label: 'MONTHLY VOLUME:', value: volume    || '—' }
    ],
    blocks: [
      { label: 'EXECUTION RISK',           value: risk        || '—' },
      { label: 'WHAT HAPPENS IF THIS FAILS', value: consequence || '—' }
    ],
    nextSteps: ['open the status record', 'review risk input and consequence', 'decide: approve / block / keep under review'],
    ctaLabel:  'OPEN STATUS RECORD',
    ctaUrl:    `https://www.executia.io/status?id=${executionId}`
  });

  return { subject, text, html };
}

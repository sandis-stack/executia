function normalizeText(value){
  return String(value || "").trim().toUpperCase();
}

function normalizeScore(value){
  const n = Number(value);
  if(Number.isFinite(n)) return Math.max(0, Math.min(100, n));
  return 88;
}

function deriveContinuityStatus(input = {}){

  const status = normalizeText(input.status);
  const governance = normalizeText(input.governance_state);
  const registry = normalizeText(input.registry_state);
  const audit = normalizeText(input.audit_state);
  const score = normalizeScore(input.continuity_score);

  const riskText = [
    status,
    governance,
    registry,
    audit,
    normalizeText(input.risk_profile),
    normalizeText(input.risk),
    normalizeText(input.process),
    normalizeText(input.scope)
  ].join(" ");

  if(
    status.includes("BLOCK") ||
    governance.includes("BLOCK") ||
    registry.includes("FAILED") ||
    audit.includes("FAILED")
  ){
    return "BLOCKED";
  }

  if(
    riskText.includes("CRITICAL") ||
    riskText.includes("FAILURE") ||
    riskText.includes("UNCONTROLLED") ||
    score < 45
  ){
    return "CRITICAL";
  }

  if(
    status.includes("PENDING_REVIEW") ||
    status.includes("REVIEW") ||
    governance.includes("REVIEW") ||
    registry.includes("REVIEW") ||
    audit.includes("REVIEW") ||
    score < 70
  ){
    return "REVIEW";
  }

  if(
    status.includes("APPROVED") ||
    governance.includes("APPROVED") ||
    registry.includes("COMMITTED") ||
    audit.includes("VERIFIED")
  ){
    return "APPROVED";
  }

  return "STABLE";
}

export default async function handler(req,res){

  if(req.method !== "POST" && req.method !== "GET"){
    return res.status(405).json({
      ok:false,
      error:"METHOD_NOT_ALLOWED"
    });
  }

  const source =
    req.method === "POST"
      ? (req.body || {})
      : (req.query || {});

  const continuity_status = deriveContinuityStatus(source);

  return res.status(200).json({
    ok:true,
    source:"EXECUTIA_CONTINUITY_MODEL",
    continuity_status,
    allowed_states:[
      "APPROVED",
      "BLOCKED",
      "REVIEW",
      "CRITICAL",
      "STABLE"
    ],
    input:{
      status:source.status || null,
      governance_state:source.governance_state || null,
      registry_state:source.registry_state || null,
      audit_state:source.audit_state || null,
      continuity_score:source.continuity_score || null
    },
    generated_at:new Date().toISOString()
  });
}

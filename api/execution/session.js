const REGISTRY = globalThis.EXECUTIA_REGISTRY || [];
globalThis.EXECUTIA_REGISTRY = REGISTRY;

export default async function handler(req, res) {

  if(req.method === "GET"){

    return res.status(200).json({
      ok:true,
      sessions: REGISTRY.slice(-25).reverse()
    });

  }

  if(req.method !== "POST"){

    return res.status(405).json({
      ok:false,
      error:"METHOD_NOT_ALLOWED"
    });

  }

  try{

    const body = req.body || {};

    const session = {

      ok:true,

      session_id:
        "SES-" + Date.now(),

      execution_id:
        body.execution_id ||
        ("EXE-" + Date.now()),

      status:
        body.status || "ACTIVE",

      governance_state:
        body.governance_state || "INTERPRETED",

      registry_state:
        body.registry_state || "COMMITTED",

      audit_state:
        body.audit_state || "ACTIVE",

      continuity_score:
        body.continuity_score || 88,

      created_at:
        new Date().toISOString(),

      events:
        body.events || [
          "SESSION_CREATED",
          "EXECUTION_REGISTERED",
          "GOVERNANCE_PROPAGATED",
          "AUDIT_CONTINUITY_ACTIVE"
        ]

    };

    REGISTRY.push(session);

    return res.status(200).json(session);

  }catch(err){

    return res.status(500).json({
      ok:false,
      error:"EXECUTION_REGISTRY_FAILED"
    });

  }

}

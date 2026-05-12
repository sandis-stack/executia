export default async function handler(req,res){

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>EXECUTIA Proposal</title>
<style>
body{
  font-family:Arial,sans-serif;
  padding:48px;
  color:#16324f;
  background:#ffffff;
}
h1{
  font-size:42px;
  margin-bottom:12px;
}
h2{
  margin-top:42px;
  font-size:24px;
}
p{
  line-height:1.7;
  color:#415168;
}
.grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:18px;
  margin-top:24px;
}
.card{
  border:1px solid #d7e0ea;
  padding:22px;
  border-radius:12px;
}
.tag{
  font-size:11px;
  letter-spacing:2px;
  color:#60758b;
}
.flow{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
  margin-top:18px;
}
.step{
  border:1px solid #d7e0ea;
  padding:12px 18px;
  border-radius:999px;
}
</style>
</head>
<body>

<div class="tag">EXECUTIA · EXECUTION GOVERNANCE</div>

<h1>Institutional Pilot Proposal</h1>

<p>
EXECUTIA proposes a controlled execution pilot focused on governance continuity,
execution validation, registry synchronization and audit-ready operational truth.
</p>

<h2>Execution Structure</h2>

<div class="flow">
<div class="step">Pilot Scope</div>
<div class="step">Governance Validation</div>
<div class="step">Registry Continuity</div>
<div class="step">Audit Proof</div>
<div class="step">Institutional Rollout</div>
</div>

<h2>Governance Assessment</h2>

<div class="grid">

<div class="card">
<div class="tag">Continuity</div>
<h3>88 / 100</h3>
<p>Projected execution continuity stabilization score.</p>
</div>

<div class="card">
<div class="tag">Governance</div>
<h3>INTERPRETED</h3>
<p>Execution dependencies and governance propagation identified.</p>
</div>

<div class="card">
<div class="tag">Pilot</div>
<h3>READY</h3>
<p>Recommended for controlled institutional execution pilot.</p>
</div>

</div>

<h2>Recommended Rollout</h2>

<p>
Start with one measurable execution point. Apply execution-time validation,
registry continuity and audit synchronization before broader rollout.
</p>

</body>
</html>
`;

  res.setHeader(
    "Content-Type",
    "text/html; charset=utf-8"
  );

  return res.status(200).send(html);

}

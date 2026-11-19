/**
 * TASK-37: inline footers + journey page body text into static HTML for crawlers.
 * Idempotent. Run: node scripts/inject-ssr-crawler.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const brandSrc = readFileSync(join(root, 'assets/platform-brand.js'), 'utf8');
const brandSandbox = {
  window: {},
  document: { querySelector: () => null, readyState: 'complete', addEventListener() {} },
};
vm.runInNewContext(brandSrc, brandSandbox);
const { renderInstitutionalFooter, renderLegalFooter } = brandSandbox.window.EXECUTIA_BRAND;

const ENGINE_CONTENT = `
<div data-ej-content data-ej-static="true">
<section class="ej-page ej-page-engine" aria-labelledby="ej-engine-heading">
  <div class="wrap">
    <span class="kicker">ENGINE — VALIDATION</span>
    <h1 id="ej-engine-heading">A procurement appears compliant.</h1>
    <p class="lead">A €250,000 critical infrastructure procurement reaches the executive desk with complete documentation. The question is not whether it looks correct — it is whether it can actually be executed.</p>
    <p class="ej-question-note ej-scenario-disclaimer">Illustrative example. Not a customer case.</p>
    <article class="ej-procurement ej-procurement--problem">
      <p class="ej-procurement-kicker">Executive scenario</p>
      <h2 class="ej-procurement-title">Critical infrastructure procurement</h2>
      <dl class="ej-procurement-meta">
        <div><dt>Organization</dt><dd>National Infrastructure Authority</dd></div>
        <div><dt>Amount</dt><dd>€250,000</dd></div>
        <div><dt>Mission ID</dt><dd><code>MSN-INFRA-2026-0047</code></dd></div>
        <div><dt>Execution ID</dt><dd><code>EXE-PROC-250K-20260715</code></dd></div>
      </dl>
      <p class="ej-procurement-summary">Network resilience equipment — Phase 2 procurement</p>
    </article>
    <div class="ej-question">
      <p class="ej-question-label">Executive question</p>
      <p class="ej-question-text">Is it actually executable?</p>
      <p class="ej-question-note">Appears compliant on paper. Execution risk remains invisible until validation.</p>
    </div>
    <div class="ej-validation">
      <h2>Validation gates</h2>
      <div class="ej-validation-frame">
        <table class="ej-validation-table"><thead><tr><th scope="col">Gate</th><th scope="col">Result</th><th scope="col">Basis</th></tr></thead><tbody>
          <tr><th scope="row">Authority</th><td><span class="ej-check-ok">Confirmed</span></td><td>Procurement officer holds delegated authority for this threshold.</td></tr>
          <tr><th scope="row">Budget</th><td><span class="ej-check-ok">Confirmed</span></td><td>€250,000 allocated under FY2026 resilience program line 4.2.</td></tr>
          <tr><th scope="row">Approvals</th><td><span class="ej-check-ok">Confirmed</span></td><td>Technical review and financial control sign-off recorded.</td></tr>
          <tr><th scope="row">Policy</th><td><span class="ej-check-ok">Confirmed</span></td><td>Public procurement policy §12.4 satisfied for infrastructure goods.</td></tr>
          <tr><th scope="row">Evidence</th><td><span class="ej-check-ok">Confirmed</span></td><td>Required proof artifacts attached before commitment.</td></tr>
        </tbody></table>
      </div>
    </div>
    <div class="ej-decision-panel">
      <h2>Governed decision</h2>
      <div class="ej-decision-row" role="group" aria-label="Decision outcome">
        <div class="ej-decision ej-decision--active">PROCEED</div>
        <div class="ej-decision ej-decision--inactive">HOLD</div>
        <div class="ej-decision ej-decision--inactive">REJECT</div>
      </div>
      <p class="ej-decision-note">Decision recorded under EXE-PROC-250K-20260715.</p>
    </div>
  </div>
</section>
</div>
<section class="ej-next" aria-label="Next step" data-ej-static="true">
  <div class="wrap ej-next-inner">
    <a class="pill-btn primary ej-next-btn" href="/one">View executive workspace</a>
  </div>
</section>`.trim();

const ONE_CONTENT = `
<div data-ej-content data-ej-static="true">
<section class="ej-page ej-page-one" aria-labelledby="ej-one-heading">
  <div class="wrap">
    <span class="kicker">ONE — OPERATION</span>
    <h1 id="ej-one-heading">Executive workspace</h1>
    <p class="lead">Operational view of the validated execution — mission through outcome. EXECUTIA ONE keeps the same governed record that Engine produced: what was asked, what was checked, what was decided, and what evidence supports the decision.</p>
    <p class="lead">This demonstration uses a €250,000 critical infrastructure procurement for the National Infrastructure Authority (mission MSN-INFRA-2026-0047, execution EXE-PROC-250K-20260715). Status: execution in progress, evidence available, decision governed.</p>
    <div class="ej-workspace ej-workspace--flow">
      <div class="ej-workspace-row"><span class="ej-workspace-label">Mission</span><p>Secure Phase 2 network resilience equipment for critical infrastructure operations.</p></div>
      <div class="ej-workspace-row"><span class="ej-workspace-label">Decision</span><p>PROCEED — all validation gates satisfied.</p></div>
      <div class="ej-workspace-row"><span class="ej-workspace-label">Execution</span><p>Purchase order release authorized under MSN-INFRA-2026-0047.</p></div>
      <div class="ej-workspace-row"><span class="ej-workspace-label">Evidence</span><p>Budget certificate, authority confirmation, policy review — verified.</p></div>
      <div class="ej-workspace-row"><span class="ej-workspace-label">Outcome</span><p>€250,000 procurement executable with auditable record.</p></div>
    </div>
    <p>Authority, budget, approvals, policy and evidence were confirmed before commitment. The workspace does not invent a new report after the fact — it presents the same validation that allowed execution to proceed.</p>
  </div>
</section>
</div>
<section class="ej-next" aria-label="Next step" data-ej-static="true">
  <div class="wrap ej-next-inner">
    <a class="pill-btn primary ej-next-btn" href="/proof">View public proof</a>
  </div>
</section>`.trim();

const PILOT_CONTENT = `
<div data-ej-content data-ej-static="true">
<section class="ej-page ej-page-pilot" aria-labelledby="ej-pilot-heading">
  <div class="wrap">
    <span class="kicker">PILOT — ADOPTION</span>
    <h1 id="ej-pilot-heading">Request an institutional pilot</h1>
    <p class="lead">Move from understanding to governed adoption with a structured institutional pilot. EXECUTIA pilots are for mission-critical organizations that need execution validated before it happens — not reconstructed afterwards.</p>
    <p class="lead">A pilot starts from a real executive scenario (such as a large procurement), runs it through Engine validation gates, reviews the evidence record with leadership, and then plans deployment into EXECUTIA ONE under a clear agreement.</p>
    <div class="ej-pilot-value">
      <h2>Pilot process</h2>
      <ol class="ej-pilot-list ej-pilot-process">
        <li>Executive assessment and scope definition</li>
        <li>Live scenario validation in ENGINE</li>
        <li>Evidence review and board briefing</li>
        <li>Pilot agreement and deployment planning</li>
      </ol>
      <h2>Expected timeline</h2>
      <p class="ej-pilot-timeline">4–6 weeks from request to governed pilot launch.</p>
      <h2>What you receive</h2>
      <ul class="ej-pilot-list">
        <li>Executive Summary and Execution Score</li>
        <li>Validated pilot scope with evidence record</li>
        <li>Improvement roadmap for mission-critical execution</li>
        <li>Path to operational deployment in EXECUTIA ONE</li>
      </ul>
      <p>The goal is governed adoption: authority, budget, approvals, policy and evidence checked before irreversible commitment. Request a pilot when your organization is ready to move from a public demonstration to a scoped institutional engagement.</p>
    </div>
  </div>
</section>
</div>
<section class="ej-next" aria-label="Next step" data-ej-static="true">
  <div class="wrap ej-next-inner">
    <a class="pill-btn primary ej-next-btn" href="/request">Request Pilot</a>
  </div>
</section>`.trim();

function injectFooter(html) {
  // Already SSR'd
  if (html.includes('data-footer-ssr="true"')) {
    // Refresh institutional/legal footer body if mount was already replaced — rewrite footer block
    html = html.replace(
      /<footer class="site-footer entry-footer"[\s\S]*?<\/footer>/,
      renderInstitutionalFooter(),
    );
    html = html.replace(
      /<footer class="site-footer legal-footer"[\s\S]*?<\/footer>/,
      renderLegalFooter(),
    );
    return html;
  }
  if (html.includes('data-platform-footer="legal"') || html.includes("data-platform-footer='legal'")) {
    return html.replace(/<div\s+data-platform-footer="legal"\s*><\/div>/i, renderLegalFooter());
  }
  if (html.includes('data-platform-footer')) {
    return html.replace(/<div\s+data-platform-footer(?:="[^"]*")?\s*><\/div>/i, renderInstitutionalFooter());
  }
  return html;
}

function injectJourney(html, page) {
  const map = { engine: ENGINE_CONTENT, one: ONE_CONTENT, pilot: PILOT_CONTENT };
  const content = map[page];
  if (!content) return html;
  // Replace empty mounts (or previously injected block)
  if (html.includes('data-ej-static="true"')) {
    html = html.replace(
      /<main class="main">[\s\S]*?<\/main>/,
      `<main class="main">\n  ${content}\n</main>`,
    );
    return html;
  }
  return html.replace(
    /<main class="main">\s*<div data-ej-content><\/div>\s*<div data-ej-next><\/div>\s*<\/main>/,
    `<main class="main">\n  ${content}\n</main>`,
  );
}

const files = readdirSync(root).filter((f) => f.endsWith('.html'));
let changed = 0;
for (const file of files) {
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  const before = html;
  html = injectFooter(html);
  const pageMatch = html.match(/data-page="([^"]+)"/);
  const page = pageMatch?.[1];
  if (page === 'engine' || page === 'one' || page === 'pilot') {
    html = injectJourney(html, page);
  }
  if (html !== before) {
    writeFileSync(path, html);
    changed += 1;
    console.log('updated', file);
  }
}
console.log('done', { files: files.length, changed });

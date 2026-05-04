(function(){
  // Live execution status — rotating
  const statusEl = document.getElementById('live-status');
  if (statusEl) {
    const statuses = [
      'VALIDATION LAYER ACTIVE',
      'RULE ENGINE SYNCHRONIZED',
      'LEDGER CONNECTED',
      'EXECUTION READY',
      'AUDIT RECORDING',
      'REGISTRY LIVE'
    ];
    let si = 0;
    function updateStatus() {
      si = (si + 1) % statuses.length;
      statusEl.textContent = statuses[si];
    }
    setInterval(updateStatus, 4000);
  }

  // Live timestamp — UTC
  const ts = document.getElementById('live-ts');
  if (ts) {
    function updateTs() {
      const now  = new Date();
      const time = now.toLocaleTimeString('en-GB', {
        hour:     '2-digit',
        minute:   '2-digit',
        second:   '2-digit',
        timeZone: 'UTC'
      });
      ts.textContent = time + ' UTC';
    }
    updateTs();
    setInterval(updateTs, 1000);
  }

  // Nav active state
  const path = window.location.pathname.replace(/\.html$/, '') || '/';
  document.querySelectorAll('[data-nav]').forEach(a=>{
    const key=a.getAttribute('data-nav');
    const isActive =
      (key === 'entry' && path === '/') ||
      (key === 'global' && path === '/global') ||
      (key === 'institutional' && path === '/institutional') ||
      (key === 'request' && path === '/request');
    if (isActive) a.classList.add('active');
  });


  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if(menuToggle && nav){
    menuToggle.addEventListener('click',()=>{
      const open = nav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded','false');
    }));
  }

  const demo = document.getElementById('execution-demo-form');
  if(demo){
    const set=(id,v,c)=>{const el=document.getElementById(id); if(!el)return; el.textContent=v; el.className=c||'';};
    demo.addEventListener('submit', async e=>{
      e.preventDefault();
      const text=(document.getElementById('demo-input')?.value||'').trim();
      set('s-request','RUNNING'); set('s-validation','CHECKING'); set('s-decision','—'); set('s-registry','—'); set('s-ledger','—'); set('s-audit','—');
      const msg=document.getElementById('demo-message'); if(msg) msg.textContent='Execution engine is validating the request.';
      try{
        const res=await fetch('https://execution.executia.io/api/v1/execute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({intended_result:text||'Approve controlled execution',source:'executia.io',mode:'PUBLIC_DEMO'})});
        const json=await res.json().catch(()=>({}));
        if(!res.ok||json.ok===false) throw new Error(json.error||'ENGINE_UNAVAILABLE');
        set('s-request','ACCEPTED'); set('s-validation',json.validation||'PASSED'); set('s-decision',json.decision||'APPROVED'); set('s-registry',json.registry_status||'COMMITTED'); set('s-ledger',json.ledger_status||'RECORDED'); set('s-audit',json.audit_status||'TRACEABLE');
        if(msg) msg.textContent='Live execution completed. Open the engine registry for full proof.';
      }catch(err){
        set('s-request','ENGINE CONNECTION REQUIRED'); set('s-validation','—'); set('s-decision','—'); set('s-registry','—'); set('s-ledger','—'); set('s-audit','—');
        if(msg) msg.textContent='Open the live engine for validated proof. No approval is shown without engine confirmation.';
      }
    });
  }

  const req=document.getElementById('request-form');
  if(req){
    req.addEventListener('submit',async e=>{
      e.preventDefault();
      const msg=document.getElementById('form-message');
      msg.textContent='Submitting execution request...'; msg.className='form-msg';
      const payload=Object.fromEntries(new FormData(req));
      try{
        const res=await fetch('/api/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const json=await res.json().catch(()=>({}));
        if(!res.ok||json.ok===false) throw new Error(json.error||'REQUEST_FAILED');
        msg.textContent='Request registered. Confirmation email sent. EXECUTIA operator copy sent.'; msg.className='form-msg success'; req.reset();
      }catch(err){
        msg.textContent='Request not confirmed. Use contact@executia.io or check Vercel email environment variables.'; msg.className='form-msg error';
      }
    });
  }
})();

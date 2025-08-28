(function(){
  const $ = id => document.getElementById(id);
  const endpoints = { check:'/api/check-key', generate:'/api/generate-video', getOp:'/api/get-operation' };
  const POLL_INTERVAL = 3000; // ms

  // UI refs
  const keyInput = $('apiKey'); const btnCheck = $('btnCheck'); const btnClearKey = $('btnClearKey');
  const btnGenerate = $('btnGenerate'); const btnCancel = $('btnCancel'); const statusEl = $('status');
  const runBadge = $('runBadge'); const logEl = $('log'); const errorsEl = $('errors'); const videoBox = $('videoBox');
  const historyList = $('historyList'); const btnClearHistory = $('btnClearHistory');

  let currentJob = null; let pollTimer = null; let abortController = null;

  function log(msg){ const t = new Date().toLocaleTimeString(); logEl.textContent += `
${t} — ${msg}`; logEl.scrollTop = logEl.scrollHeight; }
  function setBadge(s){ runBadge.textContent = s; }
  function setStatus(s){ statusEl.textContent = s; }
  function showError(msg){ errorsEl.hidden = false; errorsEl.textContent = msg; setBadge('Error'); }
  function clearError(){ errorsEl.hidden = true; errorsEl.textContent = ''; }

  // Job history (stored in localStorage)
  function loadHistory(){ try{ return JSON.parse(localStorage.getItem('veo_history')||'[]'); }catch(e){return [];} }
  function saveHistory(arr){ localStorage.setItem('veo_history', JSON.stringify(arr)); }
  function addHistory(item){ const h = loadHistory(); h.unshift(item); saveHistory(h); renderHistory(); }
  function renderHistory(){ const h = loadHistory(); historyList.innerHTML = '';
    if(h.length===0){ historyList.innerHTML = '<div class="help">No history yet.</div>'; return; }
    h.slice(0,40).forEach(j=>{ const el = document.createElement('div'); el.className='history-item';
      el.innerHTML = `<div><strong>${j.model}</strong> <small>${j.resolution} • ${j.aspect}</small></div>`+
                     `<div><small>${new Date(j.ts).toLocaleString()}</small></div>`+
                     `<div style="margin-top:8px"><a href="${j.url||'#'}" target="_blank" ${j.url?'':'aria-disabled="true"'}>Preview/Download</a> • <button data-id="${j.jobId||''}" class="btn ghost btn-repoll">Poll</button></div>`;
      historyList.appendChild(el);
    });
  }

  // Clear history
  btnClearHistory.addEventListener('click', ()=>{ if(confirm('Clear job history?')){ saveHistory([]); renderHistory(); } });

  // Key check
  btnCheck.addEventListener('click', async ()=>{
    const key = keyInput.value.trim(); if(!key){ alert('Paste your API key first'); return; }
    setStatus('Checking key...'); setBadge('Checking'); log('Checking API key');
    try{
      const res = await fetch(endpoints.check, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:key})});
      const j = await res.json(); if(j.ok){ setBadge('Ready'); setStatus(j.hasVeo? 'Key valid — Veo available' : 'Key valid — Veo not visible'); log('Key check ok'); } else { setBadge('Invalid'); setStatus('Invalid key'); showError(j.message||'Invalid key'); }
    }catch(e){ showError('Network error during key check'); log('Key check failed'); }
  });

  btnClearKey.addEventListener('click', ()=>{ keyInput.value=''; setBadge('Idle'); setStatus('Key cleared'); clearError(); });

  // Generate
  btnGenerate.addEventListener('click', async ()=>{
    clearError(); const apiKey = keyInput.value.trim(); const prompt = $('prompt').value.trim(); if(!apiKey){ showError('Paste API key'); return; } if(!prompt){ showError('Write a prompt'); return; }
    const payload = {
      apiKey, model: $('model').value, aspect: $('aspect').value, person: $('person').value, resolution: $('resolution').value, prompt, negative: $('negative').value.trim()
    };

    btnGenerate.disabled = true; btnCancel.disabled = false; setBadge('Submitting'); setStatus('Sending to server'); log('Submitting generation request');
    try{
      abortController = new AbortController();
      const r = await fetch(endpoints.generate, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:abortController.signal});
      const j = await r.json(); if(!j.ok){ showError(j.message||'Upstream error'); btnGenerate.disabled = false; btnCancel.disabled = true; return; }

      // Cases: immediate url/base64 OR jobId
      if(j.url||j.base64){ setBadge('Done'); setStatus('Finished'); log('Received direct video'); renderVideo(j); addHistory({ts:Date.now(),model:payload.model,aspect:payload.aspect,resolution:payload.resolution,url:j.url||null,jobId:j.jobId||null}); }
      else if(j.jobId){ // start polling
        currentJob = { jobId:j.jobId, apiKey: apiKey, model: payload.model, aspect: payload.aspect, resolution: payload.resolution };
        setBadge('Queued'); setStatus('Job queued — polling'); log('Job queued: '+j.jobId);
        addHistory({ts:Date.now(),model:payload.model,aspect:payload.aspect,resolution:payload.resolution,url:null,jobId:j.jobId});
        startPolling();
      } else { showError('Unknown response from server'); }
    }catch(e){ if(e.name==='AbortError'){ log('Request aborted'); setStatus('Cancelled'); setBadge('Idle'); } else { showError(e.message||'Generation failed'); } }
    finally{ btnGenerate.disabled = false; }
  });

  btnCancel.addEventListener('click', ()=>{
    if(abortController) abortController.abort(); stopPolling(); btnCancel.disabled = true; btnGenerate.disabled = false; setStatus('Cancelled'); setBadge('Idle'); log('User cancelled');
  });

  // Polling logic
  async function pollOnce(){ if(!currentJob) return; try{
      setBadge('Polling'); const res = await fetch(endpoints.getOp,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:currentJob.apiKey, operationName: currentJob.jobId})});
      const j = await res.json(); if(!j.ok){ log('Polling: error '+(j.message||'')); return; }
      // j: { done: bool, progress: {percent, stage}, url?, base64?, resultOperation? }
      if(j.done){ stopPolling(); setBadge('Done'); setStatus('Finished'); renderVideo(j); log('Job finished'); // update last history entry with url if possible
        const h = loadHistory(); if(h.length>0 && h[0].jobId===currentJob.jobId){ h[0].url = j.url || h[0].url; saveHistory(h); renderHistory(); }
        currentJob = null; return; }
      setStatus(`Processing — ${j.progress?.stage||'working'} ${j.progress?.percent? '('+j.progress.percent+'%)':''}`); setBadge('Processing'); log('Polling: '+JSON.stringify(j.progress||{}));
    }catch(e){ log('Polling failed: '+e.message); }
  }
  function startPolling(){ if(pollTimer) return; pollTimer = setInterval(pollOnce, POLL_INTERVAL); pollOnce(); }
  function stopPolling(){ if(pollTimer){ clearInterval(pollTimer); pollTimer=null; } }

  // Render video in UI
  function renderVideo(res){ videoBox.innerHTML=''; if(res.url){ const a = document.createElement('a'); a.href=res.url; a.target='_blank'; a.textContent='Open video in new tab / download'; videoBox.appendChild(a); }
    else if(res.base64){ const v = document.createElement('video'); v.controls=true; v.src='data:video/mp4;base64,'+res.base64; v.style.width='100%'; videoBox.appendChild(v); }
    else if(res.video && res.video.uri){ const a = document.createElement('a'); a.href=res.video.uri; a.target='_blank'; a.textContent='Open video'; videoBox.appendChild(a); }
    else { videoBox.innerHTML = '<div class="help">No preview available yet.</div>'; }
  }

  // Click on history poll buttons
  historyList.addEventListener('click', async (ev)=>{
    if(ev.target.classList.contains('btn-repoll')){
      const jobId = ev.target.getAttribute('data-id'); if(!jobId) return; const apiKey = keyInput.value.trim(); if(!apiKey){ alert('Paste API key to repoll.'); return; }
      currentJob = {jobId, apiKey}; startPolling(); setStatus('Polling history job'); setBadge('Polling'); log('Repolling '+jobId);
    }
  });

  // Init
  function init(){ renderHistory(); setBadge('Idle'); setStatus('Ready'); log('App ready'); }
  init();
})();

export const config = { runtime: 'edge' };

function jsonRes(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } }); }

export default async function handler(req){
  if(req.method!=='POST') return jsonRes({ ok:false, message:'POST only' },405);
  let body; try{ body = await req.json(); }catch(e){ return jsonRes({ ok:false, message:'Invalid JSON' },400); }
  const { apiKey, model, aspect, person, resolution, prompt, negative } = body || {};
  if(!apiKey || !model || !prompt) return jsonRes({ ok:false, message:'Missing fields' },400);

  const [w,h] = resolution==='1080p' ? [1920,1080] : [1280,720];

  const safety = (()=>{ switch(person){ case 'allow_all': return { allowAdultContent:false }; case 'allow_adult': return { allowAdultContent:true }; case 'not_allow': return { allowAdultContent:false, blockPersons:true }; default: return {}; } })();

  // TODO: Update endpoint & payload to match the latest Google Veo API.
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateVideo`;
  const payload = {
    prompt,
    negativePrompt: negative || undefined,
    videoConfig: { width: w, height: h, aspectRatio: aspect },
    safetySettings: safety
  };

  try{
    const upstream = await fetch(endpoint + `?key=${encodeURIComponent(apiKey)}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    if(!upstream.ok){ const txt = await upstream.text(); return jsonRes({ ok:false, message:'Upstream error', detail: txt },502); }
    const data = await upstream.json();
    // Case: immediate content
    if(data?.video?.base64) return jsonRes({ ok:true, base64: data.video.base64 });
    if(data?.video?.uri) return jsonRes({ ok:true, url: data.video.uri });
    // Case: long-running operation
    if(data?.name || data?.operation || data?.jobId) return jsonRes({ ok:true, jobId: data.name || data.operation || data.jobId });
    return jsonRes({ ok:false, message:'Unknown upstream response', raw:data },500);
  }catch(err){ return jsonRes({ ok:false, message: err?.message || 'Fetch error' },500); }
}

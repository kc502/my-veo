export const config = { runtime: 'edge' };
function jsonRes(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } }); }

export default async function handler(req){
  if(req.method!=='POST') return jsonRes({ ok:false, message:'POST only' },405);
  let body; try{ body = await req.json(); }catch(e){ return jsonRes({ ok:false, message:'Invalid JSON' },400); }
  const { apiKey, operationName } = body || {};
  if(!apiKey || !operationName) return jsonRes({ ok:false, message:'Missing apiKey or operationName' },400);

  // The operations.get endpoint for Google long-running operations usually is:
  // GET https://generativelanguage.googleapis.com/v1beta/{name=operations/*}
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${encodeURIComponent(operationName)}`;

  try{
    const res = await fetch(endpoint + `?key=${encodeURIComponent(apiKey)}`, { headers:{'Content-Type':'application/json'} });
    if(!res.ok){ const txt = await res.text(); return jsonRes({ ok:false, message:'Upstream op get failed', detail: txt },502); }
    const data = await res.json();
    // Expected op response may include: done: bool, response/result, metadata for progress
    // Map to { ok:true, done, progress:{percent,stage}, url?, base64? }
    const done = !!data?.done;
    let progress = null;
    if(data?.metadata){ progress = data.metadata.progress || data.metadata; }

    if(done){
      // If operation finished, the response might be in data.response or data.result
      const resp = data.response || data.result || {};
      // Try to extract video.uri or video.base64 conservatively
      if(resp?.video?.uri) return jsonRes({ ok:true, done:true, url: resp.video.uri });
      if(resp?.video?.base64) return jsonRes({ ok:true, done:true, base64: resp.video.base64 });
      // If unknown, return done:true with raw
      return jsonRes({ ok:true, done:true, raw: resp });
    }

    return jsonRes({ ok:true, done:false, progress });
  }catch(e){ return jsonRes({ ok:false, message: e.message || 'Fetch failed' },500); }
}

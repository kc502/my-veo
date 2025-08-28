export const config = { runtime: 'edge' };
function jsonRes(obj, status=200){ return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } }); }

export default async function handler(req){
  if(req.method!=='POST') return jsonRes({ ok:false, message:'POST only' },405);
  let body; try{ body = await req.json(); }catch(e){ return jsonRes({ ok:false, message:'Invalid JSON' },400); }
  const { apiKey } = body || {}; if(!apiKey) return jsonRes({ ok:false, message:'Missing apiKey' },400);
  try{
    const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(apiKey);
    const res = await fetch(url, { headers:{'Content-Type':'application/json'} });
    if(!res.ok) return jsonRes({ ok:false, message:'Invalid or blocked key' },200);
    const data = await res.json(); const hasVeo = Array.isArray(data?.models) && data.models.some(m => (m?.name||'').includes('veo'));
    return jsonRes({ ok:true, hasVeo });
  }catch(e){ return jsonRes({ ok:false, message:'Network error' },200); }
}

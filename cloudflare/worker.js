// Deploy behind Cloudflare Access for /admin/* and /api/inquiries*.
// Public access must be limited to POST /api/submit. Never expose the D1 database or Access token.
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max+1):'';
function cors(request,env){const origin=request.headers.get('Origin');return origin===env.ALLOWED_ORIGIN?{'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'Content-Type'}:{}}
function validEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)}
export default {
 async fetch(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(path==='/api/submit'){
   const headers=cors(request,env);
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
   if(request.method!=='POST')return json({error:'Method not allowed'},405,headers);
   if(request.headers.get('Origin')!==env.ALLOWED_ORIGIN)return json({error:'Forbidden origin'},403,headers);
   if(Number(request.headers.get('Content-Length')||0)>16000)return json({error:'Payload too large'},413,headers);
   let input;try{input=await request.json()}catch{return json({error:'Invalid JSON'},400,headers)}
   const name=clean(input.name,100),email=clean(input.email,254),vrchat=clean(input.vrchat_id,100),message=clean(input.message,5000);
   if(input.website)return json({ok:true},200,headers);
   if(input.consent!=='on'&&input.consent!==true)return json({error:'Consent required'},400,headers);
   if(!name||name.length>100||!validEmail(email)||email.length>254||!vrchat||vrchat.length>100||!message||message.length>5000)return json({error:'Invalid fields'},400,headers);
   const id=crypto.randomUUID();
   try{await env.DB.prepare('INSERT INTO inquiries (id,name,email,vrchat_id,message) VALUES (?,?,?,?,?)').bind(id,name,email,vrchat,message).run()}catch{return json({error:'Storage unavailable'},503,headers)}
   return json({ok:true},201,headers);
  }
  // Cloudflare Access MUST protect these paths. The Worker additionally requires the
  // Access-injected identity header; never accept it as sole authentication if Access is disabled.
  if(path==='/api/inquiries'||path.startsWith('/api/inquiries/')){
   if(!request.headers.get('Cf-Access-Authenticated-User-Email'))return json({error:'Access required'},403);
   if(path==='/api/inquiries'&&request.method==='GET'){
    const rows=await env.DB.prepare('SELECT id,created_at,name,email,vrchat_id,message,status FROM inquiries ORDER BY created_at DESC LIMIT 300').all();
    return json({inquiries:rows.results});
   }
   const match=path.match(/^\/api\/inquiries\/([a-f0-9-]{36})$/);
   if(match&&request.method==='PATCH'){
    let body;try{body=await request.json()}catch{return json({error:'Invalid JSON'},400)}
    if(!['new','in_progress','done'].includes(body.status))return json({error:'Invalid status'},400);
    await env.DB.prepare('UPDATE inquiries SET status=? WHERE id=?').bind(body.status,match[1]).run();
    return json({ok:true});
   }
   return json({error:'Not found'},404);
  }
  if(path==='/admin/'||path==='/admin'){
   if(!request.headers.get('Cf-Access-Authenticated-User-Email'))return json({error:'Access required'},403);
   return new Response(ADMIN_HTML,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-frame-options':'DENY','content-security-policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"}});
  }
  return json({error:'Not found'},404);
 }
};
const ADMIN_HTML=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Studio KEEP 문의함</title><style>body{font:15px system-ui;background:#101114;color:#eee;max-width:1100px;margin:40px auto;padding:0 20px}h1{font-size:28px}button,select{font:inherit;padding:7px;background:#262930;color:#fff;border:1px solid #777;border-radius:5px}button{cursor:pointer}article{background:#1c1e23;border:1px solid #41444a;border-radius:10px;padding:20px;margin:15px 0}small{color:#aaa}p{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#b9e7f9}</style><h1>Studio KEEP · 문의함</h1><p>관리자 전용 · 최신 300건</p><button id="refresh">새로고침</button><div id="items" role="status">불러오는 중…</div><script>const items=document.getElementById('items');async function load(){try{const r=await fetch('/api/inquiries',{credentials:'same-origin'});if(!r.ok)throw Error('접근 권한을 확인해 주세요.');const data=await r.json();items.replaceChildren();if(!data.inquiries.length){items.textContent='접수된 문의가 없습니다.';return}for(const x of data.inquiries){const card=document.createElement('article');const title=document.createElement('h2');title.textContent=x.name+' · '+x.vrchat_id;const meta=document.createElement('small');meta.textContent=x.created_at+' · '+x.email;const body=document.createElement('p');body.textContent=x.message;const status=document.createElement('select');for(const [v,t] of [['new','미처리'],['in_progress','처리 중'],['done','완료']]){const opt=document.createElement('option');opt.value=v;opt.textContent=t;status.append(opt)}status.value=x.status;status.addEventListener('change',async()=>{status.disabled=true;try{const r=await fetch('/api/inquiries/'+encodeURIComponent(x.id),{method:'PATCH',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({status:status.value})});if(!r.ok)throw Error('저장 실패')}catch(e){alert(e.message);await load()}finally{status.disabled=false}});card.append(title,meta,body,status);items.append(card)}}catch(e){items.textContent=e.message}}document.getElementById('refresh').onclick=load;load();<\/script></html>`;

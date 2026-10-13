// GitHub OAuth broker for Decap. No secrets are served in frontend config.
const encoder=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const unb64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
async function key(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function sign(payload,secret){const body=b64(encoder.encode(JSON.stringify(payload)));return body+'.'+b64(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(body)));}
export async function verify(value,secret){try{const [body,sig,...extra]=value.split('.');if(extra.length||!body||!sig)return null;if(!await crypto.subtle.verify('HMAC',await key(secret),unb64(sig),encoder.encode(body)))return null;return JSON.parse(new TextDecoder().decode(unb64(body)));}catch{return null;}}
const common={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'};
const cookie=value=>`keep_oauth=${value}; Path=/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=${value?600:0}`;
const js=value=>JSON.stringify(value).replaceAll('<','\\u003c');
function message(origin,payload){const nonce=random();return new Response(`<!doctype html><html lang="ko"><meta charset="utf-8"><title>Studio KEEP 인증</title><p>인증을 완료하는 중입니다. 이 창이 닫히면 관리자 화면으로 돌아가세요.</p><script nonce="${nonce}">const origin=${js(origin)};const openerWindow=window.opener;if(openerWindow){window.addEventListener('message',function receive(e){if(e.origin!==origin||e.source!==openerWindow||e.data!=='authorizing:github')return;window.removeEventListener('message',receive);openerWindow.postMessage(${js(payload)},origin);setTimeout(()=>window.close(),300);});openerWindow.postMessage('authorizing:github',origin);}else{document.querySelector('p').textContent='관리자 페이지에서 다시 로그인해 주세요.';}</script></html>`,{headers:{...common,'Content-Type':'text/html; charset=utf-8','Set-Cookie':cookie(''),'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`}});}
export async function handle(request,env,fetcher=fetch){
 const url=new URL(request.url);
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:common});
 if(url.pathname==='/health')return new Response('Studio KEEP OAuth',{headers:common});
 if(!['/auth','/callback'].includes(url.pathname))return new Response('Not found',{status:404,headers:common});
 try{
  const origin=new URL(env.SITE_ORIGIN).origin;
  if(origin!==env.SITE_ORIGIN||!origin.startsWith('https://')||!env.OAUTH_CLIENT_ID||!env.OAUTH_CLIENT_SECRET||!env.STATE_SECRET||env.STATE_SECRET.length<32||!/^[-\w.]+\/[-\w.]+$/.test(env.GITHUB_REPOSITORY)||!env.ADMIN_LOGINS)throw Error('configuration');
  const callback=new URL('/callback',request.url).href;
  if(url.pathname==='/auth'){
   if(url.searchParams.get('provider')!=='github')return new Response('Unsupported provider',{status:400,headers:common});
   // Decap passes site_id, but it is not an authorization boundary. Only configured origin receives tokens.
   const verifier=random(),state=random();
   const signed=await sign({state,verifier,exp:Date.now()+600000},env.STATE_SECRET);
   const authorize=new URL('https://github.com/login/oauth/authorize');
   authorize.search=new URLSearchParams({client_id:env.OAUTH_CLIENT_ID,redirect_uri:callback,scope:'public_repo',state,code_challenge:b64(await crypto.subtle.digest('SHA-256',encoder.encode(verifier))),code_challenge_method:'S256'}).toString();
   return new Response(null,{status:302,headers:{...common,Location:authorize.href,'Set-Cookie':cookie(signed)}});
  }
  const signed=request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('keep_oauth='))?.slice(11)||'';
  const session=await verify(signed,env.STATE_SECRET);
  if(!session||!Number.isFinite(session.exp)||session.exp<Date.now()||session.exp>Date.now()+600000||session.state!==url.searchParams.get('state')||!url.searchParams.get('code'))return new Response('인증 요청이 만료되었거나 일치하지 않습니다. 다시 로그인해 주세요.',{status:400,headers:{...common,'Set-Cookie':cookie('')}});
  const tokenResponse=await fetcher('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.OAUTH_CLIENT_ID,client_secret:env.OAUTH_CLIENT_SECRET,code:url.searchParams.get('code'),redirect_uri:callback,code_verifier:session.verifier})});
  const token=await tokenResponse.json();if(!tokenResponse.ok||typeof token.access_token!=='string'||!token.access_token)throw Error('exchange');
  const headers={Authorization:`Bearer ${token.access_token}`,Accept:'application/vnd.github+json','User-Agent':'Studio-KEEP-CMS','X-GitHub-Api-Version':'2022-11-28'};
  const [userRes,repoRes]=await Promise.all([fetcher('https://api.github.com/user',{headers}),fetcher(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}`,{headers})]);
  if(!userRes.ok||!repoRes.ok)throw Error('permissions');
  const [user,repo]=await Promise.all([userRes.json(),repoRes.json()]);
  const admins=env.ADMIN_LOGINS.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  if(typeof user.login!=='string'||!admins.includes(user.login.toLowerCase())||repo.permissions?.push!==true)throw Error('permissions');
  return message(origin,'authorization:github:success:'+JSON.stringify({token:token.access_token,provider:'github'}));
 }catch{return env.SITE_ORIGIN?.startsWith('https://')?message(env.SITE_ORIGIN,'authorization:github:error:'+JSON.stringify({message:'인증 실패. 관리자 명단과 저장소 쓰기 권한을 확인해 주세요.'})):new Response('Authentication service is not configured',{status:503,headers:common});}
}
export default {fetch:handle};

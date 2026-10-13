// Real HTTP checks only. This does NOT replace the two-admin browser save test.
const [base,commit]=process.argv.slice(2);
if(!base||!commit)throw Error('사용법: npm run verify:live -- https://OWNER.github.io/REPO/ COMMIT_SHA');
const root=new URL(base.endsWith('/')?base:base+'/');
if(root.protocol!=='https:')throw Error('HTTPS URL required');
async function get(p){const u=new URL(p,root);u.searchParams.set('verify',commit);const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`${p}: HTTP ${r.status}`);return r;}
let info;for(let attempt=0;attempt<12;attempt++){try{info=await(await get('build-info.json')).json();if(info.commit===commit)break;}catch{}if(attempt<11)await new Promise(r=>setTimeout(r,5000));}
if(info?.commit!==commit)throw Error('배포된 커밋이 요청한 SHA와 다릅니다. 최신 배포/캐시를 확인하세요.');
const html=await(await get('index.html')).text();if(!html.includes('data/content.js'))throw Error('콘텐츠 로더 없음');
const config=await(await get('admin/config.yml')).text();if(config.includes('__REPOSITORY__')||config.includes('.invalid'))throw Error('CMS 설정 미완료');
await get('admin/');await get('event.js');await get('assets/kipfel-cursor.png');await get('data/content.js');
const data=await(await get('data/content.json')).json();
for(const r of Object.values(data).flat())if(r.image)await get(r.image);
const auth=config.match(/^  base_url: (.+)$/m)?.[1];if(!auth)throw Error('인증 URL 없음');
const health=await fetch(new URL('/health',auth),{cache:'no-store'});if(!health.ok)throw Error('인증 서비스 응답 실패');
console.log(JSON.stringify({status:'HTTP 검증 통과',commit:info.commit,counts:info.counts,site:root.href,note:'실제 CMS 로그인·저장 시험은 별도 수동 검증 필요'},null,2));

import {readFile,writeFile,mkdir,cp,rm,readdir,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const roles=['연출','편집','3D','연기','운영','인사','홍보'];
const groups=['FILM','WORLD / GAME','EXPERIENCE','3D / DESIGN'];
const text=(r,k,required=false)=>{const v=r[k]??'';if(typeof v!=='string'||v.length>50000||(required&&!v.trim()))throw Error(`${r.id}: ${k} 문자열을 확인하세요`);return v;};
const list=(r,k)=>{const v=r[k]??[];if(!Array.isArray(v)||v.some(x=>typeof x!=='string'||!slug.test(x)))throw Error(`${r.id}: ${k} 참조 ID 오류`);return [...new Set(v)];};
function record(r,type,file){
 if(!r||typeof r!=='object'||!slug.test(r.id)||file!==r.id+'.json')throw Error(`${file}: ID와 파일 이름이 일치해야 합니다`);
 if(typeof r.published!=='boolean')throw Error(`${file}: 공개 여부가 필요합니다`);
 if(r.order!=null&&(!Number.isInteger(r.order)||r.order<0))throw Error(`${file}: 순서는 0 이상의 정수입니다`);
 const out={id:r.id,order:r.order??0};
 const fields=type==='members'?['name','desc']:type==='projects'?['title','desc','status']:['title','body'];
 for(const k of fields){out[k]=text(r,k,k===fields[0]||k==='body');for(const locale of ['en','ja'])out[k+'_'+locale]=text(r,k+'_'+locale);}
 out.image=text(r,'image');
 if(out.image&&(!/^uploads\/[^\\<>:\x00-\x1f?#%]+\.(png|jpe?g|webp|gif)$/i.test(out.image)||out.image.split('/').some(p=>!p||p==='.'||p==='..')))throw Error(`${file}: 이미지 파일은 uploads/ 아래 PNG JPG WEBP GIF만 가능합니다`);
 if(type==='members'){if(!roles.includes(r.role))throw Error(`${file}: 분야 오류`);out.role=r.role;out.featured_projects=list(r,'featured_projects');}
 if(type==='projects'){if(!groups.includes(r.group))throw Error(`${file}: 카테고리 오류`);out.group=r.group;out.category=text(r,'category')||r.group;out.art=['film','moon','portal'].includes(r.art)?r.art:'film';out.credits=list(r,'credits');out.url=text(r,'url');if(out.url){const u=new URL(out.url);if(u.protocol!=='https:'||u.username||u.password)throw Error(`${file}: 작품 링크는 HTTPS URL이어야 합니다`);}}
 if(type==='announcements'){out.date=text(r,'date',true);if(!/^\d{4}-\d{2}-\d{2}$/.test(out.date)||new Date(out.date).toISOString().slice(0,10)!==out.date)throw Error(`${file}: 날짜 오류`);}
 return out;
}
export async function build({root=process.cwd(),out=path.join(root,'dist'),env=process.env}={}){
 // Never allow an output directory to erase a source directory.
 if(path.resolve(out)!==path.join(path.resolve(root),'dist'))throw Error('출력은 프로젝트 dist/로만 가능합니다');
 const repo=env.GITHUB_REPOSITORY||'3minn/StudioKEEP.github.io';const auth=env.CMS_AUTH_URL||'https://auth-not-configured.invalid';const site=env.SITE_URL||'https://site-not-configured.invalid';
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw Error('GITHUB_REPOSITORY 오류');
 for(const u of [auth,site]){const p=new URL(u);if(p.protocol!=='https:'||p.search||p.hash||p.username||p.password)throw Error('배포 URL은 HTTPS여야 합니다');}
 if(new URL(auth).pathname!=='/')throw Error('CMS_AUTH_URL은 경로 없는 인증 서비스 origin입니다');
 if(env.CI==='true'&&(repo==='OWNER/REPOSITORY'||auth.includes('.invalid')||site.includes('.invalid')))throw Error('배포 설정 누락: CMS_AUTH_URL, SITE_URL, GITHUB_REPOSITORY');
 const data={members:[],projects:[],announcements:[]};const warnings=[];
 for(const type of Object.keys(data))for(const file of (await readdir(path.join(root,'content',type))).filter(f=>f.endsWith('.json')).sort()){
   const r=JSON.parse(await readFile(path.join(root,'content',type,file),'utf8'));const normalized=record(r,type,file);if(r.published)data[type].push(normalized);
 }
 const memberIDs=new Set(data.members.map(m=>m.id)),projectIDs=new Set(data.projects.map(p=>p.id));
 for(const p of data.projects){for(const id of p.credits)if(!memberIDs.has(id))warnings.push(`${p.id}: 비공개/삭제된 멤버 참조 제외`);p.credits=p.credits.filter(id=>memberIDs.has(id));}
 for(const m of data.members){const participation=data.projects.filter(p=>p.credits.includes(m.id)).map(p=>p.id);m.works=[...new Set([...m.featured_projects.filter(id=>projectIDs.has(id)&&participation.includes(id)),...participation])];delete m.featured_projects;}
 for(const type of Object.keys(data))data[type].sort((a,b)=>type==='announcements'?b.date.localeCompare(a.date)||a.order-b.order||a.id.localeCompare(b.id):a.order-b.order||a.id.localeCompare(b.id));
 // Validate every public image before touching last known good output.
 const assets=[];const uploadRoot=await realpath(path.join(root,'content','uploads'));
 for(const row of Object.values(data).flat())if(row.image){const src=await realpath(path.join(root,'content',row.image));if(!src.startsWith(uploadRoot+path.sep)||(await stat(src)).isDirectory())throw Error('업로드 경로 이탈');const bytes=await readFile(src);if(bytes.length>10485760)throw Error('이미지는 10MB 이하여야 합니다');const ext=path.extname(src).toLowerCase();const valid=ext==='.png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):['.jpg','.jpeg'].includes(ext)?bytes[0]===255&&bytes[1]===216:ext==='.gif'?['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6)):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';if(!valid)throw Error('이미지 형식 불일치: '+row.image);assets.push({src,dest:row.image});}
 await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
 await cp(path.join(root,'site'),out,{recursive:true});await mkdir(path.join(out,'data'),{recursive:true});
 const json=JSON.stringify(data).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
 await writeFile(path.join(out,'data','content.js'),'window.KEEP_CONTENT = '+json+';\n');
 await writeFile(path.join(out,'data','content.json'),JSON.stringify(data,null,2)+'\n');
 for(const {src,dest} of assets){await mkdir(path.dirname(path.join(out,dest)),{recursive:true});await cp(src,path.join(out,dest));}
 await cp(path.join(root,'admin'),path.join(out,'admin'),{recursive:true});
 const config=(await readFile(path.join(out,'admin','config.yml'),'utf8')).replaceAll('__REPOSITORY__',repo).replaceAll('__AUTH_URL__',auth).replaceAll('__SITE_URL__',site.replace(/\/$/,''));
 await writeFile(path.join(out,'admin','config.yml'),config);
 await writeFile(path.join(out,'.nojekyll'),'');
 await writeFile(path.join(out,'build-info.json'),JSON.stringify({commit:env.GITHUB_SHA||'local',repository:repo,counts:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length]))},null,2)+'\n');
 return {data,warnings};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=await build();for(const w of result.warnings)console.warn(w);console.log('공개 콘텐츠 빌드 완료:',Object.fromEntries(Object.entries(result.data).map(([k,v])=>[k,v.length])));}

import {readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),dir=path.join(root,'content/projects');
const key=process.env.YOUTUBE_API_KEY;
if(!key){console.log('YOUTUBE_API_KEY 미설정: 동기화 건너뜀');process.exit(0)}
async function api(endpoint,params){const url=new URL('https://www.googleapis.com/youtube/v3/'+endpoint);for(const [k,v] of Object.entries({...params,key}))url.searchParams.set(k,String(v));const r=await fetch(url);if(!r.ok)throw Error('YouTube API '+r.status+': '+(await r.text()).slice(0,500));return r.json()}
const channel=(await api('channels',{part:'contentDetails',forHandle:'@studio_keep'})).items?.[0];
if(!channel)throw Error('YouTube 채널 @studio_keep를 찾지 못했습니다');
const playlist=channel.contentDetails.relatedPlaylists.uploads;
let pageToken='',ids=[];
do{const p=await api('playlistItems',{part:'contentDetails',playlistId:playlist,maxResults:50,...(pageToken?{pageToken}:{})});ids.push(...(p.items||[]).map(x=>x.contentDetails.videoId).filter(Boolean));pageToken=p.nextPageToken||''}while(pageToken&&ids.length<5000);
const videos=[];
for(let i=0;i<ids.length;i+=50){const p=await api('videos',{part:'snippet,status,contentDetails',id:ids.slice(i,i+50).join(',')});videos.push(...(p.items||[]).filter(x=>x.status?.privacyStatus==='public'&&x.snippet?.title))}
const members=await Promise.all((await readdir(path.join(root,'content/members'))).filter(x=>x.endsWith('.json')).map(async x=>JSON.parse(await readFile(path.join(root,'content/members',x),'utf8'))));
const normalizedName=s=>String(s).normalize('NFKC').toLowerCase().replace(/[\uFE0E\uFE0F\u200B-\u200D]/g,'').replace(/[^\p{L}\p{N}]/gu,'');
const nameMap=new Map();
for(const m of members.filter(m=>m.published))for(const name of [m.name,m.name_en,m.name_ja])if(name&&normalizedName(name).length>=3)nameMap.set(normalizedName(name),m.id);
const aliases={'3imnnute':'3minnute'};
const creditLine=/^\s*(?:production|producer|edit(?:or|ing)?|art|filming|act(?:or|ing)?|voice|cast|staff|credit(?:s)?|special thanks|제작(?:진)?|크레딧|출연|연출|편집|촬영|기획|감독|성우|디자인|모델링|운영|홍보|出演|制作|編集|撮影|声優)\s*[:：,\[]/i;
let created=0,updated=0,unmatched=new Set();
for(const video of videos){const id='yt-'+video.id,file=path.join(dir,id+'.json'),snippet=video.snippet,description=snippet.description||'';let existing=null;try{existing=JSON.parse(await readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
const creditLines=description.split(/\r?\n/).filter(line=>creditLine.test(line));
const credits=[];
for(const line of creditLines){const value=line.replace(/^\s*[^:：\]]+[:：,\]]\s*/,'').replace(/[\[\]]/g,'');for(const token of value.split(/[,，、]/)){const key=normalizedName(token.trim());const id=nameMap.get(aliases[key]||key);if(id)credits.push(id)}}
if(creditLines.length&&!credits.length)unmatched.add(video.id);
const row=existing?{...existing}:{id,published:true,order:10000,group:'FILM',art:'film',category:'YOUTUBE',status:'YouTube 공개 영상',credits:[]};
row.youtube_id=video.id;row.youtube_synced=true;row.youtube_thumbnail=snippet.thumbnails?.maxres?.url||snippet.thumbnails?.standard?.url||snippet.thumbnails?.high?.url||snippet.thumbnails?.medium?.url||'';
row.youtube_published_at=snippet.publishedAt||'';
const duration=video.contentDetails?.duration||'';const dm=duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);row.youtube_duration_seconds=dm?(Number(dm[1]||0)*3600+Number(dm[2]||0)*60+Number(dm[3]||0)):0;
row.title=snippet.title;row.desc=description.slice(0,50000);row.url='https://www.youtube.com/watch?v='+video.id;
row.category=video.contentDetails?.duration&&/^PT(?:[0-5]?\dS|1M(?:[0-9]S)?)$/.test(video.contentDetails.duration)?'YOUTUBE / SHORTS':'YOUTUBE / VIDEO';
row.credits=[...new Set([...(existing?.credits||[]),...credits])];
const serialized=JSON.stringify(row,null,2)+'\n';if(!existing){created++;await writeFile(file,serialized)}else if(JSON.stringify(existing)!==JSON.stringify(row)){updated++;await writeFile(file,serialized)}
}
console.log(JSON.stringify({publicVideos:videos.length,created,updated,creditReview:[...unmatched]},null,2));

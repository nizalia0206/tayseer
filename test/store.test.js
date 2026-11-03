'use strict';
// Shared storage (store.js): two separate server instances, like Vercel, share one stand-in Redis (Upstash REST API).
// Progress made on one instance must be seen by the other, and a share created on one must open on the other.
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),{spawn}=require('node:child_process'),path=require('node:path');
const RP=5600+Math.floor(Math.random()*300),A=RP+1,B=RP+2,kv=new Map();let redis,srvs=[];
const up=port=>spawn('node',[path.join(__dirname,'..','server.js')],{env:{...process.env,PORT:port,SESSION_SECRET:'store-test-secret',KV_REST_API_URL:`http://localhost:${RP}`,KV_REST_API_TOKEN:'t'},stdio:'ignore'});
test.before(async()=>{
 redis=http.createServer((req,res)=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{res.setHeader('content-type','application/json');
  if(req.headers.authorization!=='Bearer t'){res.statusCode=401;return res.end('{}')}const [cmd,k,v]=JSON.parse(b);
  if(cmd==='GET')return res.end(JSON.stringify({result:kv.has(k)?kv.get(k):null}));if(cmd==='SET'){kv.set(k,v);return res.end('{"result":"OK"}')}res.statusCode=400;res.end('{}')})}).listen(RP);
 srvs=[up(A),up(B)];
 for(const p of [A,B])for(let i=0;;i++){try{await fetch(`http://localhost:${p}/api/me`);break}catch{if(i>50)throw new Error('server did not start');await new Promise(r=>setTimeout(r,100))}}});
test.after(()=>{srvs.forEach(s=>s.kill());redis&&redis.close()});
const client=async(port,user)=>{const r=await fetch(`http://localhost:${port}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user,pin:'1234'})});
 const sid=r.headers.get('set-cookie').match(/sid=([^;]+)/)[1];
 return (p,b,on=port)=>fetch(`http://localhost:${on}/api`+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:'sid='+sid},body:b?JSON.stringify(b):undefined}).then(x=>x.json())};
test('store: onboarding progress on one instance is seen by another',async()=>{const c=await client(A,'sara');
 const start=(await c('/onboarding')).onb.step;for(let i=0;i<3;i++)await c('/onboarding',{action:'next'});
 assert.equal((await c('/onboarding',null,B)).onb.step,start+3,'instance B sees the steps taken on A');
 for(let i=0;i<6;i++)await c('/onboarding',{action:'next'},B);const card=await c('/onboarding',{action:'card'},A);assert.ok(!card.error,card.error);
 const ref=(await c('/onboarding',null,B)).onb.ref;assert.match(ref,/^EP-/);assert.equal((await c('/onboarding',null,A)).onb.ref,ref)});
test('store: a share link made on one instance opens on the other (grants survive)',async()=>{const c=await client(A,'sara');
 const g=await c('/grants',{ids:['ENR-1']});assert.ok(g.token,JSON.stringify(g));
 const rv=await client(B,'reviewer');const o=await rv('/grants/'+g.token+'/open',{});
 assert.ok(Array.isArray(o.records)&&o.records.length===1,'reviewer on B opened the share: '+JSON.stringify(o).slice(0,200))});

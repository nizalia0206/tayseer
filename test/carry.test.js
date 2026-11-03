'use strict';
// Vercel without a shared store: the demo state travels in signed cookies (carry.js).
// Two separate instances answer alternate requests from one browser; progress must persist, and a tampered cookie must be ignored.
const test=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
const P=5900+Math.floor(Math.random()*300),PORTS=[P,P+1];let srvs=[];
test.before(async()=>{srvs=PORTS.map(port=>spawn('node',[path.join(__dirname,'..','server.js')],{env:{...process.env,PORT:port,TAYSEER_CARRY:'1',SESSION_SECRET:'carry-test'},stdio:'ignore'}));
 for(const p of PORTS)for(let i=0;;i++){try{await fetch(`http://localhost:${p}/api/me`);break}catch{if(i>50)throw new Error('server did not start');await new Promise(r=>setTimeout(r,100))}}});
test.after(()=>srvs.forEach(s=>s.kill()));
// a tiny browser: one cookie jar, requests alternate between the two instances
function browser(){const jar=new Map();let n=0;
 const go=async(p,b)=>{const port=PORTS[n++%2],r=await fetch(`http://localhost:${port}/api`+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')},body:b?JSON.stringify(b):undefined});
  for(const c of r.headers.getSetCookie()){const [kv]=c.split(';'),i=kv.indexOf('='),k=kv.slice(0,i),v=kv.slice(i+1);if(/Max-Age=0/.test(c)||v==='')jar.delete(k);else jar.set(k,v)}
  return r.json()};return {go,jar}}
test('carry: onboarding and sharing persist while instances alternate',async()=>{const b=browser();await b.go('/login',{user:'sara',pin:'1234'});
 const s0=(await b.go('/onboarding')).onb.step;for(let i=0;i<6;i++)await b.go('/onboarding',{action:'next'});
 assert.equal((await b.go('/onboarding')).onb.step,Math.min(6,s0+6));assert.ok(!(await b.go('/onboarding',{action:'card'})).error);
 const ref=(await b.go('/onboarding')).onb.ref;assert.match(ref,/^EP-/);assert.equal((await b.go('/onboarding')).onb.ref,ref,'same card on both instances');
 const g=await b.go('/grants',{ids:['ENR-1']});assert.ok(g.token);await b.go('/logout',{});await b.go('/login',{user:'reviewer',pin:'1234'});
 const o=await b.go('/grants/'+g.token+'/open',{});assert.equal(o.records&&o.records.length,1,'share opens on the other instance')});
test('carry: a tampered state cookie is ignored (fresh demo instead)',async()=>{const b=browser();await b.go('/login',{user:'sara',pin:'1234'});
 for(let i=0;i<6;i++)await b.go('/onboarding',{action:'next'});await b.go('/onboarding',{action:'card'});
 const v=b.jar.get('tys0');b.jar.set('tys0',v.slice(0,10)+(v[10]==='x'?'y':'x')+v.slice(11)); // change one character
 assert.equal((await b.go('/onboarding')).onb.ref,null,'altered state rejected')});
test('carry: separate browsers keep separate demos',async()=>{const a=browser(),c=browser();await a.go('/login',{user:'sara',pin:'1234'});await c.go('/login',{user:'sara',pin:'1234'});
 for(let i=0;i<6;i++)await a.go('/onboarding',{action:'next'});await a.go('/onboarding',{action:'card'});
 assert.match((await a.go('/onboarding')).onb.ref,/^EP-/);assert.equal((await c.go('/onboarding')).onb.ref,null)});

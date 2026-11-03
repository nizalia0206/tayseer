'use strict';
// Safeer with a model: runs server.js against a scripted stand-in for the Anthropic API (not a model), to test the agent loop and guardrails.
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),{spawn}=require('node:child_process'),path=require('node:path');
const MP=5100+Math.floor(Math.random()*400),PORT=MP+1,BASE=`http://localhost:${PORT}`;let srv,mock,seen=[];
test.before(async()=>{
 mock=http.createServer((req,res)=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{const j=JSON.parse(b);seen.push(j);res.setHeader('content-type','application/json');
  if(!j.tools)return res.end(JSON.stringify({content:[{type:'text',text:'From your facts: you study at Al Noor University.'}]}));
  const n=j.messages.length; // 1: profile, 3: search, 5: submit (with an unknown id, a promise and a bogus ref)
  const use=(name,input)=>res.end(JSON.stringify({content:[{type:'tool_use',id:'t'+n,name,input}]}));
  if(n===1)return use('get_profile',{});if(n===3)return use('search_opportunities',{kind:'Scholarship'});
  use('submit_plan',{picks:[{id:'FAKE-9',why:'x'},{id:'OPP-1',why:'You are guaranteed to win this.'},{id:'OPP-3',why:'Your finalist record and sustainability interest fit this scholarship.'}],week:[{day:1,ref:'bogus',text:'x'},{day:2,ref:'apply:OPP-1',text:'Submit your application yourself.'}]})})}).listen(MP);
 srv=spawn('node',[path.join(__dirname,'..','server.js')],{env:{...process.env,PORT,ANTHROPIC_API_KEY:'test-key',ANTHROPIC_BASE_URL:`http://localhost:${MP}`},stdio:'ignore'});
 for(let i=0;i<50;i++){try{await fetch(BASE+'/api/me');return}catch{await new Promise(r=>setTimeout(r,100))}}throw new Error('server did not start')});
test.after(()=>{srv&&srv.kill();mock&&mock.close()});
async function sara(){const r=await fetch(BASE+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:'sara',pin:'1234'})});const sid=r.headers.get('set-cookie').match(/sid=([0-9a-f]+)/)[1];
 return (p,b)=>fetch(BASE+'/api'+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:'sid='+sid},body:b?JSON.stringify(b):undefined}).then(x=>x.json())}
test('model mode: ask is answered by the model from role-limited facts',async()=>{const c=await sara();
 assert.equal((await c('/safeer/health')).mode,'model');const a=await c('/safeer/ask',{question:'Where do I study?'});assert.equal(a.source,'model');assert.match(a.answer,/Al Noor/);
 const sent=JSON.stringify(seen.at(-1));assert.ok(!sent.includes('Step-free')&&!sent.includes('interpreter'),'no support arrangements sent to the model')});
test('model mode: agent calls tools; guardrails drop unknown ids, promises and bogus refs',async()=>{const c=await sara(),r=await c('/safeer/agent',{consent:true});
 assert.equal(r.source,'model');assert.ok(r.trace.filter(t=>t.id==='tool').map(t=>t.text).join(' ').includes('search_opportunities'));
 assert.ok(!r.picks.some(p=>p.id==='FAKE-9'),'unknown id dropped');const o1=r.picks.find(p=>p.id==='OPP-1');assert.ok(o1&&!/guarantee/i.test(o1.why),'promise replaced by code reason');
 assert.match(r.picks.find(p=>p.id==='OPP-3').why,/finalist/);assert.ok(!r.week.some(w=>w.ref==='bogus'));assert.ok(r.week.some(w=>w.ref==='apply:OPP-1'));
 assert.match(r.trace.at(-1).text,/1 promise removed/)});

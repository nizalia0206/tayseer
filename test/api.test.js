'use strict';
// Backend integration tests (Node built-ins only). Starts server.js on a free port and plays each role like a real user.
const test=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
const PORT=4100+Math.floor(Math.random()*500),BASE=`http://localhost:${PORT}`;let srv;
test.before(async()=>{srv=spawn('node',[path.join(__dirname,'..','server.js')],{env:{...process.env,PORT},stdio:'ignore'});
 for(let i=0;i<50;i++){try{await fetch(BASE+'/api/me');return}catch{await new Promise(r=>setTimeout(r,100))}}throw new Error('server did not start')});
test.after(()=>srv&&srv.kill());
async function as(user){let sid='';const call=async(method,p,b)=>{const r=await fetch(BASE+'/api'+p,{method,headers:{'Content-Type':'application/json',...(sid?{Cookie:'sid='+sid}:{})},body:method==='POST'?JSON.stringify(b??{}):undefined});
  const sc=r.headers.get('set-cookie');if(sc&&/sid=[0-9a-f]+/.test(sc))sid=sc.match(/sid=([0-9a-f]+)/)[1];
  const ct=r.headers.get('content-type')||'';return{status:r.status,body:ct.includes('json')?await r.json():await r.text()}};
 if(user){const l=await call('POST','/login',{user,pin:'1234'});assert.equal(l.status,200,user+' login')}
 return{get:p=>call('GET',p),post:(p,b)=>call('POST',p,b)}}
const reset=async()=>{const op=await as('operator');assert.equal((await op.post('/reset')).status,200)};
const ready=async()=>{await reset();const gov=await as('governance'),adm=await as('admin');
 await gov.post('/gov/guardian',{status:'approved'});await adm.post('/mapping',{status:'approved'});return{gov,adm}};

test('login: wrong PIN, unlisted staff and anonymous access are refused',async()=>{await reset();
 const a=await as();assert.equal((await a.post('/login',{user:'sara',pin:'0000'})).status,401);
 assert.equal((await a.post('/login',{user:'stranger',pin:'1234'})).status,403);
 assert.equal((await a.get('/records')).status,401);
 assert.equal((await a.post('/login',null)).status,401)}); // JSON "null" body must not crash the server

test('records are only visible to permitted roles; parent needs an approved guardian link',async()=>{await reset();
 for(const r of['reviewer','organizer','coordinator','operator'])assert.equal((await(await as(r)).get('/records')).status,403,r);
 for(const r of['sara','teacher','admin','advisor'])assert.equal((await(await as(r)).get('/records')).status,200,r);
 const par=await as('parent');assert.equal((await par.get('/records')).status,200,'demo seed: relationship already verified');
 const sara=await as('sara');await sara.post('/access/supporter',{action:'revoke'});await sara.post('/access/supporter',{action:'invite'});
 assert.equal((await par.get('/records')).status,403,'parent before approval');
 assert.equal((await par.get('/observations')).status,403);
 await(await as('governance')).post('/gov/guardian',{status:'approved'});
 assert.equal((await par.get('/records')).status,200,'parent after approval');
 await(await as('governance')).post('/gov/guardian',{status:'rejected'});assert.equal((await par.get('/records')).status,403,'parent after rejection')});

test('issuing: issuer is always the signed-in organisation; duplicates and conflicts are handled',async()=>{const{gov,adm}=await ready();
 assert.equal((await(await as('sara')).post('/records',{})).status,403);
 const a=await adm.post('/records',{issuer:'Evil Org'});assert.equal(a.status,201);assert.equal(a.body.record.issuer,'Al Noor University');assert.equal(a.body.record.src,'AWARD-77');
 const d=await adm.post('/records',{});assert.equal(d.status,200);assert.equal(d.body.duplicate,true);
 assert.equal((await adm.post('/records',{title:'Different title'})).status,409);
 const org=await as('organizer');assert.equal((await org.post('/issue',{type:'award',title:'X'})).status,403,'issuer pending');
 assert.equal((await gov.post('/gov/issuer',{id:'ISS-B',status:'approved',reason:'ok',types:[]})).status,400,'approval needs a type');
 assert.equal((await gov.post('/gov/issuer',{id:'ISS-B',status:'approved',reason:'ok',types:['award','participation']})).status,200);
 const o=await org.post('/issue',{type:'award',title:'Finalist',src:'C-1'});assert.equal(o.status,201);
 const ids=(await(await as('sara')).get('/records')).body.records.map(r=>r.id);assert.equal(new Set(ids).size,ids.length,'record ids are unique');
 assert.equal((await org.post('/issue',{type:'qualification',title:'Degree'})).status,403,'qualification not allowed');
 assert.equal((await org.post('/issue',{type:'award',title:''})).status,400)});

test('revocation: only the issuing organisation may revoke; revoked stays visible',async()=>{const{gov,adm}=await ready();
 await gov.post('/gov/issuer',{id:'ISS-B',status:'approved',reason:'ok',types:['award']});
 const org=await as('organizer'),o=(await org.post('/issue',{type:'award',title:'Finalist',src:'C-1'})).body.record;
 const x=await adm.post(`/records/${o.id}/revoke`);assert.equal(x.status,403,'school admin cannot revoke the organizer record');
 assert.equal((await(await as('sara')).post(`/records/${o.id}/revoke`)).status,403);
 assert.equal((await org.post(`/records/${o.id}/revoke`)).status,200);assert.equal((await org.post(`/records/${o.id}/revoke`)).status,200,'idempotent');
 const rec=(await(await as('sara')).get('/records')).body.records.find(r=>r.id===o.id);assert.equal(rec.status,'revoked');
 assert.equal((await adm.post('/records/NOPE/revoke')).status,404)});

test('suspended issuer cannot issue or import',async()=>{const{gov,adm}=await ready();
 assert.equal((await adm.post('/import',{rows:[{source_id:'A-1',activity_name:'Science fair',result:'Gold'}]})).body.accepted,1);
 assert.equal((await gov.post('/gov/issuer',{id:'ISS-A',status:'suspended',reason:''})).status,400,'reason required');
 await gov.post('/gov/issuer',{id:'ISS-A',status:'suspended',reason:'review'});
 assert.equal((await adm.post('/import',{rows:[{source_id:'A-2',activity_name:'Y'}]})).status,403);
 assert.equal((await adm.post('/records',{})).status,403);
 assert.equal((await(await as('sara')).get('/records')).body.records.some(r=>r.src==='A-1'),true,'existing records untouched')});

test('import: duplicates, conflicts and rejects; corrected content is not a false conflict',async()=>{const{adm}=await ready();
 const rows=[{source_id:'S1042',activity_name:'Enrollment, BSc Engineering'},{source_id:'A-9',activity_name:'Science fair',result:'Gold'},{source_id:'',activity_name:'No ID'}];
 let r=(await adm.post('/import',{rows})).body;assert.deepEqual([r.accepted,r.duplicates,r.conflicts,r.rejected.length],[1,1,0,1]);
 r=(await adm.post('/import',{rows:[{source_id:'A-9',activity_name:'Science fair',result:'Silver'}]})).body;assert.equal(r.conflicts,1);
 assert.equal((await adm.post('/import',{rows:'x'})).status,400);assert.equal((await(await as('teacher')).post('/import',{rows:[]})).status,403)});

test('corrections: request, issuer-only decision, versioning, no double approval',async()=>{const{adm}=await ready();
 const sara=await as('sara');assert.equal((await sara.post('/corrections',{recordId:'ENR-1',reason:'typo',fix:''})).status,400,'fix needed');
 assert.equal((await sara.post('/corrections',{recordId:'ENR-1',reason:'typo',fix:'Enrollment, Grade 9'})).status,201);
 assert.equal((await sara.post('/corrections',{recordId:'ENR-1',reason:'again',fix:'Z'})).status,409,'one pending per record');
 assert.equal((await sara.post('/corrections/COR-1/approve')).status,403,'learner cannot decide');
 assert.equal((await(await as('organizer')).post('/corrections/COR-1/approve')).status,403,'other organisation cannot decide');
 assert.equal((await(await as('organizer')).get('/corrections')).body.corrections.length,0,'other organisation cannot even list it');
 assert.equal((await adm.post('/corrections/COR-1/approve')).status,200);assert.equal((await adm.post('/corrections/COR-1/approve')).status,404,'already decided');
 const recs=(await sara.get('/records')).body.records,v1=recs.find(r=>r.id==='ENR-1'),v2=recs.find(r=>r.id==='ENR-1-v2');
 assert.equal(v1.status,'superseded');assert.equal(v2.title,'Enrollment, Grade 9');assert.equal(v2.status,'active');
 assert.equal((await sara.post('/corrections',{recordId:'ENR-1',reason:'x',fix:'y'})).status,400,'superseded record cannot be corrected');
 assert.equal((await sara.get('/onboarding')).body.school.id,'ENR-1-v2','card shows the current enrollment');
 assert.equal((await sara.post('/corrections',{recordId:'ENR-1-v2',reason:'again',fix:'Grade 10'})).status,201);
 assert.equal((await adm.post('/corrections/COR-2/approve')).status,200);
 assert.ok((await sara.get('/records')).body.records.find(r=>r.id==='ENR-1-v3'),'third version id')});

test('organizer-issued records can be corrected by the organizer only',async()=>{const{gov}=await ready();
 await gov.post('/gov/issuer',{id:'ISS-B',status:'approved',reason:'ok',types:['award']});
 const org=await as('organizer'),o=(await org.post('/issue',{type:'award',title:'Finalst',src:'C-1'})).body.record,sara=await as('sara');
 await sara.post('/corrections',{recordId:o.id,reason:'typo',fix:'Finalist'});
 assert.equal((await(await as('admin')).post('/corrections/COR-1/approve')).status,403);
 assert.equal((await org.post('/corrections/COR-1/approve')).status,200);
 assert.equal((await sara.get('/records')).body.records.find(r=>r.id===o.id+'-v2').title,'Finalist')});

test('sharing: validation, org match, revocation is final, corrections and revoked records',async()=>{const{adm}=await ready();
 const sara=await as('sara'),rev=await as('reviewer');
 await adm.post('/records',{});const recs=(await sara.get('/records')).body.records,award=recs.find(r=>r.src==='AWARD-77');
 assert.equal((await sara.post('/grants',{ids:[]})).status,400);assert.equal((await sara.post('/grants',{ids:['NOPE']})).status,400);
 assert.equal((await sara.post('/grants',{ids:['ENR-1'],org:'Nobody'})).status,400,'bad org no longer silently becomes Hope');
 assert.equal((await rev.post('/grants',{ids:['ENR-1']})).status,403);
 const g=(await sara.post('/grants',{ids:['ENR-1',award.id,'ENR-1']})).body;assert.ok(g.token);
 assert.equal((await sara.get('/grants')).body.grants[0].ids.length,2,'duplicate ids dropped');
 let o=await rev.post(`/grants/${g.token}/open`);assert.equal(o.status,200);assert.equal(o.body.records.length,2);
 assert.equal((await rev.post(`/grants/${g.token}/open?rec=${award.id}`)).body.records.length,1);
 assert.equal((await rev.post(`/grants/${g.token}/open?rec=ZZZ`)).status,403,'record not in grant');
 assert.equal((await(await as('teacher')).post(`/grants/${g.token}/open`)).status,403,'not a reviewer');
 assert.equal((await sara.post(`/grants/${g.token}/open`)).status,403,'learner is not a reviewer');
 // issuer revokes the award: reviewer no longer sees it
 await adm.post(`/records/${award.id}/revoke`);o=await rev.post(`/grants/${g.token}/open`);assert.deepEqual(o.body.records.map(r=>r.id),['ENR-1']);
 assert.equal((await sara.post('/grants',{ids:[award.id]})).status,400,'revoked record cannot be newly shared');
 // a correction is shown as the current version
 await sara.post('/corrections',{recordId:'ENR-1',reason:'typo',fix:'Enrollment, Grade 9'});await adm.post('/corrections/COR-1/approve');
 o=await rev.post(`/grants/${g.token}/open`);assert.deepEqual(o.body.records.map(r=>[r.id,r.title]),[['ENR-1-v2','Enrollment, Grade 9']]);
 // method safety, permissions, finality
 assert.equal((await rev.get(`/grants/${g.token}/revoke`)).status,405,'GET never changes state');
 assert.equal((await rev.post(`/grants/${g.token}/revoke`)).status,403,'reviewer cannot revoke');
 assert.equal((await rev.post('/grants/ffffffffffffffffffffffffffffffff/revoke')).status,403,'no token probing');
 assert.equal((await sara.get(`/grants/${g.token}/qr.svg`)).status,200);
 assert.equal((await sara.post(`/grants/${g.token}/revoke`)).status,200);assert.equal((await sara.post(`/grants/${g.token}/expire`)).status,200);
 assert.equal((await sara.get('/grants')).body.grants[0].status,'revoked','expire cannot undo a revoke');
 assert.equal((await rev.post(`/grants/${g.token}/open`)).status,403);assert.equal((await sara.get(`/grants/${g.token}/qr.svg`)).status,410)});

test('sharing: recipient organisation and expiry use the demo clock',async()=>{await ready();const sara=await as('sara'),rev=await as('reviewer');
 const fu=(await sara.post('/grants',{ids:['ENR-1'],org:'Future University E'})).body;
 assert.equal((await rev.post(`/grants/${fu.token}/open`)).status,403,'Hope reviewer cannot open a Future University grant');
 const g=(await sara.post('/grants',{ids:['ENR-1']})).body;assert.equal((await rev.post(`/grants/${g.token}/open`)).status,200);
 await(await as('operator')).post('/clock',{days:2});
 assert.equal((await rev.post(`/grants/${g.token}/open`)).status,403,'expired after 24 hours');assert.equal((await sara.get('/grants')).body.grants[1].status,'expired')});

test('application: validation, privacy of drafts, no edits after submit, organizer status',async()=>{await ready();
 const sara=await as('sara'),par=await as('parent'),org=await as('organizer');
 assert.equal((await org.post('/apply/status',{status:'accepted'})).status,409,'nothing submitted yet');
 assert.equal((await sara.post('/apply',{name:'',problem:'',submit:true})).status,400);
 assert.equal((await par.post('/apply',{name:'Sara',problem:'Draft by parent'})).status,200);
 assert.equal((await sara.get('/apply')).body.apply.draftBy,'parent');
 assert.equal((await org.get('/apply')).body.apply.name,'','organizer cannot read drafts');
 for(const r of['reviewer','teacher','coordinator'])assert.equal((await(await as(r)).get('/apply')).status,403,r);
 const s=await sara.post('/apply',{name:'Sara',problem:'Solar bench',submit:true,stepfree:true});assert.equal(s.status,200);assert.equal(s.body.apply.by,'sara');
 assert.equal((await sara.post('/apply',{name:'Changed',problem:'x'})).status,409,'locked');
 assert.equal((await org.get('/apply')).body.apply.name,'Sara');
 assert.equal((await org.post('/apply/status',{status:'more information requested'})).status,200);
 assert.equal((await sara.post('/apply',{name:'Sara',problem:'Solar bench v2',submit:true})).status,200,'can resubmit when more info requested');
 assert.equal((await org.post('/apply/status',{status:'bogus'})).status,400);assert.equal((await sara.post('/apply/status',{status:'accepted'})).status,403)});

test('support: step-free request is created even after an interpreter request',async()=>{await ready();const sara=await as('sara');
 await sara.post('/interpreter');await sara.post('/apply',{name:'S',problem:'P',stepfree:true});
 const ids=(await sara.get('/support')).body.support.map(x=>x.id).sort();assert.deepEqual(ids,['SUP-1','SUP-2']);
 await sara.post('/apply',{name:'S',problem:'P',stepfree:true});assert.equal((await sara.get('/support')).body.support.length,2,'no duplicate');
 assert.equal((await(await as('teacher')).get('/support')).body.support.length,0,'teacher sees approved only');
 assert.equal((await(await as('teacher')).post('/support/SUP-1/approve')).status,403)});

test('onboarding, governance, audit and operator permissions',async()=>{await ready();
 const sara=await as('sara');assert.equal((await(await as('reviewer')).get('/onboarding')).status,403);
 assert.equal((await sara.post('/onboarding',{action:'card'})).status,409,'not before all steps');
 assert.equal((await sara.post('/onboarding',{action:'nope'})).status,400);
 for(let i=0;i<6;i++)await sara.post('/onboarding',{action:'next'});assert.match((await sara.post('/onboarding',{action:'card'})).body.onb.ref,/^EP-/);
 for(const p of['/gov','/ops','/retention'])assert.equal((await sara.get(p)).status,403,p);
 assert.equal((await sara.post('/reset')).status,403);assert.equal((await(await as('governance')).post('/reset')).status,403);
 assert.equal((await sara.get('/audit')).status,403);assert.equal((await(await as('admin')).get('/audit')).status,200);assert.equal((await(await as('governance')).get('/audit')).status,200);
 assert.equal((await(await as('admin')).post('/clock',{days:1})).status,403)});

const iso=off=>new Date(Date.now()+off*864e5).toISOString().slice(0,10);
test('timeline: chronological order, dates validated, connected academic/extracurricular, verification',async()=>{const{gov,adm}=await ready();
 await gov.post('/gov/issuer',{id:'ISS-B',status:'approved',reason:'ok',types:['award','participation']});
 const org=await as('organizer'),sara=await as('sara');
 assert.equal((await(await as('reviewer')).get('/timeline')).status,403);assert.equal((await(await as()).get('/timeline')).status,401);
 // created out of order on purpose
 assert.equal((await adm.post('/records',{src:'A1',title:'Science fair',date:iso(-10)})).status,201);
 assert.equal((await org.post('/issue',{type:'participation',title:'Workshop',src:'P1',date:iso(-60)})).status,201);
 assert.equal((await org.post('/issue',{type:'award',title:'Old activity',src:'P0',date:iso(-200)})).status,201,'before enrollment');
 assert.equal((await org.post('/issue',{type:'award',title:'Future',src:'F',date:iso(5)})).status,400,'future date');
 assert.equal((await org.post('/issue',{type:'award',title:'Bad',src:'B',date:'2026-02-31'})).status,400,'impossible date');
 assert.equal((await org.post('/issue',{type:'award',title:'Bad',src:'B',date:'yesterday'})).status,400);
 const imp=(await adm.post('/import',{rows:[{source_id:'I1',activity_name:'Term 1 result',result:'A',date:iso(-90)},{source_id:'I2',activity_name:'Bad date',date:'2099-01-01'}]})).body;
 assert.equal(imp.accepted,1);assert.match(imp.rejected[0],/date must be/);
 const tl=(await sara.get('/timeline')).body,e=tl.entries,dates=e.map(x=>x.date);
 assert.deepEqual(dates,[...dates].sort().reverse(),'newest first');
 assert.deepEqual(e.map(x=>x.title),['Science fair','Workshop','Term 1 result','Enrollment, BSc Engineering','Old activity']);
 const by=t=>e.find(x=>x.title===t);
 assert.equal(by('Science fair').category,'extracurricular');assert.equal(by('Term 1 result').category,'academic');
 assert.equal(by('Science fair').context.id,'ENR-1','activity connected to the enrollment current at the time');
 assert.equal(by('Old activity').context,null,'activity before any enrollment has no connection');
 assert.deepEqual(by('Enrollment, BSc Engineering').related.map(r=>r.title).sort(),['Science fair','Term 1 result','Workshop']);
 assert.equal(by('Term 1 result').context.id,'ENR-1','academic results connect to their enrollment too');
 assert.equal(by('Science fair').verification.code,'verified');assert.equal(by('Science fair').issuer,'Al Noor University');
 // revoke -> revoked and dropped from related
 await org.post(`/records/${by('Workshop').id}/revoke`);
 let e2=(await sara.get('/timeline')).body.entries;assert.equal(e2.find(x=>x.title==='Workshop').verification.code,'revoked');
 assert.deepEqual(e2.find(x=>x.id==='ENR-1').related.map(r=>r.title).sort(),['Science fair','Term 1 result']);
 // suspended issuer: records stay, verification changes
 await gov.post('/gov/issuer',{id:'ISS-A',status:'suspended',reason:'review'});
 e2=(await sara.get('/timeline')).body.entries;assert.equal(e2.find(x=>x.title==='Science fair').verification.code,'suspended');
 await gov.post('/gov/issuer',{id:'ISS-A',status:'approved',reason:'ok',types:['enrollment','academic','award']});
 // correction: v2 keeps the original event date, v1 superseded with history
 await sara.post('/corrections',{recordId:'ENR-1',reason:'typo',fix:'Enrollment, Grade 9'});await adm.post('/corrections/COR-1/approve');
 e2=(await sara.get('/timeline')).body.entries;const v1=e2.find(x=>x.id==='ENR-1'),v2=e2.find(x=>x.id==='ENR-1-v2');
 assert.equal(v1.current,false);assert.equal(v1.verification.code,'superseded');assert.equal(v1.replacedBy,'ENR-1-v2');
 assert.equal(v2.date,v1.date);assert.deepEqual(v2.history.map(h=>h.id),['ENR-1']);
 assert.equal(e2.find(x=>x.title==='Science fair').context.id,'ENR-1-v2','connection follows the corrected record');
 assert.deepEqual(e2.find(x=>x.id==='ENR-1-v2').related.map(r=>r.title).sort(),['Science fair','Term 1 result']);
 assert.equal((await(await as('teacher')).get('/timeline')).status,200);
 assert.equal((await(await as('parent')).get('/timeline')).status,200)});

// --- v0.7 integration: supporter permissions, advisor access, unified sharing ---
test('supporter: limited permissions Sara controls; never support documents, sharing or submitting',async()=>{await ready();
 const sara=await as('sara'),par=await as('parent');
 assert.equal((await par.get('/access')).body.supporter.status,'approved');
 assert.equal((await par.get('/support')).status,403,'support documents are private');
 assert.equal((await par.post('/grants',{ids:['ENR-1']})).status,403,'supporter cannot share');
 assert.equal((await par.get('/grants')).status,403);assert.equal((await par.get('/share-options')).status,403);
 assert.equal((await par.post('/apply',{name:'Solar classrooms',problem:'Draft by mum'})).status,200,'draft allowed');
 assert.equal((await par.post('/apply',{name:'Solar classrooms',problem:'Draft by mum',submit:true})).status,403,'only Sara submits');
 assert.equal((await par.post('/corrections',{recordId:'ENR-1',reason:'x',fix:'y'})).status,403);
 assert.equal((await par.post('/access/supporter',{action:'revoke'})).status,403,'supporter cannot change own access');
 // Sara turns off the draft permission: the server blocks drafting but deadlines remain
 assert.equal((await sara.post('/access/supporter',{perms:{draft:false}})).status,200);
 assert.equal((await par.post('/apply',{name:'x',problem:'y'})).status,403);
 const red=(await par.get('/apply')).body.apply;assert.equal(red.redacted,true);assert.equal(red.problem,'','deadlines only, no content');
 assert.equal((await par.get('/suggestions')).status,200);
 await sara.post('/access/supporter',{perms:{records:false}});assert.equal((await par.get('/records')).status,403);assert.equal((await par.get('/timeline')).status,403);
 // Sara submits herself; attribution is kept
 const s=(await sara.post('/apply',{name:'Solar classrooms',problem:'Final',submit:true})).body.apply;assert.equal(s.by,'sara');assert.equal(s.helpedBy,'parent');
 // revoke is final until Sara invites again; governance cannot override
 assert.equal((await sara.post('/access/supporter',{action:'revoke'})).status,200);
 assert.equal((await par.get('/suggestions')).status,403);assert.equal((await par.get('/access')).body.supporter.status,'revoked');
 assert.equal((await(await as('governance')).post('/gov/guardian',{status:'approved'})).status,409);
 assert.equal((await sara.post('/access/supporter',{action:'invite'})).body.supporter.status,'pending');
 assert.equal((await sara.post('/access/supporter',{action:'bogus'})).status,400)});

test('advisor: sees only what Sara allows, never applications or support documents',async()=>{const{gov}=await ready();
 await gov.post('/gov/issuer',{id:'ISS-B',status:'approved',reason:'ok',types:['award']});
 await(await as('organizer')).post('/issue',{type:'award',title:'Sustainability Challenge, Finalist',src:'C-1'});
 const sara=await as('sara'),adv=await as('advisor');
 assert.equal((await adv.get('/records')).body.records.length,2);assert.equal((await adv.get('/apply')).status,403);assert.equal((await adv.get('/support')).status,403);
 assert.equal((await sara.post('/access/advisor',{on:true,scope:[]})).status,400);
 await sara.post('/access/advisor',{on:true,scope:['academic']});
 assert.deepEqual((await adv.get('/records')).body.records.map(r=>r.type),['enrollment']);
 assert.deepEqual((await adv.get('/timeline')).body.entries.map(e=>e.type),['enrollment']);assert.deepEqual((await adv.get('/advice')).body.basis,[]);
 await sara.post('/access/advisor',{on:false});
 for(const p of['/records','/timeline','/advice','/observations'])assert.equal((await adv.get(p)).status,403,p);
 assert.equal((await adv.post('/access/advisor',{on:true})).status,403,'only Sara decides');
 assert.equal((await(await as('teacher')).get('/records')).status,200,'teaching staff unaffected')});

test('sharing: purpose and expiry are chosen by Sara and validated; reviewer sees purpose',async()=>{await ready();
 const sara=await as('sara'),rev=await as('reviewer');
 const o=(await sara.get('/share-options')).body;assert.deepEqual(o.days,[1,7,30]);assert.ok(o.recipients.some(r=>r.org==='Hope Foundation'));
 assert.equal((await sara.post('/grants',{ids:['ENR-1'],purpose:'Spying'})).status,400);
 assert.equal((await sara.post('/grants',{ids:['ENR-1'],days:365})).status,400);
 const g=(await sara.post('/grants',{ids:['ENR-1'],purpose:'Scholarship application',days:7})).body;
 const op=await rev.post(`/grants/${g.token}/open`);assert.equal(op.status,200);assert.equal(op.body.purpose,'Scholarship application');
 await(await as('operator')).post('/clock',{days:2});assert.equal((await rev.post(`/grants/${g.token}/open`)).status,200,'7-day grant still active');
 const l=(await sara.get('/grants')).body.grants[0];assert.equal(l.purpose,'Scholarship application');assert.equal(l.days,7)});

test('opportunities: suggestions explain why, from interests and records, never eligibility',async()=>{await ready();
 const sara=await as('sara'),s=(await sara.get('/suggestions')).body;
 assert.ok(s.suggestions.every(o=>o.why.length>0));assert.match(s.note,/not an eligibility decision/);
 const eng=s.suggestions.find(o=>o.id==='OPP-4');assert.ok(eng.why.some(w=>w.kind==='record'&&w.id==='ENR-1'),'engineering enrollment explains the internship');
 assert.equal((await(await as('parent')).post('/interests',{interests:['x']})).status,403)});

test('graduation: the university can add a qualification; training providers join once approved',async()=>{const{gov,adm}=await ready();
 const q=await adm.post('/records',{type:'qualification',title:'BSc Engineering',src:'GRAD-1'});assert.equal(q.status,201);assert.equal(q.body.record.type,'qualification');
 const tr=await as('trainer');assert.equal((await tr.post('/issue',{type:'training',title:'Solar PV installer course'})).status,403,'not approved yet');
 await gov.post('/gov/issuer',{id:'ISS-C',status:'approved',reason:'ok',types:['training']});
 assert.equal((await tr.post('/issue',{type:'training',title:'Solar PV installer course',src:'T-1'})).status,201);
 const e=(await(await as('sara')).get('/timeline')).body.entries;assert.ok(e.some(x=>x.type==='qualification'));assert.ok(e.some(x=>x.type==='training'&&x.issuer==='Future Skills Academy'))});

// --- v0.8: previous learning, transfers, application timeline, requirement-driven sharing, demo cohort ---
test('history: previous schools and documents follow the same visibility rules',async()=>{await ready();
 const sara=await as('sara'),h=(await sara.get('/history')).body;
 assert.ok(h.schools.some(s=>s.emirate==='Sharjah')&&h.schools.some(s=>s.curriculum.startsWith('British')));assert.ok(h.docs.some(d=>d.kind==='marksheet'&&d.subjects.length));
 assert.equal(h.transfers.length,2);assert.equal((await(await as('reviewer')).get('/history')).status,403);
 await sara.post('/access/advisor',{on:true,scope:['extracurricular']});const a=(await(await as('advisor')).get('/history')).body;
 assert.ok(a.docs.every(d=>d.category==='extracurricular'));assert.equal(a.transfers.length,0);
 assert.ok((await(await as('teacher')).get('/history')).body.docs.every(d=>d.category==='academic'))});

test('transfer: Sara can upload a required document; the status moves to awaiting verification',async()=>{await ready();
 const sara=await as('sara');assert.equal((await(await as('parent')).post('/transfers/TR-UNI-2026/items/u2/upload')).status,403);
 const r=await sara.post('/transfers/TR-UNI-2026/items/u2/upload');assert.equal(r.status,200);assert.equal(r.body.item.status,'awaiting');
 assert.equal((await sara.post('/transfers/TR-UNI-2026/items/u2/upload')).status,409)});

test('timeline: a submitted application appears as an event and follows status changes; never for advisors',async()=>{const{gov}=await ready();
 const sara=await as('sara');assert.ok(!(await sara.get('/timeline')).body.events.some(e=>e.kind==='application'));
 await sara.post('/apply',{name:'Solar classrooms',problem:'P',submit:true});
 let ev=(await sara.get('/timeline')).body.events.find(e=>e.kind==='application');assert.equal(ev.ref,'APP-2026-0001');assert.equal(ev.status,'submitted');assert.equal(ev.issuer,'Sustainability Competition B');
 await gov.post('/gov/issuer',{id:'ISS-B',status:'approved',reason:'ok',types:['award']});await(await as('organizer')).post('/apply/status',{status:'under review'});
 ev=(await sara.get('/timeline')).body.events.find(e=>e.kind==='application');assert.equal(ev.status,'under review');assert.equal(ev.log.length,2);
 assert.ok(!(await(await as('advisor')).get('/timeline')).body.events.some(e=>e.kind==='application'),'advisor never sees applications')});

test('sharing: requirements first, documents shareable, reviewer sees only selected, access logged',async()=>{await ready();
 const sara=await as('sara'),rev=await as('reviewer'),o=(await sara.get('/share-options')).body,hope=o.recipients.find(r=>r.org==='Hope Foundation');
 assert.ok(hope.requirements.required.find(r=>r.key==='marksheets').match.includes('DOC-05'));assert.ok(hope.requirements.notRequested.includes('Private support documents'));
 const g=(await sara.post('/grants',{ids:['ENR-1','DOC-05','DOC-13'],purpose:'Scholarship application',days:7})).body;assert.match(g.ref,/^SHR-2026-\d{4}$/);
 const op=(await rev.post(`/grants/${g.token}/open`)).body;assert.deepEqual(op.records.map(r=>r.id).sort(),['DOC-05','DOC-13','ENR-1']);assert.ok(op.records.find(r=>r.id==='DOC-05').subjects.length);
 assert.equal((await sara.post('/grants',{ids:['APP-1']})).status,400,'application not shareable before submission');
 const l=(await sara.get('/grants')).body.grants[0];assert.equal(l.log.length,1);assert.equal(l.log[0].result,'granted')});

test('teacher and advisor dashboards: several demo learners, access follows each learner authorisation',async()=>{await ready();
 const adv=await as('advisor'),tch=await as('teacher'),L=(await adv.get('/learners')).body.learners;assert.ok(L.length>=4);assert.ok(L.some(x=>x.ref==='ULL-2026-0048213'));
 assert.equal((await adv.get('/learners/ULL-2026-0048216')).status,403,'Daniel has not authorised the advisor');
 assert.deepEqual((await adv.get('/learners/ULL-2026-0048215')).body.records.map(r=>r.category),['academic','academic'],'Mariam: academic only');
 assert.ok((await tch.get('/learners/ULL-2026-0048214')).body.records.every(r=>r.category==='academic'),'teachers see academic records only');
 assert.equal((await(await as('sara')).get('/learners')).status,403)});

test('card verification is public but reveals status only',async()=>{await ready();const sara=await as('sara');
 for(let i=0;i<6;i++)await sara.post('/onboarding',{action:'next'});const ref=(await sara.post('/onboarding',{action:'card'})).body.onb.ref;
 const v=(await(await as()).get('/verify/'+ref)).body;assert.equal(v.valid,true);assert.equal(v.name,undefined);assert.equal((await sara.get('/card/qr.svg')).status,200)});

test('reviewer decision: only the addressed reviewer can approve or reject an active share; Sara sees it',async()=>{await ready();
 const sara=await as('sara'),rev=await as('reviewer'),g=(await sara.post('/grants',{ids:['ENR-1','DOC-05']})).body;
 assert.equal((await sara.post(`/grants/${g.token}/decision`,{decision:'approved'})).status,403,'learner cannot decide');
 assert.equal((await rev.post(`/grants/${g.token}/decision`,{decision:'maybe'})).status,400);
 const fu=(await sara.post('/grants',{ids:['ENR-1'],org:'Future University E'})).body;assert.equal((await rev.post(`/grants/${fu.token}/decision`,{decision:'approved'})).status,403,'other organisation');
 const d=await rev.post(`/grants/${g.token}/decision`,{decision:'approved',note:'Shortlisted for interview'});assert.equal(d.status,200);assert.equal(d.body.decision.status,'approved');
 const l=(await sara.get('/grants')).body.grants.find(x=>x.token===g.token);assert.equal(l.decision.status,'approved');assert.equal(l.decision.note,'Shortlisted for interview');
 await sara.post(`/grants/${g.token}/revoke`);assert.equal((await rev.post(`/grants/${g.token}/decision`,{decision:'rejected'})).status,410,'no decisions after revoke')});

// --- Safeer AI assistant (rule-based mode: no ANTHROPIC_API_KEY in tests) ---
test('safeer: every role can ask; answers use only what the role may see',async()=>{await ready();
 const sara=await as('sara');assert.equal((await(await as()).post('/safeer/ask',{question:'hi'})).status,401);
 assert.equal((await sara.post('/safeer/ask',{question:''})).status,400);
 const h=(await sara.get('/safeer/health')).body;assert.equal(h.mode,'rules');
 const a=(await sara.post('/safeer/ask',{question:'Which documents are missing?'})).body;assert.equal(a.source,'rules');assert.match(a.answer,/Personal statement/);
 const ctx=(await sara.get('/safeer/context')).body.facts;assert.ok(!JSON.stringify(ctx).includes('Step-free'),'support arrangements never included');
 for(const r of['parent','advisor','teacher','reviewer','admin','organizer','governance','operator','coordinator'])assert.equal((await(await as(r)).post('/safeer/ask',{question:'What can you do?'})).status,200,r);
 const adv=(await(await as('advisor')).get('/safeer/context')).body.facts;assert.ok(!('application' in adv),'advisor context has no applications');
 assert.ok(adv.otherDemoLearners.find(l=>l.learnerId==='ULL-2026-0048216').access===false);
 await sara.post('/access/supporter',{action:'revoke'});const pa=(await(await as('parent')).post('/safeer/ask',{question:'deadlines?'})).body;assert.match(pa.answer,/revoked/);
 assert.equal((await(await as('parent')).get('/safeer/context')).body.facts.saraRecords,undefined)});

test('safeer agent: student only, needs consent, code-checked plan',async()=>{await ready();const sara=await as('sara');
 assert.equal((await(await as('parent')).post('/safeer/agent',{consent:true})).status,403);
 assert.equal((await sara.post('/safeer/agent',{})).status,403,'no consent, no run');
 const r=(await sara.post('/safeer/agent',{consent:true})).body;assert.equal(r.source,'rules');
 assert.deepEqual(r.trace.map(t=>t.who),['code','code','code','ai','code']);assert.ok(r.picks.length>0&&r.picks.length<=4);
 const scores=r.picks.map(p=>p.score);assert.deepEqual(scores,[...scores].sort((a,b)=>b-a),'ordered by code score');
 assert.ok(r.week.some(w=>w.ref.startsWith('transfer:')),'missing transfer documents planned first');assert.ok(r.week.length<=7);
 assert.ok(!JSON.stringify(r.payload).includes('Sara')&&!JSON.stringify(r.payload).includes('ULL-2026'),'no name or learner ID sent');
 assert.ok(r.picks.every(p=>!/eligible|guarantee/i.test(p.why)))});

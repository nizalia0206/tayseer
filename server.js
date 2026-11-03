'use strict';
// Tayseer prototype backend (learner card, Tayseer design). Node built-ins + qrcode. In-memory data (resets on restart).
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),QRCode=require('qrcode'),DEMO=require('./demo-data'),SAFEER=require('./safeer');
const PORT=process.env.PORT||3000;
// --- accounts (prototype PIN only; real service would use national/organisation sign-in) ---
const hash=(p,s)=>crypto.scryptSync(p,s,32);
const mk=(id,name,role,org)=>{const salt=crypto.randomBytes(8);return{id,name,role,org,salt,h:hash('1234',salt)}};
const UNI='Al Noor University',TRAIN='Future Skills Academy',VERSION='0.9.4';
const USERS=[mk('sara','Sara','sara',UNI),mk('parent','Parent supporter','parent','Family'),mk('teacher','Teacher','teacher',UNI),
 mk('reviewer','Scholarship reviewer','reviewer','Hope Foundation'),mk('admin','University registrar (issuer)','admin',UNI),
 mk('advisor','Academic advisor','advisor',UNI),mk('coordinator','Learning-support coordinator','coordinator',UNI),mk('organizer','Competition organizer','organizer','Sustainability Competition B'),mk('trainer','Training provider','organizer',TRAIN),mk('governance','Governance administrator','governance','Tayseer Governance'),mk('operator','Platform operator','operator','Tayseer Operations'),mk('stranger','Unlisted staff member','stranger','Unlisted Org')];
// Sessions are signed cookies (userId|expiry|nonce + HMAC), so any server instance can check them (needed on Vercel).
// Set SESSION_SECRET in production; logged-out tokens are remembered on this instance until they expire.
const SECRET=process.env.SESSION_SECRET||(process.env.VERCEL_PROJECT_ID?crypto.createHash('sha256').update('tayseer-demo:'+process.env.VERCEL_PROJECT_ID+(process.env.VERCEL_DEPLOYMENT_ID||'')).digest():crypto.randomBytes(32));
const mac=x=>crypto.createHmac('sha256',SECRET).update(x).digest('hex'),REVOKED=new Set();
const SESS={set(userId,exp){const pl=Buffer.from(userId+'|'+exp+'|'+crypto.randomBytes(6).toString('hex')).toString('hex');return pl+mac(pl)},
 get(sid){if(typeof sid!=='string'||!/^[0-9a-f]{65,}$/.test(sid)||REVOKED.has(sid))return null;const pl=sid.slice(0,-64),sg=sid.slice(-64),ok=mac(pl);
  if(!crypto.timingSafeEqual(Buffer.from(sg),Buffer.from(ok)))return null;const [userId,exp]=Buffer.from(pl,'hex').toString().split('|');return{userId,exp:+exp}},
 delete(sid){if(typeof sid==='string')REVOKED.add(sid)}};
// --- data ---
const d0=()=>new Date(Date.now()-120*864e5).toISOString().slice(0,10);
const mkDB=()=>({records:[{id:'ENR-1',issuer:UNI,src:'S1042',title:'Enrollment, BSc Engineering',type:'enrollment',status:'active',date:d0(),issuedAt:d0()}],
 mapping:{status:'pending',suggest:[['student_number','institutionLearnerId'],['activity_name','title'],['result','achievementLevel']]},
 n:0,corr:[],apply:{opp:'OPP-1',name:'',problem:'',submitted:false,by:null},grants:new Map(),audit:[],support:[],obs:[],off:0,
 issuers:[{id:'ISS-A',org:UNI,status:'approved',types:['enrollment','academic','award','participation','qualification'],by:'seed'},{id:'ISS-B',org:'Sustainability Competition B',status:'pending',types:[]},{id:'ISS-C',org:TRAIN,status:'pending',types:[]}],
 // parent/guardian supporter: the link is verified by governance; Sara alone decides what it covers and can revoke it
 guardian:{status:'approved',scope:['See Sara\'s records (read-only)','See application deadlines','Help prepare a competition application (draft only)'],perms:{records:true,deadlines:true,draft:true},reviewAt:Date.now()+90*864e5},
 // academic advisor: Sara decides whether and which kinds of records the advisor sees. Applications and support documents are never included.
 advisor:{on:true,scope:['academic','extracurricular']},
 onb:{step:0,ref:null},interests:['sustainability'],dismissed:[],shareN:0,
 // previous learning, documents and transfers (fictional demo data, see demo-data.js)
 history:{schools:DEMO.schools(),docs:DEMO.docs(),transfers:[DEMO.schoolTransfer(),DEMO.uniTransfer()]},
 rules:[{cat:'Learner records',purpose:'Lifelong learner profile',trigger:'Learner closes account',days:3650,hold:false},{cat:'Application attachments',purpose:'Application review',trigger:'Decision made',days:30,hold:false},{cat:'Support documents',purpose:'Support arrangement',trigger:'Arrangement ends',days:180,hold:false}],
 attach:[{id:'ATT-1',name:'Sample application attachment',at:Date.now(),status:'kept'}]});
let DB=mkDB();
const now=()=>Date.now()+DB.off*864e5;
const audit=(u,a)=>{DB.audit.push(`${new Date().toISOString()} ${u?u.id:'anon'} ${a}`);DB.audit.length>200&&DB.audit.shift()};
const send=(res,code,obj,type='application/json',extra={})=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(type==='application/json'?JSON.stringify(obj):obj)};
const body=req=>new Promise(r=>{let d='';req.on('data',c=>{d+=c;d.length>1e5&&req.destroy()});req.on('end',()=>{try{const j=JSON.parse(d||'{}');r(j&&typeof j==='object'&&!Array.isArray(j)?j:{})}catch{r({})}})});
const cookie=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(c=>c.trim().split('=')));
const userOf=req=>{const s=SESS.get(cookie(req).sid);if(!s||s.exp<Date.now())return null;return USERS.find(u=>u.id===s.userId)};
const pub=u=>u&&{id:u.id,name:u.name,role:u.role,org:u.org};
const SEE=['sara','parent','teacher','admin','advisor'], OWN=['sara','parent'];
const gStatus=()=>DB.guardian.status==='approved'&&DB.guardian.reviewAt<=now()?'expired':DB.guardian.status;
const can=u=>u.role==='sara'||(u.role==='parent'&&gStatus()==='approved');
// supporter permissions: the parent needs an approved link AND the specific permission Sara granted
const par=(u,k)=>u.role==='parent'&&gStatus()==='approved'&&!!DB.guardian.perms[k];
const canP=(u,k)=>u.role==='sara'||par(u,k);
const see=u=>['teacher','admin'].includes(u.role)||(u.role==='advisor'&&DB.advisor.on)||canP(u,'records');
const noSee=u=>u.role==='advisor'?'Sara has not given her advisor access to her records':u.role==='parent'&&gStatus()==='approved'?'This supporter permission is turned off by Sara':'This role cannot browse a learner profile';
const advOk=r=>DB.advisor.scope.includes(CAT[r.type]||'extracurricular'); // what the advisor may see
const visFor=u=>u.role==='advisor'?advOk:()=>true;
const iso=t=>new Date(t).toISOString().slice(0,10);
const supInfo=()=>({name:'Parent supporter',status:gStatus(),perms:{...DB.guardian.perms},reviewAt:iso(DB.guardian.reviewAt)});
const RECIPIENTS=[{org:'Hope Foundation',kind:'Scholarship provider'},{org:'Future University E',kind:'University admissions'}];
const PURPOSES=['Scholarship application','University admission','Internship or job application','Other'],DAYS=[1,7,30];
// --- documents, timeline events and shareable items (demo) ---
const docsFor=u=>{if(!see(u))return[];const d=DB.history.docs;return u.role==='advisor'?d.filter(x=>DB.advisor.scope.includes(x.category)):u.role==='teacher'?d.filter(x=>x.category==='academic'):d};
const appVisible=u=>u.role==='sara'||par(u,'draft')||par(u,'deadlines'); // never advisors, teachers or reviewers by default
const START={'SCH-1':'2012-09-02','SCH-2':'2022-09-05','SCH-3':'2024-08-28','UNI-1':'2025-08-25'};
const DOCLABEL={marksheet:'Marksheet',report:'Term report',transcript:'Transcript',transfer_certificate:'Transfer certificate',curriculum_approval:'Curriculum-change approval',enrollment_confirmation:'Enrollment confirmation',promotion_certificate:'Promotion certificate',volunteering:'Volunteering record',equivalency:'Equivalency certificate',external_exam:'External exam result',achievement:'Achievement certificate',training:'Training certificate',leadership:'Leadership letter'};
function events(u){
 const ev=[],docs=docsFor(u);if(!see(u))return ev;
 if(u.role!=='advisor'||DB.advisor.scope.includes('academic'))DB.history.schools.forEach(sc=>ev.push({id:'EV-'+sc.id,kind:'education',title:'Enrolled at '+sc.name,date:START[sc.id],issuer:sc.name,detail:`${sc.curriculum} · ${sc.grades} · ${sc.years}`,status:'verified',category:'academic',emirate:sc.emirate,authority:sc.authority}));
 docs.forEach(d=>ev.push({id:'EV-'+d.id,kind:d.kind==='curriculum_approval'?'curriculum':'document',title:d.title,date:d.date,issuer:d.issuer,detail:[DOCLABEL[d.kind],d.curriculum,d.grade,d.year].filter(x=>x&&x!=='—').join(' · '),status:d.status,category:d.category,docId:d.id}));
 if(u.role==='sara'||u.role==='parent'&&par(u,'records')){const[st,ut]=DB.history.transfers;
  ev.push({id:'EV-'+st.id,kind:'transfer',title:st.title+' (completed)',date:st.completed,issuer:st.to.school,detail:`${st.from.curriculum} → ${st.to.curriculum}`,status:'verified',category:'academic',transferId:st.id});
  ev.push({id:'EV-'+ut.id,kind:'transfer',title:ut.title+' (in progress)',date:ut.started,issuer:ut.to.school,detail:'Credit recognition is the receiving university’s decision',status:'pending',category:'academic',transferId:ut.id})}
 if(appVisible(u)&&DB.apply.submittedAt)ev.push({id:'EV-APP-1',kind:'application',title:'Application submitted: Sustainability Challenge 2026',date:DB.apply.submittedAt,issuer:COMP,detail:'Application, not a credential',status:DB.apply.status||'submitted',category:'application',ref:DB.apply.ref,log:DB.apply.log||[]});
 return ev}
const RKIND={enrollment:'enrollment',academic:'result',award:'achievement',participation:'achievement',training:'training',qualification:'qualification'};
function shareItems(){
 const items=DB.records.filter(r=>r.status==='active').map(r=>({id:r.id,title:r.title,issuer:r.issuer,date:r.date||r.issuedAt,status:verify(r).code==='verified'?'verified':'unverified',type:r.type,kind:RKIND[r.type]||r.type,current:r.type==='enrollment'}));
 DB.history.docs.filter(d=>d.status==='verified').forEach(d=>items.push({id:d.id,title:d.title,issuer:d.issuer,date:d.date,status:'verified',type:DOCLABEL[d.kind]||d.kind,kind:d.kind,current:d.school==='UNI-1'&&d.kind==='enrollment_confirmation'}));
 if(DB.apply.submitted)items.push({id:'APP-1',title:'Sustainability Challenge 2026 application',issuer:'Submitted by Sara to '+COMP,date:DB.apply.submittedAt,status:'submitted',type:'Application',kind:'application'});
 return items}
const REQS={'Hope Foundation':{required:[['enrollment','Current enrollment certificate',i=>i.current],['transcript','Latest academic transcript',i=>i.kind==='transcript'],['marksheets','Previous academic marksheets',i=>['marksheet','report'].includes(i.kind)],['achievement','Competition or achievement evidence',i=>i.kind==='achievement']],
  optional:[['volunteering','Volunteering certificate',i=>i.kind==='volunteering'],['training','Additional training certificates',i=>['training','qualification'].includes(i.kind)]],notRequested:['Private support documents','Unrelated personal records']},
 'Future University E':{required:[['enrollment','Current enrollment certificate',i=>i.current],['transcript','Latest academic transcript',i=>i.kind==='transcript'],['marksheets','Grade 10–12 marksheets and reports',i=>['marksheet','report'].includes(i.kind)],['transfer','Transfer certificates and curriculum-change approvals',i=>['transfer_certificate','curriculum_approval'].includes(i.kind)]],
  optional:[['achievement','Achievements and competitions',i=>i.kind==='achievement'],['volunteering','Volunteering certificate',i=>i.kind==='volunteering']],notRequested:['Private support documents','Financial or family information']}};
const reqsFor=(org,items)=>{const R=REQS[org];if(!R)return null;const mapR=list=>list.map(([key,label,f])=>({key,label,match:items.filter(f).map(i=>i.id)}));return{required:mapR(R.required),optional:mapR(R.optional),notRequested:R.notRequested}};
const COMP='Sustainability Competition B',PFX={enrollment:'ENR',academic:'ACD',award:'AWD',participation:'PAR',training:'TRN',qualification:'QUA'};
const gs=g=>g.status==='active'&&g.exp<=now()?'expired':g.status; // grant status, expiry-aware
const latest=r=>{let x=r,n=0;while(x&&x.status==='superseded'&&x.replacedBy&&n++<20)x=DB.records.find(y=>y.id===x.replacedBy);return x};
const today=()=>new Date(now()).toISOString().slice(0,10);
const okDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d&&d>='2000-01-01'&&d<=today();
const CAT={enrollment:'academic',academic:'academic',qualification:'academic',award:'extracurricular',participation:'extracurricular',training:'extracurricular'};
const DOC=r=>r.date||r.issuedAt||'1970-01-01';
// verification = who stands behind the record today. It says the issuer is approved on Tayseer, not that every detail is true.
function verify(r){
 if(r.status==='revoked')return{code:'revoked',label:'Revoked by the issuer'};
 if(r.status==='superseded')return{code:'superseded',label:'Replaced by a corrected version'};
 const i=DB.issuers.find(x=>x.org===r.issuer);
 if(!i)return{code:'unlisted',label:'Issuer is not on the approved list'};
 if(i.status==='suspended')return{code:'suspended',label:'Issuer is currently suspended'};
 if(i.status!=='approved')return{code:'unapproved',label:'Issuer is not currently approved'};
 if(!i.types.includes(r.type))return{code:'type',label:'Issuer is not approved for this record type'};
 return{code:'verified',label:'Issued by an approved issuer'}}
// the learner timeline: newest first; results and activities are connected to the enrolment that was current on their date
function timeline(vis=()=>true){
 const recs=DB.records.filter(vis),byId=id=>recs.find(r=>r.id===id),isCur=r=>r.status!=='superseded';
 const acad=recs.filter(r=>r.type==='enrollment'&&isCur(r)&&r.status!=='revoked');
 const ctxOf=r=>acad.filter(a=>DOC(a)<=DOC(r)).sort((a,b)=>DOC(b).localeCompare(DOC(a))||b.id.localeCompare(a.id))[0];
 const hist=r=>{const h=[];let x=r.replaces&&byId(r.replaces),n=0;while(x&&n++<20){h.push({id:x.id,title:x.title,issuedAt:x.issuedAt||null,status:x.status});x=x.replaces&&byId(x.replaces)}return h};
 const entries=recs.map(r=>{const cat=CAT[r.type]||'extracurricular',c=r.type!=='enrollment'?ctxOf(r):null;
  return{id:r.id,title:r.title,type:r.type,category:cat,date:DOC(r),issuedAt:r.issuedAt||null,issuer:r.issuer,src:r.src,level:r.level||null,status:r.status,verification:verify(r),current:isCur(r),replaces:r.replaces||null,replacedBy:r.replacedBy||null,history:hist(r),
   context:c?{id:c.id,title:c.title,issuer:c.issuer}:null,
   related:r.type==='enrollment'&&isCur(r)?recs.filter(x=>x.type!=='enrollment'&&isCur(x)&&x.status!=='revoked'&&(ctxOf(x)||{}).id===r.id).map(x=>({id:x.id,title:x.title})):[]}});
 entries.sort((a,b)=>b.date.localeCompare(a.date)||String(b.issuedAt).localeCompare(String(a.issuedAt))||b.id.localeCompare(a.id));
 return{entries,note:'Verified means the issuer is approved on Tayseer and issued this record. It does not prove every detail is true.'}}
// one issuing path for every issuer: ownership = the signed-in user's own organisation, never a body field
function issueRecord(u,b){
 const type=String(b.type||''),iss=DB.issuers.find(x=>x.org===u.org);
 if(!iss||iss.status!=='approved'||!iss.types.includes(type)){audit(u,'issue DENIED type '+type);return[403,{error:'Issuer is not approved for this record type'}]}
 const title=String(b.title||'').trim().slice(0,120);if(!title)return[400,{error:'Title is required'}];
 const date=b.date===undefined||b.date===''?today():String(b.date);if(!okDate(date))return[400,{error:'Date must be a real date (YYYY-MM-DD), not in the future'}];
 const src=String(b.src||'').trim().slice(0,40)||'ORG-'+(DB.n+1),same=DB.records.filter(x=>x.issuer===u.org&&x.src===src),dup=same.find(x=>x.status!=='superseded')||same[0];
 if(dup){if(dup.title===title&&dup.type===type){audit(u,'duplicate ignored '+src);return[200,{duplicate:true,record:dup}]}
  audit(u,'conflict '+src);return[409,{error:'This source ID already exists with different content. Ask for a correction instead'}]}
 const rec={id:(PFX[type]||'REC')+'-'+(++DB.n),issuer:u.org,src,title,type,status:'active',date,issuedAt:today()};DB.records.push(rec);audit(u,'issued '+rec.id+' '+src);return[201,{record:rec}]}
// --- routes ---
async function api(req,res,url){
 const u=userOf(req),m=req.method,p=url.pathname;let mm;
 if(m==='POST'&&!(req.headers['content-type']||'').includes('application/json'))return send(res,415,{error:'JSON only'});
 if(p==='/api/login'&&m==='POST'){const{user,pin}=await body(req);const a=USERS.find(x=>x.id===user);
  const ok=a&&typeof pin==='string'&&crypto.timingSafeEqual(hash(pin,a.salt),a.h);audit(a,ok?'login ok':'login fail');
  if(!ok)return send(res,401,{error:'Wrong account or PIN'});
  if(a.role==='stranger')return send(res,403,{error:'Your account has no approved organisation membership'});
  const sid=SESS.set(a.id,Date.now()+36e5);
  return send(res,200,{user:pub(a)},'application/json',{'Set-Cookie':`sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`})}
 if(p==='/api/logout'&&m==='POST'){SESS.delete(cookie(req).sid);return send(res,200,{ok:1},'application/json',{'Set-Cookie':'sid=; Max-Age=0; Path=/'})}
 if(p==='/api/me')return send(res,200,{user:pub(u),version:VERSION});
 mm=p.match(/^\/api\/verify\/([\w-]+)$/); // public card check: status only, no personal data (demo, not cryptographic)
 if(mm&&m==='GET')return send(res,200,{ref:mm[1],valid:!!DB.onb.ref&&DB.onb.ref===mm[1],status:DB.onb.ref===mm[1]?'active':'unknown',note:'Demo check. Shows card status only; no personal data. Not a cryptographic verification.'});
 if(!u)return send(res,401,{error:'Sign in first'});
 if(p==='/api/records'&&m==='GET')return see(u)?send(res,200,{records:DB.records.filter(visFor(u))}):send(res,403,{error:noSee(u)});
 if(p==='/api/timeline'&&m==='GET')return see(u)?send(res,200,{...timeline(visFor(u)),events:events(u)}):send(res,403,{error:noSee(u)});
 if(p==='/api/history'&&m==='GET'){if(!see(u))return send(res,403,{error:noSee(u)});const full=u.role==='sara'||par(u,'records');
  return send(res,200,{learner:DEMO.LEARNER,schools:u.role==='advisor'&&!DB.advisor.scope.includes('academic')?[]:DB.history.schools,docs:docsFor(u),transfers:full?DB.history.transfers:[],note:'Demo data: fictional records, not official documents.'})}
 mm=p.match(/^\/api\/transfers\/([\w-]+)\/items\/(\w+)\/upload$/);
 if(mm&&m==='POST'){if(u.role!=='sara')return send(res,403,{error:'Only Sara can add documents to her transfer'});
  const tr=DB.history.transfers.find(x=>x.id===mm[1]),it=tr&&(tr.groups||[]).flatMap(g=>g.items).find(x=>x.id===mm[2]);if(!it)return send(res,404,{error:'No such request'});
  if(it.status!=='required')return send(res,409,{error:'This document is not waiting for an upload'});it.status='awaiting';audit(u,'transfer document uploaded '+tr.id+'/'+it.id);return send(res,200,{item:it})}
 if(p==='/api/card/qr.svg'&&m==='GET'){if(u.role!=='sara'||!DB.onb.ref)return send(res,403,{error:'Not allowed'});return send(res,200,await QRCode.toString(`${origin(req)}/#/verify/${DB.onb.ref}`,{type:'svg',margin:1}),'image/svg+xml')}
 if(p==='/api/learners'&&m==='GET'){if(!['teacher','advisor'].includes(u.role))return send(res,403,{error:'Not allowed'});
  const me={ref:DEMO.LEARNER.ref,name:'Sara A.',school:UNI,curriculum:'BSc Engineering (credit hours)',grade:'Year 2',status:'Good standing',access:u.role==='teacher'||DB.advisor.on,live:true};
  return send(res,200,{learners:[me,...DEMO.COHORT.map(c=>({ref:c.ref,name:c.name,school:c.school,curriculum:c.curriculum,grade:c.grade,status:c.status,access:u.role==='teacher'?c.auth.teacher:!!c.auth.advisor,demo:true}))],note:'Sample learners and IDs are demo data.'})}
 mm=p.match(/^\/api\/learners\/([\w-]+)$/);
 if(mm&&m==='GET'){if(!['teacher','advisor'].includes(u.role))return send(res,403,{error:'Not allowed'});
  if(mm[1]===DEMO.LEARNER.ref)return see(u)?send(res,200,{live:true}):send(res,403,{error:noSee(u)});
  const c=DEMO.COHORT.find(x=>x.ref===mm[1]);if(!c)return send(res,404,{error:'Not found'});
  const scope=u.role==='teacher'?(c.auth.teacher?['academic']:[]):(c.auth.advisor||[]);if(!scope.length)return send(res,403,{error:'This learner has not authorised your access'});
  return send(res,200,{learner:{ref:c.ref,name:c.name,school:c.school,curriculum:c.curriculum,grade:c.grade,status:c.status},scope,timeline:c.timeline,records:c.records.filter(r=>scope.includes(r[2])).map(([title,issuer,category,date])=>({title,issuer,category,date})),demo:true})}
 if(p==='/api/records'&&m==='POST'){if(u.role!=='admin')return send(res,403,{error:'Only an authorised issuer can issue records'});
  const b=await body(req),[c,o]=issueRecord(u,{type:'award',src:'AWARD-77',...b,title:b.title||'Sustainability Challenge, Finalist'});return send(res,c,o)}
 mm=p.match(/^\/api\/records\/([\w-]+)\/revoke$/);
 if(mm&&m==='POST'){if(!['admin','organizer'].includes(u.role))return send(res,403,{error:'Only the issuer can revoke'});const r=DB.records.find(x=>x.id===mm[1]);
  if(!r)return send(res,404,{error:'No such record'});
  if(r.issuer!==u.org){audit(u,'revoke DENIED '+r.id);return send(res,403,{error:'Only the issuing organisation can revoke this record'})}
  if(r.status==='revoked')return send(res,200,{record:r});
  if(r.status==='superseded')return send(res,409,{error:'This record was replaced by a correction. Revoke the current version instead'});
  r.status='revoked';audit(u,'revoked '+r.src);return send(res,200,{record:r})}

 if(p==='/api/support'&&m==='GET'){const all=DB.support;
  if(u.role==='sara'||u.role==='coordinator')return send(res,200,{support:all});
  if(u.role==='teacher')return send(res,200,{support:all.filter(x=>x.status==='approved').map(x=>({id:x.id,text:x.text,status:x.status}))});
  if(u.role==='parent')return send(res,403,{error:'Support arrangements are private to Sara and the support coordinator'}); // never part of supporter access
  return send(res,403,{error:'This role cannot see support arrangements'})}
 mm=p.match(/^\/api\/support\/([\w-]+)\/approve$/);
 if(mm&&m==='POST'){if(u.role!=='coordinator')return send(res,403,{error:'Only the learning-support coordinator can approve'});
  const x=DB.support.find(y=>y.id===mm[1]);if(!x)return send(res,404,{error:'No such request'});x.status='approved';audit(u,'support approved');return send(res,200,{support:x})}
 if(p==='/api/interpreter'&&m==='POST'){if(!can(u))return send(res,403,{error:'Only Sara or her parent can request an interpreter'});
  if(!DB.support.some(x=>x.id==='SUP-2'))DB.support.push({id:'SUP-2',text:'Sign language interpreter for application support',status:'requested'});audit(u,'interpreter requested');return send(res,201,{ok:1})}
 if(p==='/api/observations'&&m==='GET')return (u.role==='teacher'||(u.role==='advisor'&&DB.advisor.on)||canP(u,'records'))?send(res,200,{obs:DB.obs}):send(res,403,{error:'Not allowed'});
 if(p==='/api/observations'&&m==='POST'){if(u.role!=='teacher')return send(res,403,{error:'Only teachers add observations'});
  const{text}=await body(req);const t=String(text||'').trim().slice(0,300);if(!t)return send(res,400,{error:'Write an observation first'});
  DB.obs.push({by:u.name,text:t,date:new Date().toISOString().slice(0,10),official:false});audit(u,'observation added');return send(res,201,{obs:DB.obs})}
 if(p==='/api/advice'&&m==='GET'){if(u.role!=='advisor')return send(res,403,{error:'Advisors only'});
  if(!DB.advisor.on)return send(res,403,{error:'Sara has not given her advisor access to her records'});
  const aw=DB.records.filter(r=>['award','participation'].includes(r.type)&&r.status==='active'&&advOk(r));
  return send(res,200,{note:aw.length?`Sara holds an active award: ${aw[0].title}. Discuss whether she wants to explore a related elective or club.`:'No active achievements yet. Discuss what Sara would like to try next.',basis:aw.map(r=>r.title),aiDecides:false})}
 if(p==='/api/mapping'&&m==='GET')return send(res,200,{mapping:DB.mapping});
 if(p==='/api/mapping'&&m==='POST'){if(u.role!=='admin')return send(res,403,{error:'Admin only'});const{status}=await body(req);
  if(!['approved','rejected'].includes(status))return send(res,400,{error:'Bad status'});DB.mapping.status=status;audit(u,'mapping '+status);return send(res,200,{mapping:DB.mapping})}
 if(p==='/api/apply'&&m==='GET'){if(canP(u,'draft'))return send(res,200,{apply:DB.apply});
  if(par(u,'deadlines'))return send(res,200,{apply:{opp:DB.apply.opp,name:'',problem:'',submitted:DB.apply.submitted,by:DB.apply.by,status:DB.apply.status,redacted:true}}); // deadlines only, no content
  if(u.role==='organizer'&&u.org===COMP)return send(res,200,{apply:DB.apply.submitted?DB.apply:{name:'',problem:'',submitted:false,by:null}}); // drafts stay private
  return send(res,403,{error:'This role cannot see applications'})}
 if(p==='/api/apply'&&m==='POST'){if(!canP(u,'draft'))return send(res,403,{error:'Only Sara or her linked parent can apply'});
  const b=await body(req);if(DB.apply.submitted&&DB.apply.status!=='more information requested')return send(res,409,{error:'This application was already submitted and can no longer be edited'});
  if(b.submit&&u.role!=='sara')return send(res,403,{error:'Only Sara can submit her application. Supporters can prepare a draft'});
  const name=String(b.name||'').trim().slice(0,200),problem=String(b.problem||'').trim().slice(0,1000);
  if(b.submit&&(!name||!problem))return send(res,400,{error:'Add your name and project description before submitting'});
  if(b.stepfree&&u.role==='sara'&&!DB.support.some(x=>x.id==='SUP-1'))DB.support.push({id:'SUP-1',text:'Step-free access at the competition venue',status:'requested'}); // support requests are Sara's own
  const helpedBy=u.role==='parent'?'parent':DB.apply.helpedBy||null;
  const keep={ref:DB.apply.ref||(b.submit?'APP-2026-0001':undefined),submittedAt:b.submit?today():DB.apply.submittedAt,log:[...(DB.apply.log||[]),...(b.submit?[{status:DB.apply.log&&DB.apply.log.length?'resubmitted':'submitted',at:today()}]:[])]};
  DB.apply={...keep,opp:'OPP-1',name,problem,submitted:!!b.submit,by:b.submit?u.role:null,draftBy:u.role,helpedBy,...(b.submit?{status:'submitted'}:{})};audit(u,b.submit?'application submitted':'draft saved');return send(res,200,{apply:DB.apply})}

 if(p==='/api/share-options'&&m==='GET'){if(u.role!=='sara')return send(res,403,{error:'Only Sara can share her records. Supporters cannot share on her behalf'});
  const items=shareItems();return send(res,200,{recipients:RECIPIENTS.map(r=>({...r,requirements:reqsFor(r.org,items)})),purposes:PURPOSES,days:DAYS,items})}
 if(p==='/api/grants'&&m==='GET'){if(u.role!=='sara')return send(res,403,{error:'Not allowed'});
  return send(res,200,{grants:[...DB.grants].map(([token,g])=>({token,ref:g.ref,log:g.log||[],decision:g.decision||null,org:g.org,ids:g.ids,purpose:g.purpose,days:g.days,created:g.created?new Date(g.created).toISOString():null,status:gs(g),expires:new Date(g.exp).toISOString(),by:g.by}))})}
 if(p==='/api/grants'&&m==='POST'){if(u.role!=='sara')return send(res,403,{error:'Only Sara can share her records. Supporters cannot share on her behalf'});
  const b=await body(req),org=b.org===undefined?'Hope Foundation':b.org;
  if(!RECIPIENTS.some(r=>r.org===org))return send(res,400,{error:'Unknown recipient organisation'});
  const purpose=b.purpose===undefined?PURPOSES[0]:String(b.purpose);if(!PURPOSES.includes(purpose))return send(res,400,{error:'Choose a sharing purpose from the list'});
  const days=b.days===undefined?1:Number(b.days);if(!DAYS.includes(days))return send(res,400,{error:'Choose an expiry of 1, 7 or 30 days'});
  const ids=[...new Set(Array.isArray(b.ids)?b.ids.slice(0,50).map(String):[])];if(!ids.length)return send(res,400,{error:'Pick at least one record'});
  const okIds=new Set(shareItems().map(i=>i.id));if(ids.some(i=>!okIds.has(i)))return send(res,400,{error:'Only active records can be shared. Remove revoked, replaced or unknown records'});
  const token=crypto.randomBytes(16).toString('hex'),exp=now()+days*864e5;const ref='SHR-2026-'+String(++DB.shareN).padStart(4,'0');DB.grants.set(token,{ref,log:[],org,ids,purpose,days,created:now(),status:'active',exp,by:u.id});audit(u,`grant created for ${org} (${purpose}, ${days}d): ${ids.join(',')}`);
  return send(res,201,{token,ref,link:`${origin(req)}/#/g/${token}`,org,purpose,expires:new Date(exp).toISOString()})}
 // reviewer decision on a shared request (approve / reject), visible to Sara on her share
 mm=p.match(/^\/api\/grants\/(\w+)\/decision$/);
 if(mm&&m==='POST'){if(u.role!=='reviewer')return send(res,403,{error:'Only the reviewer can record a decision'});
  const g=DB.grants.get(mm[1]);if(!g)return send(res,404,{error:'Unknown or invalid grant'});
  if(u.org!==g.org)return send(res,403,{error:'This grant was not addressed to your organisation'});
  if(gs(g)!=='active')return send(res,410,{error:'This grant is no longer active'});
  const b=await body(req);if(!['approved','rejected'].includes(b.decision))return send(res,400,{error:'Bad status'});
  g.decision={status:b.decision,note:String(b.note||'').trim().slice(0,300),by:u.name,org:u.org,at:new Date(now()).toISOString()};
  (g.log=g.log||[]).push({at:g.decision.at,by:u.name,org:u.org,result:'decision: '+b.decision});audit(u,'grant decision '+b.decision);return send(res,200,{decision:g.decision})}
 mm=p.match(/^\/api\/grants\/(\w+)\/(qr\.svg|open|expire|revoke)$/);
 if(mm){const act=mm[2];
  if(act==='qr.svg'?m!=='GET':m!=='POST')return send(res,405,{error:'Method not allowed'}); // state changes never run on GET
  if(act!=='open'&&u.role!=='sara')return send(res,403,{error:act==='qr.svg'?'Only the learner side can show the QR':'Not allowed'});
  const g=DB.grants.get(mm[1]);if(!g)return send(res,404,{error:'Unknown or invalid grant'});
  if(act==='qr.svg'){if(gs(g)!=='active')return send(res,410,{error:'This grant is no longer active'});
   return send(res,200,await QRCode.toString(`${origin(req)}/#/g/${mm[1]}`,{type:'svg',margin:1}),'image/svg+xml')}
  if(act==='revoke'){g.status='revoked';audit(u,'grant revoked');return send(res,200,{ok:1})} // revoked is final
  if(act==='expire'){if(g.status==='active')g.status='expired';audit(u,'grant expired');return send(res,200,{ok:1})}
  // open: the four server-side checks. A corrected record is shown as its current version; a revoked record is never shown.
  const want=url.searchParams.get('rec'),live=[];
  g.ids.forEach(i=>{const d=DB.history.docs.find(x=>x.id===i);if(d){if(d.status==='verified')live.push({r:{...d,doc:true},origin:i});return}
   if(i==='APP-1'){live.push({r:{id:'APP-1',title:'Sustainability Challenge 2026 application',issuer:COMP,type:'application',date:DB.apply.submittedAt,status:DB.apply.status||'submitted',project:DB.apply.name,description:DB.apply.problem,ref:DB.apply.ref},origin:i});return}
   const r=latest(DB.records.find(x=>x.id===i));if(r&&r.status!=='revoked'&&!live.some(x=>x.r.id===r.id))live.push({r,origin:i})});
  const recs=live.filter(x=>!want||x.r.id===want||x.origin===want).map(x=>x.r);
  const checks=[['Signed in as a reviewer for '+g.org,u.role==='reviewer'],['This grant was addressed to your organisation',u.org===g.org],
   ['Grant is active (not revoked or expired)',gs(g)==='active'],['Requested record is included in the grant',recs.length>0]];
  const ok=checks.every(c=>c[1]);audit(u,'grant open '+(ok?'granted':'denied'));(g.log=g.log||[]).push({at:new Date(now()).toISOString(),by:u.name,org:u.org,result:ok?'granted':'denied'});
  return send(res,ok?200:403,{ok,checks:checks.map(c=>({label:c[0],pass:c[1]})),records:ok?recs:[],...(ok?{token:mm[1],decision:g.decision||null,ref:g.ref,org:g.org,purpose:g.purpose||PURPOSES[0],expires:new Date(g.exp).toISOString()}:{})})}

 if(p==='/api/import'&&m==='POST'){if(u.role!=='admin')return send(res,403,{error:'Only an approved school issuer can import'});
  if(DB.mapping.status!=='approved')return send(res,409,{error:'Blocked: the field mapping is not approved yet'});
  const iss=DB.issuers.find(x=>x.org===u.org);if(!iss||iss.status!=='approved'||!iss.types.includes('academic'))return send(res,403,{error:'Issuer is not approved for this record type'});
  const{rows}=await body(req);if(!Array.isArray(rows)||rows.length>200)return send(res,400,{error:'Send up to 200 rows as a JSON array'});
  const issuer=u.org,out={accepted:0,duplicates:0,conflicts:0,rejected:[]};
  rows.forEach((r,i)=>{const src=String(r&&r.source_id||'').slice(0,40),title=String(r&&r.activity_name||'').slice(0,120),lvl=String(r&&r.result||'').slice(0,60);
   if(!src||!title){out.rejected.push(`Row ${i+1}: source_id and activity_name are required`);return}
   const dt=r.date===undefined||r.date===''?today():String(r.date);if(!okDate(dt)){out.rejected.push(`Row ${i+1}: date must be YYYY-MM-DD and not in the future`);return}
   const same=DB.records.filter(x=>x.issuer===issuer&&x.src===src),ex=same.find(x=>x.status!=='superseded')||same[0];
   if(ex){if(ex.title===title&&(ex.level||'')===lvl)out.duplicates++;else{out.conflicts++;out.rejected.push(`Row ${i+1}: ${src} already exists with different content (conflict, issuer must review)`)}return}
   DB.records.push({id:'IMP-'+(++DB.n),issuer,src,title,level:lvl,type:'academic',status:'active',date:dt,issuedAt:today()});out.accepted++});
  audit(u,`import ${out.accepted} accepted, ${out.duplicates} duplicates, ${out.conflicts} conflicts, ${out.rejected.length} problems`);return send(res,200,out)}
 const mine=c=>{const r=DB.records.find(x=>x.id===c.recordId);return r&&r.issuer===u.org};
 if(p==='/api/corrections'&&m==='GET'){if(canP(u,'records'))return send(res,200,{corrections:DB.corr});
  if(['admin','organizer'].includes(u.role))return send(res,200,{corrections:DB.corr.filter(mine).map(c=>({...c,record:DB.records.find(x=>x.id===c.recordId)}))});
  return send(res,403,{error:'Not allowed'})}
 if(p==='/api/corrections'&&m==='POST'){if(u.role!=='sara')return send(res,403,{error:'Only Sara can request a correction to her records'});
  const b=await body(req),rec=DB.records.find(x=>x.id===b.recordId);if(!rec||rec.status!=='active')return send(res,400,{error:'Pick an active record'});
  const reason=String(b.reason||'').trim().slice(0,300);if(!reason)return send(res,400,{error:'Explain what is wrong'});
  const fix=String(b.fix||'').trim().slice(0,120);if(!fix)return send(res,400,{error:'Say what the record should show instead'});
  if(DB.corr.some(c=>c.recordId===rec.id&&c.status==='pending'))return send(res,409,{error:'A correction for this record is already waiting for the issuer'});
  DB.corr.push({id:'COR-'+(DB.corr.length+1),recordId:rec.id,reason,fix,by:u.role,status:'pending'});audit(u,'correction requested '+rec.id);return send(res,201,{ok:1})}
 mm=p.match(/^\/api\/corrections\/([\w-]+)\/(approve|reject)$/);
 if(mm&&m==='POST'){if(!['admin','organizer'].includes(u.role))return send(res,403,{error:'Only the issuer can decide a correction'});
  const c=DB.corr.find(x=>x.id===mm[1]),rec=c&&DB.records.find(x=>x.id===c.recordId);if(!c||!rec||c.status!=='pending')return send(res,404,{error:'No pending request'});
  if(rec.issuer!==u.org){audit(u,'correction DENIED '+rec.id);return send(res,403,{error:'Only the issuing organisation can correct this record'})}
  if(mm[2]==='approve'){if(rec.status!=='active')return send(res,409,{error:'This record is no longer active, so it cannot be corrected. Reject the request instead'});
   const ver=(rec.ver||1)+1,nr={...rec,id:rec.id.replace(/-v\d+$/,'')+'-v'+ver,ver,title:c.fix||rec.title,replaces:rec.id,status:'active',issuedAt:today()};delete nr.replacedBy;DB.records.push(nr);rec.status='superseded';rec.replacedBy=nr.id}
  c.status=mm[2]==='approve'?'approved':'rejected';c.decidedBy=u.id;audit(u,'correction '+c.status+' '+rec.id);return send(res,200,{ok:1})}
 if(p==='/api/audit'&&m==='GET')return ['admin','governance','operator'].includes(u.role)?send(res,200,{audit:DB.audit.slice(-50)}):send(res,403,{error:'Only governance roles can read the activity log'});

 const G=u.role==='governance',OP=u.role==='operator',day=()=>new Date(now()).toISOString().slice(0,10),TYPES=['enrollment','academic','award','participation','training','qualification'];
 const OPPS=[{id:'OPP-1',title:'Sustainability Challenge 2026',org:COMP,kind:'Competition',tags:['sustainability','environment'],deadline:'2027-03-01',apply:true},{id:'OPP-2',title:'Young Coders Bootcamp',org:TRAIN,kind:'Training',tags:['coding','technology'],deadline:'2027-02-15'},{id:'OPP-3',title:'Hope Scholarship 2027',org:'Hope Foundation',kind:'Scholarship',tags:['sustainability','leadership','finalist'],deadline:'2027-04-30'},{id:'OPP-4',title:'Renewable Energy Research Internship',org:'Future University E',kind:'Internship',tags:['engineering','energy'],deadline:'2027-05-10'},{id:'OPP-5',title:'Green Design Studio (elective)',org:UNI,kind:'Course',tags:['finalist','design'],deadline:'2027-01-20'}];
 if(p==='/api/state')return send(res,200,{clock:day(),off:DB.off});
 if(p==='/api/clock'&&m==='POST'){if(!G&&!OP)return send(res,403,{error:'Only platform operators can do this'});const{days}=await body(req);const d=Math.max(0,Math.min(400,Math.floor(+days||0)));DB.off+=d;audit(u,'clock +'+d+' days');return send(res,200,{clock:day()})}
 if(p==='/api/reset'&&m==='POST'){if(!OP)return send(res,403,{error:'Only platform operators can do this'});DB=mkDB();audit(u,'demo reset');return send(res,200,{ok:1})}
 if(p==='/api/gov'&&m==='GET')return G?send(res,200,{issuers:DB.issuers,guardian:{...DB.guardian,status:gStatus()},audit:DB.audit.slice(-15),note:'Proposed demo rules, not an actual national authority.'}):send(res,403,{error:'Only the governance administrator can do this'});
 if(p==='/api/gov/issuer'&&m==='POST'){if(!G)return send(res,403,{error:'Only the governance administrator can do this'});
  const b=await body(req),i=DB.issuers.find(x=>x.id===b.id);if(!i)return send(res,404,{error:'No pending request'});
  if(!['approved','rejected','suspended'].includes(b.status))return send(res,400,{error:'Bad status'});
  const why=String(b.reason||'').trim().slice(0,200);if(!why)return send(res,400,{error:'A reason is required'});
  const ty=(Array.isArray(b.types)?b.types:[]).map(x=>String(x).trim().toLowerCase()).filter((t,k,a)=>TYPES.includes(t)&&a.indexOf(t)===k);
  if(b.status==='approved'&&!ty.length)return send(res,400,{error:'Choose at least one record type this issuer may issue'});
  i.status=b.status;if(b.status==='approved')i.types=ty;
  i.by=u.name;i.date=day();i.reason=why;audit(u,`issuer ${i.id} ${i.status}; existing records untouched`);return send(res,200,{ok:1})}
 if(p==='/api/gov/guardian'&&m==='POST'){if(!G)return send(res,403,{error:'Only the governance administrator can do this'});
  const{status}=await body(req);if(!['approved','rejected'].includes(status))return send(res,400,{error:'Bad status'});
  if(DB.guardian.status==='revoked'&&status==='approved')return send(res,409,{error:'Sara revoked this supporter. Only Sara can invite them again'}); // governance cannot override Sara
  DB.guardian.status=status;if(status==='approved')DB.guardian.reviewAt=now()+90*864e5;audit(u,'guardian link '+status);return send(res,200,{ok:1})}
 if(p==='/api/issuer-status'&&m==='GET'){if(!['admin','organizer'].includes(u.role))return send(res,403,{error:'Not allowed'});const i=DB.issuers.find(x=>x.org===u.org);
  return send(res,200,{org:u.org,status:i?i.status:'unlisted',types:i?i.types:[],id:i?i.id:null})}
 if(p==='/api/issue'&&m==='POST'){if(u.role!=='organizer')return send(res,403,{error:'Only an authorised issuer can issue records'});
  const[c,o]=issueRecord(u,await body(req));return send(res,c,o)}
 if(p==='/api/apply/status'&&m==='POST'){if(u.role!=='organizer'||u.org!==COMP)return send(res,403,{error:'Not allowed'});const{status}=await body(req);
  if(!DB.apply.submitted)return send(res,409,{error:'No submitted application to update'});
  if(!['under review','more information requested','accepted','declined'].includes(status))return send(res,400,{error:'Bad status'});DB.apply.status=status;(DB.apply.log=DB.apply.log||[]).push({status,at:today()});audit(u,'application '+status);return send(res,200,{ok:1})}
 if(p==='/api/onboarding'&&m==='GET'){if(!can(u))return send(res,403,{error:'Not allowed'})}
 if(p==='/api/onboarding'&&m==='GET')return send(res,200,{onb:DB.onb,learner:DEMO.LEARNER,guardian:{status:gStatus(),scope:DB.guardian.scope,reviewAt:new Date(DB.guardian.reviewAt).toISOString().slice(0,10)},school:DB.records.filter(r=>r.type==='enrollment'&&r.issuer===UNI&&r.status!=='superseded').pop()||DB.records[0]});
 if(p==='/api/onboarding'&&m==='POST'){if(u.role!=='sara')return send(res,403,{error:'Only Sara can complete her onboarding'});
  const{action}=await body(req);if(!['next','card'].includes(action))return send(res,400,{error:'Unknown action'});if(action==='next'&&DB.onb.step<6)DB.onb.step++;
  if(action==='card'){if(DB.onb.step<6)return send(res,409,{error:'Finish the onboarding steps first'});if(!DB.onb.ref){DB.onb.ref='EP-'+crypto.randomBytes(4).toString('hex').toUpperCase();audit(u,'card generated')}}
  return send(res,200,{onb:DB.onb})}
 // --- Support & Access: Sara decides what her supporter and advisor may do. Private support documents and sharing are never delegated. ---
 if(p==='/api/access'&&m==='GET'){if(u.role==='sara')return send(res,200,{supporter:supInfo(),advisor:{...DB.advisor}});
  if(u.role==='parent')return send(res,200,{supporter:supInfo()});
  return send(res,403,{error:'Not allowed'})}
 if(p==='/api/access/supporter'&&m==='POST'){if(u.role!=='sara')return send(res,403,{error:'Only Sara can change who supports her'});
  const b=await body(req),st=gStatus();let changed=false;
  if(b.action==='revoke'){if(st!=='revoked'){DB.guardian.status='revoked';audit(u,'supporter access revoked by Sara')}changed=true}
  else if(b.action==='invite'){if(['revoked','rejected','expired'].includes(st)){DB.guardian.status='pending';DB.guardian.reviewAt=now()+90*864e5;audit(u,'supporter invited again; waiting for relationship check')}changed=true}
  else if(b.action!==undefined)return send(res,400,{error:'Unknown action'});
  if(b.perms&&typeof b.perms==='object'){for(const k of['records','deadlines','draft'])if(typeof b.perms[k]==='boolean')DB.guardian.perms[k]=b.perms[k];audit(u,'supporter permissions '+JSON.stringify(DB.guardian.perms));changed=true}
  if(!changed)return send(res,400,{error:'Unknown action'});
  return send(res,200,{supporter:supInfo()})}
 if(p==='/api/access/advisor'&&m==='POST'){if(u.role!=='sara')return send(res,403,{error:'Only Sara can change what her advisor sees'});
  const b=await body(req),on=typeof b.on==='boolean'?b.on:DB.advisor.on;
  const scope=Array.isArray(b.scope)?['academic','extracurricular'].filter(x=>b.scope.includes(x)):DB.advisor.scope;
  if(on&&!scope.length)return send(res,400,{error:'Choose at least one kind of record for your advisor'});
  DB.advisor={on,scope};audit(u,`advisor access ${on?'on: '+scope.join('+'):'off'}`);return send(res,200,{advisor:{...DB.advisor}})}
 // Safeer AI assistant and agent (safeer.js): answers only from what this role may see
 if(p.startsWith('/api/safeer/'))return SAFEER.handle(p,m,u,req,res,{DB,OPPS,see,par,visFor,gStatus,gs,verify,send,body,audit,DEMO});
 if(p==='/api/suggestions'&&m==='GET'){if(!canP(u,'deadlines'))return send(res,403,{error:'Only Sara or her linked parent can see suggestions'});
  // deterministic rules, not an AI model: an opportunity is suggested when it matches an interest OR one of Sara's active records. Never an eligibility decision.
  const act=DB.records.filter(r=>r.status==='active'),words=r=>(r.title+' '+(r.level||'')).toLowerCase();
  const list=OPPS.filter(o=>!DB.dismissed.includes(o.id)).map(o=>{const hits=o.tags.filter(t=>DB.interests.includes(t)),recs=act.filter(r=>o.tags.some(t=>words(r).includes(t)));
    return{...o,hits,records:recs.map(r=>r.id),why:[...hits.map(t=>({kind:'interest',text:t})),...recs.map(r=>({kind:'record',id:r.id,text:r.title}))]}}).filter(o=>o.why.length);
  return send(res,200,{interests:DB.interests,suggestions:list,note:'Suggestions use simple matching rules. They are not an eligibility decision.'})}
 if(p==='/api/interests'&&m==='POST'){if(u.role!=='sara')return send(res,403,{error:'Only Sara can change her interests'});
  const{interests}=await body(req);DB.interests=(Array.isArray(interests)?interests:[]).map(x=>String(x).trim().toLowerCase().slice(0,30)).filter(Boolean).slice(0,8);audit(u,'interests edited');return send(res,200,{ok:1})}
 if(p==='/api/suggestions/dismiss'&&m==='POST'){if(u.role!=='sara')return send(res,403,{error:'Only Sara can change her interests'});const{id}=await body(req);
  if(!OPPS.some(o=>o.id===id))return send(res,404,{error:'Unknown opportunity'});if(!DB.dismissed.includes(id))DB.dismissed.push(id);return send(res,200,{ok:1})}
 if(p==='/api/retention'&&m==='GET')return G||OP?send(res,200,{rules:DB.rules,attach:DB.attach,today:day(),note:'Sample durations for the demo only. They are not legal requirements. Copies held by other organisations are outside Tayseer control.'}):send(res,403,{error:'Only the governance administrator can do this'});
 if(p==='/api/retention/hold'&&m==='POST'){if(!G)return send(res,403,{error:'Only the governance administrator can do this'});const b=await body(req),r=DB.rules.find(x=>x.cat===b.cat);
  if(!r)return send(res,404,{error:'No pending request'});r.hold=!!b.hold;audit(u,`retention hold ${r.cat} ${r.hold}`);return send(res,200,{ok:1})}
 if(p==='/api/retention/review'&&m==='POST'){if(!G&&!OP)return send(res,403,{error:'Only platform operators can do this'});
  const rule=DB.rules.find(x=>x.cat==='Application attachments'),busy=DB.apply.submitted&&!['accepted','declined'].includes(DB.apply.status),out=[];
  DB.attach.forEach(a=>{if(a.status!=='kept'&&!a.status.startsWith('held'))return;if(a.at+rule.days*864e5>now())return;
   if(rule.hold||busy){a.status='held ('+(rule.hold?'legal or operational hold':'active review')+')'}else a.status='deleted';out.push(a.id+' '+a.status)});
  audit(u,'retention review: '+(out.join(', ')||'nothing due')+'; learner records not touched');return send(res,200,{result:out})}
 if(p==='/api/ops'&&m==='GET')return OP?send(res,200,{jobs:[{name:'Import validation',status:'idle'},{name:'Retention review',status:'scheduled (manual in demo)'},{name:'Notification sender',status:'simulated'}],health:[{name:'UAE PASS',status:'simulated'},{name:'Email and SMS',status:'simulated'},{name:'AI service',status:'not connected'},{name:'Storage',status:'in server memory'}],events:DB.audit.filter(a=>/import|DENIED|denied|reset|clock/.test(a)).slice(-10),clock:day()}):send(res,403,{error:'Only platform operators can do this'});
 send(res,404,{error:'Not found'})}
const origin=req=>`http://${req.headers.host}`;
const DIST=path.join(__dirname,'client','dist');
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.mp4':'video/mp4','.webm':'video/webm'};
function serveStatic(res,pathname){
 if(!fs.existsSync(DIST))return send(res,503,'Client not built. Run: npm run build','text/plain');
 let f=path.normalize(path.join(DIST,pathname==='/'?'index.html':pathname));
 if(!f.startsWith(DIST+path.sep)&&f!==DIST)return send(res,403,'Forbidden','text/plain');
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){if(path.extname(pathname))return send(res,404,'Not found','text/plain');f=path.join(DIST,'index.html')}
 res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':path.extname(f)==='.html'?'no-store':'no-cache'});res.end(fs.readFileSync(f))}
const handler=async(req,res)=>{try{const url=new URL(req.url,'http://x');
 if(url.pathname.startsWith('/api/'))return await api(req,res,url);
 serveStatic(res,decodeURIComponent(url.pathname))}catch(e){console.error(e);send(res,500,{error:'Server error'})}};
// `npm start` runs a normal server; on Vercel, api/index.js imports the handler instead
if(require.main===module)http.createServer(handler).listen(PORT,()=>console.log('Tayseer on http://localhost:'+PORT+'  (demo PIN 1234)'));
module.exports={handler};

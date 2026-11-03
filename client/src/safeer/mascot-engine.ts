// @ts-nocheck
// Safeer the 3D falcon (ported from the Tayseer passport prototype, three.js r128). State comes from getState(); returns a dispose function.
import * as THREE from 'three'
export function startMascot(el,getState,close){
var T=THREE,D=document.documentElement,rm=matchMedia("(prefers-reduced-motion:reduce)");
function A(){return(rm.matches||D.dataset.rm==="on")?0:1;}
var R=new T.WebGLRenderer({antialias:true,alpha:true});
R.setPixelRatio(Math.min(devicePixelRatio||1,1.5));R.outputEncoding=T.sRGBEncoding;R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;
el.appendChild(R.domElement);
var sc=new T.Scene(),cam=new T.PerspectiveCamera(30,1,.1,100);if(close){cam.position.set(0,2.8,8.4);cam.lookAt(0,2.7,0);}else{cam.position.set(0,2.5,13);cam.lookAt(0,2.0,0);}
sc.add(new T.HemisphereLight(0xfffbf0,0xc9a85a,1.05));
var key=new T.DirectionalLight(0xffffff,.9);key.position.set(3,6,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.radius=6;
var sh=key.shadow.camera;sh.left=sh.bottom=-4;sh.right=sh.top=4;sc.add(key);
var fl=new T.DirectionalLight(0xffe9b8,.4);fl.position.set(-5,2,4);sc.add(fl);
function M(c,r,o){o=o||{};o.color=c;o.roughness=r==null?.6:r;return new T.MeshStandardMaterial(o);}
var body=M(0xf5b73a,.5),deep=M(0xdf8f20,.5),gold=M(0x92722A,.5),cream=M(0xfff6e4,.4),brown=M(0x4a2a18,.35),peach=M(0xf79b8c,.8),wht=M(0xffffff,.2),beak=M(0xe8741c,.4),tip=M(0x9a4a14,.5);
var SG=new T.SphereGeometry(1,40,28),bird=new T.Group();sc.add(bird);
function S(m,sx,sy,sz,x,y,z,p){var o=new T.Mesh(SG,m);o.scale.set(sx,sy,sz);o.position.set(x,y,z);o.castShadow=true;(p||bird).add(o);return o;}
function cl(v,a){return Math.max(-a,Math.min(a,v));}
function RB(m,w,h,d,r,x,y,z,p){var g=new T.BoxGeometry(w,h,d,10,10,10),q=g.attributes.position,v=new T.Vector3,c=new T.Vector3,hx=w/2-r,hy=h/2-r,hz=d/2-r;
 for(var i=0;i<q.count;i++){v.fromBufferAttribute(q,i);c.set(cl(v.x,hx),cl(v.y,hy),cl(v.z,hz));v.sub(c).normalize().multiplyScalar(r).add(c);q.setXYZ(i,v.x,v.y,v.z);}
 g.computeVertexNormals();var o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;(p||bird).add(o);return o;}
var gr=new T.Mesh(new T.PlaneGeometry(14,14),new T.ShadowMaterial({opacity:.2}));gr.rotation.x=-Math.PI/2;gr.position.y=-.02;gr.receiveShadow=true;sc.add(gr);
// body, chest core, collar
RB(body,1.5,1.25,1.1,.42,0,.98,0);S(gold,.8,.14,.6,0,1.55,.02);
var core=new T.Mesh(new T.TorusGeometry(.27,.05,16,40),deep);core.position.set(0,.98,.56);bird.add(core);
S(cream,.22,.22,.05,0,.98,.55);
var orbM=M(0xffc94d,.2,{emissive:0xffb020,emissiveIntensity:.6}),orb=S(orbM,.1,.1,.07,0,.98,.6);
var ring=new T.Mesh(new T.TorusGeometry(.2,.015,8,40),wht);ring.position.set(0,.98,.62);bird.add(ring);
var pl=new T.PointLight(0xffd27a,.6,3);pl.position.set(0,1,1.4);bird.add(pl);
// tail fan
var tailG=new T.Group();tailG.position.set(0,.6,-.55);bird.add(tailG);
[-.35,0,.35].forEach(function(a){var f=S(a?deep:gold,.14,.12,.55,0,0,0,tailG);f.position.set(Math.sin(a)*.6,-.1,-.5);f.rotation.y=a;});
// legs + talon feet
[-1,1].forEach(function(s){S(deep,.2,.22,.2,s*.4,.3,0);S(deep,.38,.2,.5,s*.4,.12,.12);
 [-1,0,1].forEach(function(t){S(gold,.07,.07,.14,s*.4+t*.14,.1,.56);});});
// wings (arms)
function wing(s){var g=new T.Group();g.position.set(s*.84,1.45,0);bird.add(g);
 S(body,.2,.5,.34,s*.06,-.42,0,g);S(deep,.14,.3,.3,s*.08,-.8,0,g);
 [-1,0,1].forEach(function(i){S(i?gold:tip,.06,.26,.1,s*(.1+i*.06),-1.08,i*.05,g).rotation.z=-s*i*.18;});return g;}
var wL=wing(-1),wR=wing(1);
// tablet
var tab=new T.Group();tab.position.set(0,1.0,.95);tab.rotation.x=-.25;bird.add(tab);
RB(M(0x2e3a3a,.4),1,.7,.07,.03,0,0,0,tab);RB(cream,.9,.6,.02,.02,0,0,.04,tab);S(gold,.14,.14,.02,0,0,.06,tab);
// head (chibi: big head, big eyes, small beak)
var head=new T.Group();head.position.set(0,2.5,0);bird.add(head);
RB(body,2.5,1.9,1.8,.75,0,0,0,head);
RB(cream,2.05,1.4,.1,.2,0,-.03,.87,head);
[-1,1].forEach(function(s){var p=new T.Mesh(new T.CylinderGeometry(.38,.38,.18,32),deep);p.rotation.z=Math.PI/2;p.position.set(s*1.32,-.05,0);p.castShadow=true;head.add(p);
 var q=new T.Mesh(new T.CylinderGeometry(.22,.22,.22,32),gold);q.rotation.z=Math.PI/2;q.position.set(s*1.34,-.05,0);head.add(q);});
// circle antenna
var hM=M(0xffd36a,.3,{emissive:0xffb020,emissiveIntensity:.8});
S(deep,.4,.12,.4,0,.97,0,head);S(gold,.045,.3,.045,0,1.2,0,head);
var heart=S(hM,.2,.2,.2,0,1.6,0,head);
var hl=new T.PointLight(0xffd27a,.5,2.5);hl.position.set(0,1.7,.5);head.add(hl);
// small hooked beak + jaw
var cere=M(0xffd770,.45);S(cere,.2,.14,.09,0,-.13,.94,head);S(tip,.02,.026,.02,-.06,-.1,1.02,head);S(tip,.02,.026,.02,.06,-.1,1.02,head);
[[-.17,1.0,.15,.13,.16],[-.2,1.08,.12,.11,.13],[-.26,1.14,.09,.09,.1],[-.33,1.17,.06,.08,.06]].forEach(function(b,i){S(i==3?tip:beak,b[2],b[3],b[4],0,b[0],b[1],head);});
var jawM=new T.Group();jawM.position.set(0,-.42,0);head.add(jawM);S(deep,.1,.045,.1,0,.03,1.0,jawM);S(beak,.07,.04,.08,0,.04,1.07,jawM);
var eyes=[];
[-1,1].forEach(function(s){
 var e=new T.Group();e.position.set(s*.56,.15,.93);head.add(e);
 var pg=new T.Group();e.add(pg);S(brown,.18,.23,.06,0,0,0,pg);S(wht,.065,.065,.04,.06,.09,.05,pg);S(wht,.03,.03,.03,-.06,-.08,.05,pg);
 var arc=new T.Mesh(new T.TorusGeometry(.16,.03,8,20,Math.PI),brown);arc.position.set(0,-.05,.02);arc.visible=false;e.add(arc);e.pg=pg;e.arc=arc;eyes.push(e);
 S(deep,.26,.06,.1,s*.56,.55,.9,head).rotation.z=-s*.18;
 S(peach,.25,.16,.04,s*.86,-.22,.93,head);});
// overlays
var sparks=[],dots=[],sg=new T.OctahedronGeometry(.13),sm=M(0xe3b23c,.3,{emissive:0xe3b23c,emissiveIntensity:.8});
for(var i=0;i<8;i++){var sp=new T.Mesh(sg,sm);sc.add(sp);sparks.push(sp);}
for(i=0;i<3;i++){dots.push(S(M(0x92722A,.4,{emissive:0x92722A,emissiveIntensity:.4}),.1+i*.04,.1+i*.04,.1+i*.04,0,0,0,sc));}
var qc=document.createElement("canvas");qc.width=qc.height=128;var qx=qc.getContext("2d");qx.font="800 110px sans-serif";qx.textAlign="center";qx.textBaseline="middle";qx.fillStyle="#92722A";qx.fillText("?",64,70);
var qs=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(qc),transparent:true}));qs.scale.set(1.2,1.2,1);sc.add(qs);
// states
var BS={hz:0,hx:0,hy:0,ang:.12,fwd:0,px:0,py:0,o:.6,r:.6,hap:0,wk:0,tab:0};
function st(x){var o={},k;for(k in BS)o[k]=x[k]!=null?x[k]:BS[k];return o;}
var ST={idle:st({}),listening:st({hz:.2,hy:.15,o:.9,ang:.25}),thinking:st({hx:-.15,hy:.4,px:.05,py:.06,o:1.4,r:7}),
speaking:st({o:1.2,r:1.5,ang:.3}),teaching:st({hx:.12,py:-.05,fwd:1,tab:1,ang:-.2,o:1}),celebrate:st({hap:1,ang:2.4,o:1.5,r:3}),
curious:st({hz:.3,hx:-.1,px:.04,py:.05}),wink:st({hz:-.12,wk:1})};
var cur=st({}),k,state="idle",vs=0,vd=0,vq=0,jaw=0,drag=0,dragging=false,lx=0,ra=0,t0=performance.now();
var raf=0,ro=null;
function rs(){var w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
if(window.ResizeObserver){ro=new ResizeObserver(rs);ro.observe(el);}rs();
el.addEventListener("pointerdown",function(e){dragging=true;lx=e.clientX;try{el.setPointerCapture(e.pointerId);}catch(x){}el.style.cursor="grabbing";});
el.addEventListener("pointermove",function(e){if(dragging){drag+=(e.clientX-lx)*.012;lx=e.clientX;}});
["pointerup","pointercancel"].forEach(function(n){el.addEventListener(n,function(){dragging=false;el.style.cursor="grab";});});
var lastF=0;
function frame(){
 var nowF=performance.now();if(document.hidden||nowF-lastF<33){raf=requestAnimationFrame(frame);return}lastF=nowF; // ~30fps, paused in background tabs
 state=getState()||"idle";var amp=A(),t=(performance.now()-t0)/1000,tg=ST[state]||ST.idle,hx,hy,ang,jt=0,hop=0;
 for(k in tg)cur[k]+=(tg[k]-cur[k])*.1;
 hx=cur.hx;hy=cur.hy;ang=cur.ang;
 if(amp){hy+=Math.sin(t*.8)*.1*(state==="idle"?1:.3);
  if(state==="idle")ang+=Math.sin(t*1.6)*.04;
  if(state==="speaking"){jt=(Math.sin(t*15)*.5+.5)*.7;hx+=Math.sin(t*6)*.05;}
  if(state==="thinking")hy+=Math.sin(t*2)*.05;
  if(state==="celebrate"){hop=Math.abs(Math.sin(t*6.5))*.5;ang+=Math.sin(t*18)*.3;jt=.6;}
  if(state==="curious")hx+=Math.sin(t*2)*.03;}
 else if(state==="celebrate")jt=.6;
 jaw+=(jt-jaw)*.35;jawM.position.y=-.42-jaw*.14;
 bird.position.y=hop+(amp?Math.sin(t*1.8)*.04:0);
 if(!dragging)drag*=.95;
 bird.rotation.y=.3+drag+(amp?Math.sin(t*.5)*.12:0);
 head.rotation.set(hx,hy,cur.hz);
 wL.rotation.set(-cur.fwd*1.1,0,-ang);wR.rotation.set(-cur.fwd*1.1,0,ang);
 var bl=amp&&(t%4.6)>4.45;
 eyes.forEach(function(e,i){var c=cur.hap>.5||(i===1&&cur.wk>.5);e.pg.visible=!c;e.arc.visible=c;e.scale.y=bl?.1:1;e.pg.position.set(cur.px,cur.py,0);});
 orbM.emissiveIntensity=cur.o*(.75+.25*Math.sin(t*3));pl.intensity=cur.o*.6;
 hM.emissiveIntensity=.7+.3*Math.sin(t*2.4)*amp+(state==="celebrate"?.5:0);heart.rotation.y=amp?Math.sin(t*1.2)*.35:0;
 ra+=cur.r*.016*amp;ring.rotation.z=ra;
 tab.visible=cur.tab>.03;tab.scale.setScalar(Math.max(cur.tab,.01));
 var sv=(state==="celebrate"||state==="wink")?1:0,dv=state==="thinking"?1:0,qv=state==="curious"?1:0;vs+=(sv-vs)*.08;vd+=(dv-vd)*.08;vq+=(qv-vq)*.08;
 sparks.forEach(function(p,i){var a=t*.9+i*.785,r=2.3+Math.sin(t*2+i)*.2;
  p.position.set(Math.cos(a)*r,2.6+Math.sin(i*2+t*3)*1.1,Math.sin(a)*r*.5);p.rotation.y=t*2;p.scale.setScalar(vs*(.7+.3*Math.sin(t*4+i)));});
 dots.forEach(function(d,i){d.position.set(1.7+i*.35,4.4+i*.25+Math.abs(Math.sin(t*5-i*.6))*.15*amp,.6);d.visible=vd>.05;});
 qs.visible=vq>.05;qs.position.set(1.9,4.4+Math.sin(t*3)*.1*amp,.5);qs.scale.setScalar(1.2*vq);
 tailG.rotation.y=amp?Math.sin(t*2.5)*.2*(state==="celebrate"?2:1):0;R.render(sc,cam);raf=requestAnimationFrame(frame);}
frame();
return function(){cancelAnimationFrame(raf);if(ro)ro.disconnect();R.dispose();try{R.forceContextLoss()}catch(e){}if(R.domElement.parentNode)R.domElement.parentNode.removeChild(R.domElement)}}

/* InterDars \u2014 Chempionlar ligasi: 1x1 play-off turniri (BYE, duel savollari, penalti seriyasi).
   live.js bilan bir xil ID/kanal (Supabase Realtime Broadcast). live.js'dan keyin yuklanadi. */
(function(){
'use strict';
if(window.League)return;
var LSH='idLgHost',LSP='idLgPlayer',MAXP=64,STALE=3*3600*1000;
var GX=12,GY0=14,GW=76,GH=32,GL=46,BX=50,BY=104,KX=50,KY=40,SHP=['\u25b2','\u25c6','\u25cf','\u25a0'];

/* ===== yordamchilar ===== */
function $(s,r){return (r||document).querySelector(s)}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function ls(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function cleanName(s){s=String(s||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,20);return s||'Ishtirokchi'}
function LQ(){return window.LiveQuiz||{}}
function say(m){if(LQ().say)LQ().say(m)}
function av(a,s,n){return LQ().av?LQ().av(a,s,n,true):'<span class="jq-av" style="--s:'+s+'px;background:#4B6BFF"><span class="jq-av-initial">'+esc(String(n||'?').charAt(0))+'</span></span>'}
function obs(r){if(LQ().observe&&r)LQ().observe(r)}
function pinFmt(p){return p.slice(0,3)+' '+p.slice(3)}
function rname(size){return size===2?'Final':size===4?'Yarim final':size===8?'Chorak final':'1/'+(size/2)+' final'}
var TM=[];function after(ms,fn){var t=setTimeout(fn,ms);TM.push(t);return t}
var AC=null,SND=true;
function beep(f,d,ty,v,at){if(!SND)return;try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();var t=AC.currentTime+(at||0),o=AC.createOscillator(),g=AC.createGain();o.type=ty||'sine';o.frequency.value=f;g.gain.setValueAtTime(v||.07,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+.02)}catch(e){}}
var SX={ok:function(){beep(660,.12,'triangle');beep(990,.18,'triangle',.07,.1)},bad:function(){beep(200,.3,'sawtooth',.05)},goal:function(){[523,659,784,1046].forEach(function(f,i){beep(f,.2,'triangle',.08,i*.09)})},save:function(){beep(300,.15,'square',.05);beep(220,.25,'square',.05,.12)},draw:function(){beep(500,.08,'square',.04)}};

/* ===== sof mantiq: bracket, BYE, penalti ===== */
function mkm(a,b,st,third){var m={a:a,b:b,st:st,sa:0,sb:0,w:0,l:0};if(st==='bye')m.w=a;if(third)m.third=1;return m}
/* N ishtirokchi \u2192 M=2^k, B=M-N ta BYE; BYE olganlar 1-bosqichda raqibsiz o'tadi */
function mkBracket(ids){var N=ids.length,M=1;while(M<N)M*=2;var R=Math.round(Math.log(M)/Math.LN2),B=M-N,a=shuffle(ids.slice()),sl=[],i;
  for(i=0;i<B;i++)sl.push(mkm(a[i],0,'bye'));
  for(i=B;i<N;i+=2)sl.push(mkm(a[i],a[i+1],'wait'));
  shuffle(sl);var rs=[sl];
  for(i=1;i<R;i++){var c=M/Math.pow(2,i+1),r=[];for(var j=0;j<c;j++)r.push(mkm(0,0,'wait'));rs.push(r)}
  return{M:M,R:R,B:B,rounds:rs}}
/* N ta (1/3/5) zarba; teng bo'lsa \u2014 o'lim zarbasi (kimdir yutguncha). 0=davom, 1=A, 2=B */
function penDone(p,N){N=N||3;var a=p.ka,b=p.kb,sa=p.ga,sb=p.gb;
  if(a<=N&&b<=N){if(sa>sb+(N-b))return 1;if(sb>sa+(N-a))return 2}
  if(a===b&&a>=N&&sa!==sb)return sa>sb?1:2;return 0}
function gauss(){return(Math.random()+Math.random()+Math.random()-1.5)*1.15}
/* chizilgan yo'l \u2192 zarba: chizish tezligi = kuch, egrilik \u00d7 tezlik = burama (spin), kuchli zarba noaniqroq */
function mkShot(tr){var n=tr.length;if(n<4)return null;var a=tr[0],b=tr[n-1],dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy);
  if(L<18||dy>-6)return null;
  var D=Math.max(60,b.t-a.t),sp=clamp((L/D-.12)/.8,0,1),ux=dx/L,uy=dy/L,nx=-uy,ny=ux,bow=0,i;
  for(i=1;i<n-1;i++){var d=(tr[i].x-a.x)*nx+(tr[i].y-a.y)*ny;if(Math.abs(d)>Math.abs(bow))bow=d}
  bow/=L;var curl=clamp(bow,-.45,.45)*(.6+sp)*L*.55;
  var pts=[],m=Math.min(10,n);for(i=0;i<m;i++){var q=tr[Math.round(i*(n-1)/(m-1))];pts.push([q.x,q.y])}
  var e=pts[pts.length-1];
  if(e[1]>GL-4){var k=tr[Math.max(0,n-4)],ex=b.x-k.x,ey=b.y-k.y;if(ey>=-.5)return null;var f=(b.y-(GL-4))/(-ey);pts.push([b.x+ex*f,GL-4])}
  var sg=1.2+9*sp,E=pts[pts.length-1];E[0]+=gauss()*sg;E[1]+=gauss()*sg*.5;
  var last=pts.length-1;pts.forEach(function(p,j){var u=j/last;p[0]+=nx*curl*u*u;p[1]+=ny*curl*u*u});
  E=pts[last];
  return{pts:pts.map(function(p){return[Math.round(p[0]*10)/10,Math.round(p[1]*10)/10]}),fl:Math.round(1250-sp*850),tx:(E[0]-GX)/GW,ty:(E[1]-GY0)/GH,sp:sp}}

/* ===== penalti sahnasi: faqat penalti kerak bo'lganda yuklanadi (bosh sahifaga ta'sir qilmaydi) ===== */
var STG={p:null,ok:false,err:false},PK_RES=5600,PK_WIN=700,PK_AIM=14000;
function loadStage(){if(window.PenaltyStage){STG.ok=true;return Promise.resolve(true)}if(STG.p)return STG.p;
  STG.p=new Promise(function(res){var sc=document.createElement('script');sc.src='/penalty-stage.js?v=4';sc.async=true;
    sc.onload=function(){if(!window.PenaltyStage){STG.ok=false;STG.err=true;STG.p=null;res(false);return}window.PenaltyStage.load().then(function(ok){STG.ok=!!ok;STG.err=!ok;if(!ok)STG.p=null;res(!!ok)})};
    sc.onerror=function(){STG.err=true;STG.p=null;try{sc.remove()}catch(e){}res(false)};document.head.appendChild(sc)});return STG.p}
/* sahna yuklanmasa: oddiy hisob (zaxira) */
function fbResolve(k,d){if(!k)return'miss';if(Math.abs(k.tx)>3.66||k.ty<0||k.ty>2.44)return'miss';if(!d)return'goal';
  return Math.hypot(k.tx-(d[0]-.5)*7.32,k.ty-d[1]*2.6)<1.15?'save':'goal'}

/* ===== tarmoq ===== */
var NET={ch:null,ok:false};
function netOpen(pin,onMsg,onSt){netClose();var sb=window.sb;if(!sb||!sb.channel)return false;
  var ch=sb.channel('idlive-'+pin,{config:{broadcast:{self:false,ack:false}}});
  ch.on('broadcast',{event:'m'},function(e){try{if(NET.ch===ch)onMsg(e.payload||{})}catch(err){console.warn('league',err)}});
  ch.subscribe(function(s){if(NET.ch!==ch)return;NET.ok=s==='SUBSCRIBED';onSt(s)});NET.ch=ch;return true}
function netClose(d){var ch=NET.ch;NET.ch=null;NET.ok=false;if(!ch)return;setTimeout(function(){try{window.sb.removeChannel(ch)}catch(e){}},d||0)}
function send(p){var ch=NET.ch;if(!ch)return;if(ch.state?ch.state!=='joined':!NET.ok)return;try{var r=ch.send({type:'broadcast',event:'m',payload:p});if(r&&r.catch)r.catch(function(){})}catch(e){}}

/* ===== overlay + qo'riqlash ===== */
var R=null,M=null,H=null,P=null,HT=0,guard=false,WL=null;
function mount(){if(R)return;var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  R=document.createElement('div');R.className='lgx';R.hidden=true;R.setAttribute('role','dialog');R.setAttribute('aria-label','Chempionlar ligasi');
  R.innerHTML='<div class="lgm" id="lgm"></div><div class="lgmod" id="lgmod" hidden></div><div class="lgconn" id="lgconn" hidden>\u26a0\ufe0f Aloqa uzildi \u2014 qayta ulanmoqda\u2026</div>';
  document.body.appendChild(R);M=$('#lgm');R.addEventListener('click',onClick)}
function openOv(){mount();R.hidden=false;document.body.style.overflow='hidden';guardOn();try{if(navigator.wakeLock&&!WL)navigator.wakeLock.request('screen').then(function(l){WL=l;l.addEventListener('release',function(){WL=null})}).catch(function(){})}catch(e){}}
function closeOv(){if(R)R.hidden=true;document.body.style.overflow='';guardOff();TM.forEach(clearTimeout);TM=[]}
function view(h,cls){M.className='lgm '+(cls||'');M.innerHTML=h;obs(M)}
function modal(h,k){var m=$('#lgmod');m.dataset.k=k||'';m.innerHTML='<div class="lgmb">'+h+'</div>';m.hidden=false}
function modalClose(){var m=$('#lgmod');if(m){m.hidden=true;m.innerHTML='';m.dataset.k=''}}
function conn(bad){var c=$('#lgconn');if(c)c.hidden=!bad}
function guardOn(){if(guard)return;guard=true;try{if(!(history.state&&history.state.lg))history.pushState({lg:1},'',location.href)}catch(e){}
  window.addEventListener('popstate',onPop);window.addEventListener('beforeunload',onUnload)}
function guardOff(){if(!guard)return;guard=false;window.removeEventListener('popstate',onPop);window.removeEventListener('beforeunload',onUnload);try{if(history.state&&history.state.lg)history.back()}catch(e){}}
function onPop(){if(!guard)return;try{history.pushState({lg:1},'',location.href)}catch(e){}askExit()}
function onUnload(e){if(!guard)return;e.preventDefault();e.returnValue='';return ''}
function askExit(){if(!(H||P))return;if((H&&H.ph==='fin')||(P&&P.S&&P.S.ph==='fin')){leave();return}if($('#lgmod').dataset.k==='exit')return;
  modal('<div class="em">\u26a0\ufe0f</div><h3>'+(H?'Turnirni tugatasizmi?':'Turnirdan chiqasizmi?')+'</h3><p>'+(H?'Turnir barcha ishtirokchilar uchun to\u2018xtaydi.':'Siz turnirdan chiqib ketasiz.')+'</p><div class="lgbtns"><button class="lgb ghost" data-act="mclose">Qolish</button><button class="lgb bad" data-act="exitok">'+(H?'Tugatish':'Chiqish')+'</button></div>','exit')}
function leave(msg){if(H){send({t:'end'});hStageOff();clearInterval(HT);H=null;lsDel(LSH)}
  if(P){send({t:'bye',p:P.pid});disposeStage();clearInterval(P.hl);clearInterval(P.tm);cancelAnimationFrame(P.raf||0);P=null;lsDel(LSP)}
  netClose(350);modalClose();closeOv();if(msg)say(msg)}
function topbar(extra){return '<div class="lgt"><button class="lgib" data-act="exit" aria-label="Chiqish">\u2715</button><span class="lgpill">\ud83c\udfc6 CHEMPIONLAR LIGASI</span>'+(extra||'')+'<span class="sp"></span><button class="lgib" data-act="snd" id="lgsnd">'+(SND?'\ud83d\udd0a':'\ud83d\udd07')+'</button></div>'}

/* ===== umumiy ko'rinishlar ===== */
function rosMap(S){var o={};(S.ros||[]).forEach(function(r){o[r[0]]=r});return o}
function mbox(m,ros,me,d){var A=m[0],B=m[1],st=m[5];
  function row(i,sc){var r=ros[i];return '<div class="lgr'+(i&&i===me?' me':'')+(i&&m[2]===i?' win':'')+'">'+(i?'<span>'+esc(r?r[1]:'?')+'</span><em>'+(st>=2?sc:'')+'</em>':'<span class="q">\u2014</span>')+'</div>'}
  return '<div class="lgmx'+(st===3?' pen':'')+'" style="animation-delay:'+(d||0)+'ms">'+row(A,m[3])+(st===1?'<div class="lgr bye">\ud83c\udf9f\ufe0f BYE</div>':row(B,m[4]))+(st===3?'<i>\u26bd</i>':'')+'</div>'}
function brHTML(S,me){var ros=rosMap(S),d=0;
  return '<div class="lgbr">'+S.br.map(function(r,ri){var t=ri===S.R-1?(r.length>1?'Final va 3-o\u2018rin':'Final'):rname(Math.pow(2,S.R-ri));
    return '<div class="lgcol'+(ri===S.ri?' cur':'')+'"><h4>'+t+'</h4>'+r.map(function(m){return mbox(m,ros,me,(d+=40))}).join('')+'</div>'}).join('')+'</div>'}
function optsHTML(S,my,rev){return S.a.map(function(t,i){var cl='lgop o'+i;if(rev){cl+=i===S.c?' ok':(i===my?' no':' dim')}else if(my>=0)cl+=i===my?' sel':' dim';
  return '<button class="'+cl+'"'+(rev?' disabled':' data-act="ans" data-v="'+i+'"')+'><u>'+SHP[i]+'</u><span>'+esc(t)+'</span></button>'}).join('')}
function vsBar(a,b,sc){return '<div class="lgvs">'+'<div class="s">'+av(a?a[2]:-1,46,a?a[1]:'')+'<b>'+esc(a?a[1]:'?')+'</b></div><div class="sc"><em>'+sc[0]+'</em><span>:</span><em>'+sc[1]+'</em></div><div class="s">'+av(b?b[2]:-1,46,b?b[1]:'')+'<b>'+esc(b?b[1]:'?')+'</b></div></div>'}
function podium(S){var ros=rosMap(S),f=S.fin||[],nm=function(i){var r=ros[i];return r?'<div class="pp">'+av(r[2],56,r[1])+'<b>'+esc(r[1])+'</b></div>':'<div class="pp"></div>'};
  return '<div class="lgpod"><div class="c s2">'+nm(f[1])+'<div class="bar">2</div></div><div class="c s1"><div class="cup">\ud83c\udfc6</div>'+nm(f[0])+'<div class="bar">1</div></div><div class="c s3">'+nm(f[2])+'<div class="bar">3</div></div></div>'+(f[3]?'<div class="lg4">4-o\u2018rin: <b>'+esc((ros[f[3]]||[0,'?'])[1])+'</b></div>':'')}

/* =====================  TASHKILOTCHI  ===================== */
function ok(x){return x.a&&x.a.length>=2&&x.c!=null&&(!x.k||x.k==='mcq'||x.k==='tf')}
function host(l){
  if(!l||!l.qs){say('Savollar topilmadi');return false}
  if(!window.sb||!window.sb.channel){say('Jonli rejim uchun internet kerak');return false}
  if(H||P){openOv();return true}
  if(LQ().active&&LQ().active()){LQ().open&&LQ().open();return true}
  var src=l.qs.filter(ok).map(function(x){return{q:x.q,a:x.a.slice(),c:x.c,k:x.k==='tf'?'tf':'mcq'}});
  if(src.length<2){say('Kamida 2 ta test savoli kerak');return false}
  H={v:1,pin:String(100000+Math.floor(Math.random()*900000)),lid:l.id,title:l.title,src:src,set:{time:15,nq:5,pk:3},ph:'lobby',pl:{},n:0,ri:-1,qi:-1,t0:0,dur:0,rounds:[],ts:Date.now()};
  hBoot();return true}
function hBoot(){openOv();SND=H.set.snd!==false;if(!H.set.pk)H.set.pk=3;
  netOpen(H.pin,hMsg,function(s){var bad=s==='CHANNEL_ERROR'||s==='TIMED_OUT'||s==='CLOSED';conn(bad);if(s==='SUBSCRIBED')bcast()});
  persist(1);hRender();clearInterval(HT);var hb=0;HT=setInterval(function(){hTick();if(++hb%13===0&&H)send({t:'h',ph:H.ph,qi:H.qi,ri:H.ri})},150)}
var persT=0;function persist(now){if(!H)return;clearTimeout(persT);if(now){H.ts=Date.now();lsSet(LSH,H)}else persT=setTimeout(function(){if(H){H.ts=Date.now();lsSet(LSH,H)}},300)}
function byI(i){for(var k in H.pl)if(H.pl[k].i===i)return H.pl[k];return null}
function ros(){return Object.keys(H.pl).map(function(k){return H.pl[k]}).sort(function(a,b){return a.i-b.i}).map(function(p){return[p.i,p.n,p.a]})}
function snap(){var n=Date.now(),o={ph:H.ph,ttl:H.title,R:H.R||0,ri:H.ri,nq:H.nq||0,qi:H.qi,dur:H.dur,rem:Math.max(0,H.t0+H.dur-n),rn:H.rn||'',ros:ros()};
  if(H.ph!=='lobby'&&H.rounds.length)o.br=H.rounds.map(function(r){return r.map(function(m){var x=[m.a,m.b,m.w,m.sa,m.sb,m.st==='bye'?1:m.st==='duel'?2:m.st==='pen'?3:m.st==='done'?4:0,m.third?1:0,m.pen?[m.pen.turn,m.pen.st,m.pen.ga,m.pen.gb,m.pen.ka,m.pen.kb,m.pen.seq,H.set.pk||3,m.pen.k?1:0]:0,m.ok||0];return x})});
  if((H.ph==='q'||H.ph==='rev')&&H.cq){o.q=H.cq.q;o.a=H.cq.a;if(H.ph==='rev')o.c=H.cq.c}
  if(H.ph==='fin')o.fin=H.fin;return o}
var bT=0;function bcast(){if(!H||bT)return;bT=setTimeout(function(){bT=0;if(H)send(Object.assign({t:'s'},snap()))},90)}
function rosDirty(){bcast();if(H&&H.ph==='lobby')hLobbyUpdate();persist()}
function hMsg(m){if(!H||!m)return;
  if(m.t==='hi'){var id=String(m.p||'');if(id.length<6||id.length>20)return;var p=H.pl[id],nm=cleanName(m.n),a=m.a==null?-1:+m.a;
    if(!p){if(H.ph!=='lobby'){send({t:'deny',to:id,why:'late'});return}
      if(Object.keys(H.pl).length>=MAXP){send({t:'deny',to:id,why:'full'});return}
      p=H.pl[id]={i:++H.n,n:nm,a:a};SX.draw();rosDirty()}
    else{if(p.n!==nm||p.a!==a){p.n=nm;p.a=a;rosDirty()}if(p.gone){p.gone=false;rosDirty()}}
    if(m.lg)send(Object.assign({t:'s',to:id,you:p.i},snap()));else send({t:'lg',to:id});persist()}
  else if(m.t==='ans')hAns(m);else if(m.t==='kick')hKick(m);else if(m.t==='dive')hDive(m);
  else if(m.t==='bye'){var q=H.pl[m.p];if(q){if(H.ph==='lobby')delete H.pl[m.p];else q.gone=true;rosDirty()}}}
function prepQ(x){var o=x.a.map(function(t,i){return{t:t,i:i}});if(x.k!=='tf')shuffle(o);return{q:x.q,a:o.map(function(z){return z.t}),c:o.map(function(z){return z.i}).indexOf(x.c)}}
function hDraw(){if(!H||H.ph!=='lobby')return;
  Object.keys(H.pl).forEach(function(k){if(H.pl[k].gone)delete H.pl[k]});
  var ids=Object.keys(H.pl).map(function(k){return H.pl[k].i});if(ids.length<2){say('Kamida 2 ishtirokchi kerak');return}
  var b=mkBracket(ids);H.M=b.M;H.R=b.R;H.B=b.B;H.rounds=b.rounds;H.bronze=0;H.ri=-1;
  var q=shuffle(H.src.slice()),nq=Math.max(1,Math.min(H.set.nq,Math.floor(q.length/H.R))),need=nq*H.R;H.nq=nq;H.warn=q.length<need?1:0;H.queue=[];
  for(var i=0;i<need;i++){if(i>0&&i%q.length===0)shuffle(q);H.queue.push(q[i%q.length])}
  H.ph='draw';H.t0=Date.now();H.dur=0;H.rn='Qur\u2018a';persist(1);bcast();hRender();[0,1,2].forEach(function(k){beep(400+k*150,.12,'triangle',.06,k*.12)})}
function hRoundStart(){H.ri++;var r=H.rounds[H.ri];H.rn=r.length>1&&H.ri===H.R-1?'Final va 3-o\u2018rin':rname(H.M/Math.pow(2,H.ri));
  r.forEach(function(m){if(m.st==='wait'){m.st='duel';m.sa=m.sb=0}});
  H.qs=H.queue.slice(H.ri*H.nq,(H.ri+1)*H.nq);H.qi=-1;H.ph='pre';H.t0=Date.now();H.dur=3800;persist(1);bcast();hRender();SX.ok()}
function hQStart(){H.qi++;H.cq=prepQ(H.qs[H.qi]);H.an={};H.ph='q';H.t0=Date.now();H.dur=H.set.time*1000;persist(1);bcast();hRender()}
function duels(){return H.rounds[H.ri].filter(function(m){return m.st==='duel'})}
function allAns(){return duels().every(function(m){var a=byI(m.a),b=byI(m.b);return(H.an[m.a]!=null||!a||a.gone)&&(H.an[m.b]!=null||!b||b.gone)})}
function hAns(m){if(H.ph!=='q'||m.qi!==H.ri*100+H.qi)return;var p=H.pl[m.p];if(!p)return;var d=duels().some(function(x){return x.a===p.i||x.b===p.i});if(!d)return;
  var c=+m.c;if(!(c>=0&&c<H.cq.a.length))return;if(H.an[p.i]==null)H.an[p.i]=c;send({t:'k',to:m.p});hCards()}
function hReveal(){var c=H.cq.c;duels().forEach(function(m){var x=H.an[m.a]===c?1:0,y=H.an[m.b]===c?1:0;m.sa+=x;m.sb+=y;m.ok=[x,y]});
  H.ph='rev';H.t0=Date.now();H.dur=2800;persist(1);bcast();hRender();if(H.qi>=H.nq-1&&duels().some(function(x){return x.sa===x.sb}))loadStage()}
function hRoundQEnd(){var n=Date.now(),pen=false;
  duels().forEach(function(m){m.ok=0;if(m.sa!==m.sb){m.w=m.sa>m.sb?m.a:m.b;m.l=m.sa>m.sb?m.b:m.a;m.st='done'}
    else{m.st='pen';pen=true;m.pen={turn:Math.random()<.5?0:1,st:'aim',ga:0,gb:0,ka:0,kb:0,seq:[],t0:n,k:null,dv:null,idle:0,kt:0,vis:0}}});
  if(pen){H.ph='pen';H.t0=n;H.dur=0;persist(1);bcast();loadStage();hRender()}else hRoundDone()}
function hRoundDone(){var r=H.rounds[H.ri];
  if(H.ri>=H.R-1){hFinal();return}
  var nx=H.rounds[H.ri+1];nx.forEach(function(m,s){if(!m.third){m.a=r[2*s].w;m.b=r[2*s+1].w}});
  if(H.ri===H.R-2){var l0=r[0].l,l1=r[1].l;if(l0&&l1)nx.push(mkm(l0,l1,'wait',1));else H.bronze=l0||l1||0}
  H.ph='res';H.t0=Date.now();H.dur=0;persist(1);bcast();hRender()}
function hFinal(){var r=H.rounds[H.R-1],f=r[0],t=r[1];H.fin=[f.w,f.l,t?t.w:H.bronze,t?t.l:0];H.ph='fin';H.t0=Date.now();H.dur=0;persist(1);bcast();hRender();SX.goal()}
function hTick(){if(!H)return;var n=Date.now(),ph=H.ph;
  if(ph==='pre'&&n>=H.t0+H.dur)hQStart();
  else if(ph==='q'){var rem=H.t0+H.dur-n;if(rem<=0||allAns())hReveal();else{var b=$('#lgbari'),s=$('#lgsec');if(b)b.style.width=(rem/H.dur*100)+'%';if(s)s.textContent=Math.ceil(rem/1000)}}
  else if(ph==='rev'&&n>=H.t0+H.dur){if(H.qi<H.nq-1)hQStart();else hRoundQEnd()}
  else if(ph==='pen')penTick(n)}
/* ----- penalti (tashkilotchi hakam) ----- */
function penMatch(mi){var r=H.rounds[mi&&mi[0]];return r&&r[mi[1]]}
function shooterOf(m){return m.pen.turn?m.b:m.a}
function pidOf(i){for(var id in H.pl)if(H.pl[id].i===i)return id;return null}
function hKick(m){if(H.ph!=='pen')return;var mt=penMatch(m.mi),p=H.pl[m.p];if(!mt||!p||mt.st!=='pen'||mt.pen.st!=='aim'||mt.pen.k||shooterOf(mt)!==p.i)return;var k=m.k||{};
  var tx=+k.tx,ty=+k.ty,sp=+k.sp,cu=+k.cu||0;if(!isFinite(tx)||!isFinite(ty)||!isFinite(sp))return;
  mt.pen.k={tx:clamp(tx,-9,9),ty:clamp(ty,-1,6),sp:clamp(sp,15,36),cu:clamp(cu,-1,1)};mt.pen.kt=Date.now();send({t:'k',to:m.p});
  var kid=pidOf(mt.pen.turn?mt.a:mt.b);if(kid)send({t:'kk',to:kid,mi:m.mi})}
/* darvozabon tanlovini zarbadan keyin ham (PK_WIN ichida) o'zgartira oladi; zarba esa o'zgarmaydi */
function hDive(m){if(H.ph!=='pen')return;var mt=penMatch(m.mi),p=H.pl[m.p];if(!mt||!p||mt.st!=='pen'||mt.pen.st!=='aim')return;var kp=mt.pen.turn?mt.a:mt.b;if(kp!==p.i)return;
  var x=+m.x,y=+m.y,sq=+m.s||0;if(!isFinite(x)||!isFinite(y))return;if(sq&&sq<=(mt.pen.ds||0))return;if(sq)mt.pen.ds=sq;mt.pen.dv=[clamp(x,0,1),clamp(y,0,1)]}
function penTick(n){var r=H.rounds[H.ri];r.forEach(function(m){if(m.st!=='pen')return;var p=m.pen;
  if(p.st==='aim'&&((p.k&&n>=p.kt+PK_WIN)||n>p.t0+PK_AIM))penResolve(m,n);else if(p.st==='res'&&n>p.t0+PK_RES)penNext(m,n)})}
function penResolve(m,n){var p=m.pen,k=p.k,d=p.dv,res='miss',pt='',seed=1+Math.floor(Math.random()*2147483000);
  if(k){var o=window.PenaltyStage?window.PenaltyStage.resolve(k,d,seed):null;
    if(!o){if(!STG.err&&n<(p.kt||p.t0)+PK_WIN+6000){loadStage();return}o={r:fbResolve(k,d),pt:''}}
    res=o.r;pt=o.pt||''}
  p.idle=(!k&&!d)?p.idle+1:0;var sh=p.turn;if(res==='goal'){if(sh)p.gb++;else p.ga++}if(sh)p.kb++;else p.ka++;
  p.seq.push([sh,res==='goal'?1:res==='save'?2:3]);p.st='res';p.t0=n;
  var pkt={t:'pr',mi:[H.ri,H.rounds[H.ri].indexOf(m)],r:res,pt:pt,sh:sh,k:k?{tx:k.tx,ty:k.ty,sp:k.sp,cu:k.cu}:null,d:d,seed:seed};
  [m.a,m.b].forEach(function(i){var id=pidOf(i);if(id)send(Object.assign({to:id},pkt))});
  p.k=p.dv=null;p.kt=0;hQueue(m,pkt);persist(1);bcast()}
function penNext(m,n){var p=m.pen,N=H.set.pk||3,d=penDone(p,N),cap=p.ka===p.kb&&p.ka>=N+12;
  if(!d&&(p.idle>=2||cap))d=Math.random()<.5?1:2;
  if(d){m.w=d===1?m.a:m.b;m.l=d===1?m.b:m.a;m.st='done';m.coin=p.idle>=2||cap;p.vis=p.seq.length}
  else{p.turn=1-p.turn;p.st='aim';p.t0=n;p.k=p.dv=null;p.kt=0;p.ds=0}
  bcast();persist(1);
  if(H.rounds[H.ri].every(function(x){return x.st==='done'||x.st==='bye'}))hRoundDone();else hCards()}
/* ----- tashkilotchi: tomosha sahnasi va natijalar navbati ----- */
var HQ={q:[],busy:false,st:null};
function hQueue(m,pkt){var len=m.pen.seq.length;if(!HQ.st){m.pen.vis=len;hCards();return}
  HQ.q.push({m:m,pkt:pkt,len:len});while(HQ.q.length>2){var o=HQ.q.shift();o.m.pen.vis=Math.max(o.m.pen.vis||0,o.len)}hCards();hPump()}
function hPump(){if(HQ.busy||!HQ.q.length||!HQ.st||!H)return;var it=HQ.q.shift(),ro=rosMap(snap()),m=it.m,sh=it.pkt.sh?m.b:m.a,kp=it.pkt.sh?m.a:m.b,lb=$('#lghlab');
  function done(){hudFor(it.len);HQ.busy=false;if(H&&it.m.pen)it.m.pen.vis=Math.max(it.m.pen.vis||0,it.len);hCards();hPump()}
  function hudFor(len){if(!HQ.st||!HQ.st.hud||!H)return;var sq=m.pen.seq.slice(0,Math.max(0,len)),g0=0,g1=0,r0=[],r1=[];sq.forEach(function(x){(x[0]?r1:r0).push(x[1]);if(x[1]===1){if(x[0])g1++;else g0++}});HQ.st.hud({l:{n:(ro[m.a]||[0,'?'])[1],g:g0,r:r0},r:{n:(ro[m.b]||[0,'?'])[1],g:g1,r:r1},N:H.set.pk||3,k:Math.min(r0.length,r1.length),rn:H.rn||'',lab:'Penalti'})}
  hudFor(it.len-1);
  HQ.busy=true;if(lb)lb.textContent='\u26bd '+esc((ro[sh]||[0,'?'])[1])+'  \u2192  \ud83e\udde4 '+esc((ro[kp]||[0,'?'])[1]);
  var ok=false;try{HQ.st.reset('v');ok=HQ.st.play({k:it.pkt.k,d:it.pkt.d,seed:it.pkt.seed,r:it.pkt.r,pt:it.pkt.pt},done)}catch(e){}
  if(!ok)done()}
function hStageOff(){if(HQ.st){try{HQ.st.destroy()}catch(e){}HQ.st=null}HQ.q=[];HQ.busy=false}
function hStageOn(){loadStage().then(function(ok){var cv=$('#lghcv');if(!ok||!cv||!H||H.ph!=='pen')return;var l=$('#lghload');if(l)l.hidden=true;cv.hidden=false;
  if(HQ.st)try{HQ.st.destroy()}catch(e){}try{HQ.st=window.PenaltyStage.create(cv,{snd:function(){return SND},pad:300,maxW:720})}catch(e){HQ.st=null;cv.hidden=true;if(l){l.hidden=false;l.textContent='\u26a0\ufe0f 3D sahna ishga tushmadi'}return}HQ.st.reset('v');hPump()})}

/* ----- tashkilotchi ekranlari ----- */
function hRender(){if(!H)return;modalClose();hStageOff();({lobby:hLobby,draw:hDrawV,pre:hPre,q:hQ,rev:hQ,pen:hPen,res:hRes,fin:hFin})[H.ph]()}
function joinUrl(){return location.origin+'/home#j='+H.pin}
function hLobby(){var s=H.set;
  function seg(k,vals,suf){return '<div class="seg">'+vals.map(function(v){return '<button class="'+(s[k]===v?'on':'')+'" data-act="cfg" data-k="'+k+'" data-v="'+v+'">'+v+suf+'</button>'}).join('')+'</div>'}
  view(topbar('<b class="lgchip">Kutish xonasi</b>')+'<div class="lgc lobby"><div class="lgjoin"><div class="lgpin"><small>Qo\u2018shilish ID</small><b>'+pinFmt(H.pin)+'</b><button class="lgb ghost sm" data-act="share">\ud83d\udd17 Havola</button></div><div id="lgqr" class="lgqr"></div></div>'+
    '<h2 class="lgh">'+esc(H.title)+'</h2><div class="lgset"><label>Savol vaqti</label>'+seg('time',[10,15,20,30],' s')+'<label>Har duelda savol</label>'+seg('nq',[3,5,7],'')+'<label>Penalti zarbalari (durangda)</label>'+seg('pk',[1,3,5],' ta')+'</div><div class="lgnote" id="lgnote"></div>'+
    '<div class="lgcnt"><b id="lgcnt">0</b> ishtirokchi</div><div class="lggrid" id="lggrid"></div><div class="lgfoot"><button class="lgb go" data-act="draw" id="lgdraw" disabled>\ud83c\udfb2 Random qur\u2018a tashlash</button></div></div>');
  hLobbyUpdate();qr(joinUrl())}
function hLobbyUpdate(){var g=$('#lggrid');if(!g||!H)return;var l=ros();$('#lgcnt').textContent=l.length;
  g.innerHTML=l.map(function(r){return '<div class="lgpt">'+av(r[2],52,r[1])+'<b>'+esc(r[1])+'</b></div>'}).join('')||'<p class="lgmut">Ishtirokchilar telefondan ID yoki QR orqali qo\u2018shiladi\u2026</p>';obs(g);
  var b=$('#lgdraw');if(b)b.disabled=l.length<2;
  var N=l.length,Mx=1;while(Mx<Math.max(2,N))Mx*=2;var Rr=Math.round(Math.log(Mx)/Math.LN2),need=Rr*H.set.nq,nt=$('#lgnote');
  if(nt)nt.innerHTML=N>=2?('Taxminan <b>'+rname(Mx)+'</b>'+(Mx>N?' \u00b7 <b>'+(Mx-N)+'</b> ta BYE':'')+' \u00b7 '+Rr+' bosqich'+(H.src.length<need?' \u00b7 <span class="w">savollar yetarli emas ('+H.src.length+' ta) \u2014 duelda savollar soni kamaytiriladi</span>':'')):''}
var QRL=null;function qr(text){var b=$('#lgqr');if(!b)return;
  function go(){try{var q=window.qrcode(0,'M');q.addData(text);q.make();var n=q.getModuleCount(),d='';for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(q.isDark(r,c))d+='M'+c+' '+r+'h1v1h-1z';b.innerHTML='<svg viewBox="-2 -2 '+(n+4)+' '+(n+4)+'" shape-rendering="crispEdges"><path d="'+d+'" fill="#1B2150"/></svg>'}catch(e){b.textContent=text}}
  if(window.qrcode)go();else b.textContent=text}
function hDrawV(){var S=snap(),r0=H.rounds[0],ros={};S.ros.forEach(function(r){ros[r[0]]=r});
  var cards=r0.map(function(m,k){var A=ros[m.a],B=ros[m.b];return '<div class="lgvsc" style="animation-delay:'+(k*140)+'ms"><div class="s">'+av(A[2],50,A[1])+'<b>'+esc(A[1])+'</b></div><div class="vs">'+(m.st==='bye'?'\ud83c\udf9f\ufe0f':'VS')+'</div><div class="s">'+(B?av(B[2],50,B[1])+'<b>'+esc(B[1])+'</b>':'<b class="bye">BYE \u00b7 keyingi bosqichga o\u2018tadi</b>')+'</div></div>'}).join('');
  view(topbar('<b class="lgchip">Qur\u2018a natijasi</b>')+'<div class="lgc"><h2 class="lgh">\ud83c\udfb2 Qur\u2018a tashlandi!</h2><p class="lgmut">'+Object.keys(H.pl).length+' ishtirokchi \u00b7 '+(H.B?H.B+' ta omadli chipta (BYE) \u00b7 ':'')+H.R+' bosqich \u00b7 har duelda '+H.nq+' savol'+(H.warn?' \u00b7 <span class="w">savollar takrorlanishi mumkin</span>':'')+'</p><div class="lgvsl">'+cards+'</div><div class="lgfoot"><button class="lgb go" data-act="go">\u25b6 '+rname(H.M)+'ni boshlash</button></div></div>')}
function hPre(){var ph=H.rn;view(topbar()+'<div class="lgcd"><small>Keyingi bosqich</small><div class="lgbig">'+esc(ph)+'</div><p>'+duels().length+' ta duel'+(H.rounds[H.ri].some(function(m){return m.st==='bye'})?' \u00b7 '+H.rounds[H.ri].filter(function(m){return m.st==='bye'}).length+' ta BYE':'')+'</p></div>')}
function cardHTML(m,ros){var A=ros[m.a]||[0,'?',-1],B=ros[m.b]||[0,'?',-1],an=H.ph==='q'?H.an||{}:{},p=m.pen,vis=p?(m.st==='done'?p.seq.length:Math.min(p.vis||0,p.seq.length)):0,vg=[0,0];
  if(p)for(var z=0;z<vis;z++)if(p.seq[z][1]===1)vg[p.seq[z][0]]++;
  function seqRow(side){return p?'<div class="seqr">'+p.seq.slice(0,vis).filter(function(x){return x[0]===side}).map(function(x){return x[1]===1?'\u26bd':x[1]===2?'\ud83e\udde4':'\u274c'}).join('')+'</div>':''}
  return '<div class="lgdc'+(m.st==='pen'?' pen':'')+(m.st==='done'?' done':'')+'"><div class="s'+(m.w===m.a&&m.w?' win':'')+'">'+av(A[2],40,A[1])+'<b>'+esc(A[1])+'</b>'+(an[m.a]!=null?'<i>\u2714</i>':'')+seqRow(0)+'</div><div class="sc"><em>'+m.sa+'</em><span>:</span><em>'+m.sb+'</em>'+(p?'<small>penalti '+vg[0]+'\u2013'+vg[1]+'</small>':m.coin?'<small>\ud83e\ude99</small>':'')+'</div><div class="s'+(m.w===m.b&&m.w?' win':'')+'">'+av(B[2],40,B[1])+'<b>'+esc(B[1])+'</b>'+(an[m.b]!=null?'<i>\u2714</i>':'')+seqRow(1)+'</div></div>'}
function cardsHTML(){var S=snap(),ros=rosMap(S),r=H.rounds[H.ri],byes=r.filter(function(m){return m.st==='bye'});
  return r.filter(function(m){return m.st!=='bye'}).map(function(m){return cardHTML(m,ros)}).join('')+(byes.length?'<div class="lgbyes">\ud83c\udf9f\ufe0f BYE: '+byes.map(function(m){return esc((ros[m.a]||[0,'?'])[1])}).join(', ')+'</div>':'')}
function hCards(){var c=$('#lgduels');if(c&&H&&(H.ph==='q'||H.ph==='rev'||H.ph==='pen')){c.innerHTML=cardsHTML();obs(c)}}
function hQ(){var q=H.cq,rev=H.ph==='rev';view(topbar('<b class="lgchip">'+esc(H.rn)+'</b><b class="lgchip">'+(H.qi+1)+' / '+H.nq+'</b>')+'<div class="lgc"><div class="lgbar"><i id="lgbari" style="width:'+(rev?0:100)+'%"></i></div><div class="lgsec" id="lgsec">'+(rev?'':H.set.time)+'</div><h1 class="lgq">'+esc(q.q)+'</h1><div class="lgops host">'+optsHTML({a:q.a,c:q.c},-1,rev)+'</div><div class="lgduels" id="lgduels">'+cardsHTML()+'</div></div>');obs($('#lgduels'))}
function hPen(){var N=H.set.pk||3;view(topbar('<b class="lgchip">'+esc(H.rn)+'</b><b class="lgchip">\u26bd Penaltilar seriyasi</b>')+'<div class="lgc"><h2 class="lgh">Durang! Penaltilar seriyasi</h2><p class="lgmut">Ikkala o\u2018yinchi navbat bilan zarba beradi va darvozani himoya qiladi. '+N+' tadan zarba; teng bo\u2018lsa \u2014 kimdir yutguncha davom etadi.</p><div class="lgstage"><div class="lgload" id="lghload">\ud83c\udfdf\ufe0f Stadion yuklanmoqda\u2026</div><canvas id="lghcv" hidden></canvas></div><div class="lgcr">Darvozabon modeli: <a href="https://sketchfab.com/3d-models/goalkeeper-stylized-rig-and-animation-7de86f9c36f84152a777f27a73646ada" target="_blank" rel="noopener">Goalkeeper Stylized</a> \u2014 P-Vi.Art (Sketchfab), <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>; o\u2018yin uchun moslashtirilgan</div><div class="lghlab" id="lghlab"></div><div class="lgduels" id="lgduels">'+cardsHTML()+'</div></div>');obs($('#lgduels'));hStageOn()}
function hRes(){var S=snap(),nr=H.rounds[H.ri+1],nx=H.ri+1===H.R-1?(nr.length>1?'Final va 3-o\u2018rin':'Final'):rname(H.M/Math.pow(2,H.ri+1));
  view(topbar('<b class="lgchip">'+esc(H.rn)+' yakunlandi</b>')+'<div class="lgc"><h2 class="lgh">\u2705 Bosqich yakunlandi</h2>'+brHTML(S,0)+'<div class="lgfoot"><button class="lgb go" data-act="go">\u25b6 '+nx+'</button></div></div>')}
function hFin(){var S=snap();view(topbar('<b class="lgchip">Turnir yakuni</b>')+'<div class="lgc"><h2 class="lgh">\ud83c\udfc6 Chempion aniqlandi!</h2>'+podium(S)+brHTML(S,0)+'<div class="lgfoot"><button class="lgb ghost" data-act="exitok">Yopish</button></div></div>')}

/* =====================  ISHTIROKCHI  ===================== */
function join(s){if(H||P)return;
  P={pin:s.pin,pid:s.pid,n:s.n,a:s.a,got:false,S:null,my:-1,i:0};var me=P;
  openOv();view(topbar()+'<div class="lgcd"><div class="lgspin"></div><p>Turnirga ulanmoqda\u2026</p></div>','pl');pNet()}
function pNet(){var me=P;netOpen(me.pin,pMsg,function(s){var bad=s==='CHANNEL_ERROR'||s==='TIMED_OUT'||s==='CLOSED';conn(bad&&P&&P.got);if(s==='SUBSCRIBED'&&P)pLoop()})}
function pHello(){if(P)send({t:'hi',p:P.pid,n:P.n,a:P.a,lg:1})}
function pLoop(){var me=P;clearInterval(me.hl);var k=0;pHello();me.hl=setInterval(function(){if(P!==me||me.got){clearInterval(me.hl);return}if(++k>=9){clearInterval(me.hl);pFail();return}pHello()},800)}
function pFail(){if(!P)return;view(topbar()+'<div class="lgcd"><div class="em big">\ud83d\udce1</div><h2>Tashkilotchi bilan aloqa yo\u2018q</h2><p>Internetni tekshiring yoki qayta urinib ko\u2018ring.</p><div class="lgbtns"><button class="lgb go" data-act="retry">\u21bb Qayta urinish</button><button class="lgb ghost" data-act="exitok">Chiqish</button></div></div>','pl')}
function pResume(s){P={pin:s.pin,pid:s.pid,n:s.n,a:s.a,got:false,S:null,my:-1,i:0};openOv();view(topbar()+'<div class="lgcd"><div class="lgspin"></div><p>Turnirga qayta ulanmoqda\u2026</p></div>','pl');pNet()}
function pMsg(m){if(!P)return;if(m.to&&m.to!==P.pid)return;
  if(m.t==='s'){if(m.to||P.got)pSnap(m)}
  else if(m.t==='h'){P.lastH=Date.now();if(P.got&&P.S&&(m.ph!==P.S.ph||m.qi!==P.S.qi||m.ri!==P.S.ri))pHello()}
  else if(m.t==='k')P.ak=true;else if(m.t==='pr')pResult(m);
  else if(m.t==='kk'){var kps=P.ps;if(kps&&kps.role==='k'&&!kps.done){kps.kicked=true;kps.lock=true;kps.drawing=false;kps.pid=null;sendDive(kps);setHint('\u26bd Zarba berildi! Darvozabon otilmoqda\u2026')}}
  else if(m.t==='deny')leave(m.why==='full'?'Xona to\u2018lgan':'Turnir boshlangan \u2014 qo\u2018shilib bo\u2018lmaydi');
  else if(m.t==='end'){if(P.S&&P.S.ph==='fin')P.over=true;else leave('Tashkilotchi turnirni tugatdi')}}
function mine(S,ri){if(!S.br)return null;var r=S.br[ri];if(!r)return null;for(var s=0;s<r.length;s++){var m=r[s];if(m[0]===P.i||m[1]===P.i)return{r:ri,s:s,m:m,side:m[0]===P.i?0:1,opp:m[0]===P.i?m[1]:m[0]}}return null}
function pSnap(m){var first=!P.got,prev=P.S;P.got=true;P.lastH=Date.now();if(m.you)P.i=m.you;P.S=m;P.dl=performance.now()+m.rem;
  if(first){conn(false);lsSet(LSP,{pin:P.pin,pid:P.pid,n:P.n,a:P.a,ts:Date.now()})}
  if(m.ph==='q'&&!(prev&&prev.ph==='q'&&prev.ri===m.ri&&prev.qi===m.qi)){P.my=-1;P.ak=false}
  pRender(prev)}
function pRender(prev){var S=P.S;modalClose();clearInterval(P.tm);
  if(S.ph==='pen'){pPen(prev);return}
  disposeStage();
  ({lobby:pLobby,draw:pDraw,pre:pPre,q:pQ,rev:pRev,res:pRes,fin:pFin})[S.ph]()}
function pLobby(){var S=P.S;view(topbar('<b class="lgchip">ID '+pinFmt(P.pin)+'</b>')+'<div class="lgc"><h2 class="lgh">'+esc(S.ttl)+'</h2><p class="lgmut">Tashkilotchi qur\u2018a tashlashini kuting\u2026</p><div class="lgcnt"><b>'+S.ros.length+'</b> ishtirokchi</div><div class="lggrid">'+S.ros.map(function(r){return '<div class="lgpt'+(r[0]===P.i?' me':'')+'">'+av(r[2],52,r[1])+'<b>'+esc(r[1])+'</b></div>'}).join('')+'</div></div>','pl')}
function status(S,mm){var ros=rosMap(S);
  if(!mm){var out=S.ri>=0&&S.br&&S.br[S.ri]&&!mine(S,S.ri);return{e:out?'\ud83d\udc40':'\u23f3',t:out?'Siz turnirdan chiqdingiz':'Kuting',p:out?'Turnirni tomosha qiling \u2014 chempion kim bo\u2018ladi?':'Bosqich boshlanishini kuting.'}}
  if(mm.m[5]===1)return{e:'\ud83c\udf9f\ufe0f',t:'Omadli chipta (BYE)!',p:'Siz keyingi bosqichga avtomatik o\u2018tdingiz, raqibingizni kuting.'};
  if(mm.m[5]===4)return{e:mm.m[2]===P.i?'\ud83c\udfc6':'\ud83d\ude14',t:mm.m[2]===P.i?'Siz yutdingiz!':'Mag\u2018lub bo\u2018ldingiz',p:'Boshqa duellar tugashini kuting.'};
  return null}
function pWait(S,mm){var st=status(S,mm),sc='';view(topbar('<b class="lgchip">'+esc(S.rn)+'</b>')+'<div class="lgc"><div class="lgcd inl"><div class="em big">'+st.e+'</div><h2>'+st.t+'</h2><p>'+st.p+'</p></div>'+(S.br?brHTML(S,P.i):'')+'</div>','pl')}
function pDraw(){var S=P.S,mm=mine(S,0),ros=rosMap(S),opp=mm&&mm.opp?ros[mm.opp]:null;
  view(topbar()+'<div class="lgc"><div class="lgcd inl"><div class="em big">\ud83c\udfb2</div><h2>Qur\u2018a tashlandi!</h2>'+(mm&&opp?'<p>Sizning raqibingiz:</p>'+vsBar(ros[P.i],opp,[0,0]):mm&&mm.m[5]===1?'<p>\ud83c\udf9f\ufe0f Siz omadli chipta (BYE) oldingiz \u2014 keyingi bosqichga avtomatik o\u2018tasiz!</p>':'<p>Natijani kuting.</p>')+'</div>'+brHTML(S,P.i)+'</div>','pl');SX.draw()}
function pPre(){var S=P.S,mm=mine(S,S.ri),ros=rosMap(S);
  if(!mm||mm.m[5]!==2){pWait(S,mm);return}
  view(topbar()+'<div class="lgcd"><small>'+esc(S.rn)+'</small><div class="lgbig sm">Duel!</div>'+vsBar(ros[P.i],ros[mm.opp],[0,0])+'<p>Tayyor bo\u2018ling \u2014 '+S.nq+' ta savol</p></div>','pl');SX.ok()}
function scoreOf(mm){return mm.side?[mm.m[4],mm.m[3]]:[mm.m[3],mm.m[4]]}
function pQ(){var S=P.S,mm=mine(S,S.ri);if(!mm||mm.m[5]!==2){pWait(S,mm);return}var ros=rosMap(S);
  view(topbar('<b class="lgchip">'+esc(S.rn)+'</b><b class="lgchip">'+(S.qi+1)+' / '+S.nq+'</b>')+'<div class="lgc lgpq">'+vsBar(ros[P.i],ros[mm.opp],scoreOf(mm))+'<div class="lgbar"><i id="lgbari"></i></div><div class="lgsec" id="lgsec"></div><h2 class="lgq p">'+esc(S.q)+'</h2><div class="lgops" id="lgops">'+optsHTML(S,P.my,false)+'</div></div>','pl');
  var tot=S.dur||1,tick=function(){var rem=P.dl-performance.now(),b=$('#lgbari'),s=$('#lgsec');if(b)b.style.width=clamp(rem/tot*100,0,100)+'%';if(s)s.textContent=Math.max(0,Math.ceil(rem/1000));if(rem<=0)clearInterval(P.tm)};tick();P.tm=setInterval(tick,200)}
function pAnswer(k){if(!P||!P.S||P.S.ph!=='q'||P.my>=0)return;P.my=k;SX.draw();var o=$('#lgops');if(o)o.innerHTML=optsHTML(P.S,k,false);
  var key=P.S.ri*100+P.S.qi,tries=0;P.ak=false;(function go(){if(!P||P.S.ph!=='q'||P.S.ri*100+P.S.qi!==key||P.ak||tries>4)return;tries++;send({t:'ans',p:P.pid,qi:key,c:k});setTimeout(go,800)})()}
function pRev(){var S=P.S,mm=mine(S,S.ri);if(!mm||mm.m[5]!==2){pWait(S,mm);return}var ros=rosMap(S),okk=P.my===S.c;if(S.qi>=S.nq-1&&mm.m[3]===mm.m[4])loadStage();
  view(topbar('<b class="lgchip">'+esc(S.rn)+'</b><b class="lgchip">'+(S.qi+1)+' / '+S.nq+'</b>')+'<div class="lgc lgpq">'+vsBar(ros[P.i],ros[mm.opp],scoreOf(mm))+'<div class="lgverdict '+(okk?'y':'n')+'">'+(okk?'\u2705 To\u2018g\u2018ri! +1':P.my<0?'\u23f1 Javob berilmadi':'\u274c Noto\u2018g\u2018ri')+'</div><h2 class="lgq p sm">'+esc(S.q)+'</h2><div class="lgops">'+optsHTML(S,P.my,true)+'</div></div>','pl');if(okk)SX.ok();else SX.bad()}
function pRes(){var S=P.S,mm=mine(S,S.ri),e,t,p;
  if(!mm){var o=status(S,mm);e=o.e;t=o.t;p=o.p}
  else if(mm.m[5]===1){e='\ud83c\udf9f\ufe0f';t='Omadli chipta (BYE)!';p='Siz keyingi bosqichga avtomatik o\u2018tdingiz.'}
  else if(mm.m[2]===P.i){e='\ud83c\udfc6';t='Yutdingiz! Keyingi bosqichga chiqdingiz';p='Tashkilotchi keyingi bosqichni boshlashini kuting.'}
  else{e='\ud83d\ude14';t='Mag\u2018lub bo\u2018ldingiz';p='Turnirni tomosha qiling \u2014 chempion kim bo\u2018ladi?'}
  view(topbar('<b class="lgchip">'+esc(S.rn)+' yakunlandi</b>')+'<div class="lgc"><div class="lgcd inl"><div class="em big">'+e+'</div><h2>'+t+'</h2><p>'+p+'</p></div>'+brHTML(S,P.i)+'</div>','pl');if(mm&&mm.m[2]===P.i)SX.goal()}
function pFin(){var S=P.S,f=S.fin||[],k=f.indexOf(P.i);view(topbar('<b class="lgchip">Turnir yakuni</b>')+'<div class="lgc"><h2 class="lgh">'+(k===0?'\ud83c\udfc6 Siz chempionsiz!':k>0?'\ud83c\udfc5 Siz '+(k+1)+'-o\u2018rinni egalladingiz!':'Turnir yakunlandi')+'</h2>'+podium(S)+brHTML(S,P.i)+'<div class="lgfoot"><button class="lgb ghost" data-act="exitok">Chiqish</button></div></div>','pl');if(k===0)SX.goal()}

/* ----- penalti: ishtirokchi ekrani (sahna alohida faylda, faqat kerak bo'lganda yuklanadi) ----- */
function disposeStage(){var ps=P&&P.ps;if(ps&&ps.st){try{ps.st.destroy()}catch(e){}}if(P){P.ps=null;P.penKey=''}}
var HINT_S='\u26bd To\u2018pdan boshlab darvozaga qarab barmog\u2018ingiz bilan chizing. Tez chizsangiz \u2014 zarba kuchli, lekin aniqlik kamayadi. Egri chizsangiz \u2014 to\u2018p burama uchadi!',
    HINT_K='\ud83e\udde4 Darvozabon: to\u2018p qayerga uchishini taxmin qilib darvoza ustiga bosing. Zarba berilguncha tanlovni o\u2018zgartirish mumkin \u2014 zarba berilgan zahoti darvozabon tanlangan joyga otiladi.';
function pPen(prev){var S=P.S,mm=mine(S,S.ri);
  if(!mm||mm.m[5]!==3){disposeStage();var st=status(S,mm)||{e:'\u26bd',t:'Penaltilar seriyasi',p:'Boshqa duellar tugashini kuting.'};
    view(topbar('<b class="lgchip">\u26bd Penalti</b>')+'<div class="lgc"><div class="lgcd inl"><div class="em big">'+st.e+'</div><h2>'+st.t+'</h2><p>'+st.p+'</p></div>'+brHTML(S,P.i)+'</div>','pl');return}
  var pn=mm.m[7],ros=rosMap(S),key=mm.s+':'+pn[4]+':'+pn[5]+':'+pn[0],shooter=pn[0]===mm.side,ps=P.ps;
  if(ps&&ps.mm.r===mm.r&&ps.mm.s===mm.s&&$('#lgstg')){ps.mm=mm;pPenHead(S,mm,pn,ros);
    if(pn[1]==='aim'&&P.penKey!==key){if(ps.anim||(ps.st&&ps.st.busy()))return;newKick(ps,shooter?'s':'k',key)}return}
  disposeStage();P.penKey=key;
  view(topbar('<b class="lgchip">\u26bd Penalti \u00b7 '+(pn[7]||3)+' ta zarba</b>')+'<div class="lgc lgpk"><div id="lgpkh"></div><div class="lgstage" id="lgstg"><div class="lgload" id="lgload">\ud83c\udfdf\ufe0f Stadion yuklanmoqda\u2026</div><canvas id="lgcv" hidden></canvas></div><div class="lghint" id="lghint"></div><div id="lgfb"></div><div class="lgcr">Darvozabon modeli: <a href="https://sketchfab.com/3d-models/goalkeeper-stylized-rig-and-animation-7de86f9c36f84152a777f27a73646ada" target="_blank" rel="noopener">Goalkeeper Stylized</a> \u2014 P-Vi.Art (Sketchfab), <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>; o\u2018yin uchun moslashtirilgan</div></div>','pl');
  var ps2=P.ps={mm:mm,role:shooter?'s':'k',trail:[],drawing:false,sent:false,done:false,anim:null,dv:null,hold:false,st:null,pend:null,fb:false,ld:0};
  setHint(shooter?HINT_S:HINT_K);pPenHead(S,mm,pn,ros);
  loadStage().then(function(ok){if(!P||P.ps!==ps2||!$('#lgcv'))return;
    if(!ok){fallbackUI(ps2);return}
    $('#lgload').hidden=true;$('#lgcv').hidden=false;try{ps2.st=window.PenaltyStage.create($('#lgcv'),{snd:function(){return SND}})}catch(e){ps2.st=null;$('#lgcv').hidden=true;STG.err=true;fallbackUI(ps2);return}ps2.st.reset(ps2.role);if(ps2.hudD&&ps2.st.hud)ps2.st.hud(ps2.hudD);bindStage();
    if(ps2.pend){var pm=ps2.pend;ps2.pend=null;playResult(ps2,pm)}})}
function newKick(ps,role,key){P.penKey=key;ps.role=role;ps.sent=false;ps.done=false;ps.anim=null;ps.dv=null;ps.trail=[];ps.shot=null;ps.hold=false;ps.kicked=false;ps.drawing=false;ps.lock=false;ps.pid=null;ps.sq=0;clearTimeout(ps.lt);clearInterval(ps.hb);ps.hb=0;
  if(ps.st){ps.st.reset(role)}var fb=$('#lgfb');if(fb&&ps.fb)fbRender(ps);setHint(role==='s'?HINT_S:HINT_K)}
function pPenHead(S,mm,pn,ros){var h=$('#lgpkh');if(!h||(P.ps&&P.ps.hold))return;var B=mm.opp,my=mm.side?pn[3]:pn[2],op=mm.side?pn[2]:pn[3];
  var rs=function(sd){return (pn[6]||[]).filter(function(x){return x[0]===sd}).map(function(x){return x[1]})},hd={l:{n:(ros[P.i]||[0,'?'])[1],g:my,r:rs(mm.side)},r:{n:(ros[B]||[0,'?'])[1],g:op,r:rs(1-mm.side)},N:pn[7]||3,k:mm.side?pn[5]:pn[4],rn:S.rn||'',lab:'Penalti'};
  if(P.ps){P.ps.hudD=hd;if(P.ps.st&&P.ps.st.hud)P.ps.st.hud(hd)}
  function dots(side){return (pn[6]||[]).filter(function(x){return x[0]===side}).map(function(x){return x[1]===1?'\u26bd':x[1]===2?'\ud83e\udde4':'\u274c'}).join('')}
  h.innerHTML='<div class="lgvs sm"><div class="s"><b>'+esc((ros[P.i]||[0,'?'])[1])+'</b><span class="dots">'+dots(mm.side)+'</span></div><div class="sc"><em>'+my+'</em><span>:</span><em>'+op+'</em></div><div class="s"><b>'+esc((ros[B]||[0,'?'])[1])+'</b><span class="dots">'+dots(1-mm.side)+'</span></div></div>'}
function setHint(t){var h=$('#lghint');if(h)h.textContent=t}
function setDive(ps,p){if(ps.lock)return;var g=ps.st.toGoal(p.x,p.y),u=clamp((g.x/3.66+1)/2,0,1),v=clamp(g.y/2.6,0,1);ps.dv=[u,v];ps.st.setDive(u,v);var n=Date.now();clearTimeout(ps.lt);
  if(!ps.ld||n-ps.ld>130){ps.ld=n;sendDive(ps)}else ps.lt=setTimeout(function(){ps.ld=Date.now();sendDive(ps)},140);diveBeat(ps)}
/* tanlov har 250ms takrorlanadi: yo'qolgan xabar tanlovni yo'qotmasin */
function diveBeat(ps){if(ps.hb)return;ps.hb=setInterval(function(){if(!P||P.ps!==ps||ps.done||ps.anim){clearInterval(ps.hb);ps.hb=0;return}sendDive(ps)},250)}
function sendDive(ps){if(!P||P.ps!==ps||!ps.dv||ps.anim||ps.done)return;send({t:'dive',p:P.pid,mi:[ps.mm.r,ps.mm.s],x:ps.dv[0],y:ps.dv[1],s:(ps.sq=(ps.sq||0)+1)})}
/* chizilgan yo'l \u2192 zarba: tezlik = kuch, egrilik = burama (spin); kuchli zarba aniqligi pasayadi */
function mkShot2(ps,tr){var n=tr.length;if(n<4)return null;var a=tr[0],b=tr[n-1],dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy);if(L<90||dy>-40)return null;
  var v=L/Math.max(60,b.t-a.t),sp=clamp(17+(v-.5)*9,17,31),pw=(sp-17)/14,ux=dx/L,uy=dy/L,nx=-uy,ny=ux,bow=0,i;
  for(i=1;i<n-1;i++){var d=(tr[i].x-a.x)*nx+(tr[i].y-a.y)*ny;if(Math.abs(d)>Math.abs(bow))bow=d}bow/=L;
  var g=ps.st.toGoal(b.x,b.y),sg=.07+pw*.5;
  return{tx:Math.round(clamp(g.x+gauss()*sg,-8,8)*100)/100,ty:Math.round(clamp(g.y+gauss()*sg*.7,0,5)*100)/100,sp:Math.round(sp*10)/10,cu:Math.round(-clamp(bow*2.4,-1,1)*100)/100}}
function bindStage(){var cv=$('#lgcv');if(!cv)return;
  cv.addEventListener('pointerdown',function(e){var ps=P&&P.ps;if(!ps||!ps.st||ps.anim||ps.hold||ps.done)return;e.preventDefault();if(ps.drawing||ps.lock||ps.sent&&ps.role==='s')return;ps.st.unlock();var p=ps.st.pos(e);
    if(ps.role==='s'){if(ps.st.onSpot(p.x,p.y)){ps.drawing=true;ps.pid=e.pointerId;ps.trail=[p];ps.st.setTrail(ps.trail);try{cv.setPointerCapture(e.pointerId)}catch(x){}}else say('Avval to\u2018pni bosib turing')}
    else{ps.drawing=true;ps.pid=e.pointerId;setDive(ps,p);try{cv.setPointerCapture(e.pointerId)}catch(x){}}});
  cv.addEventListener('pointermove',function(e){var ps=P&&P.ps;if(!ps||!ps.drawing||!ps.st||e.pointerId!==ps.pid)return;var p=ps.st.pos(e);if(ps.role==='s'){if(ps.trail.length<300)ps.trail.push(p)}else setDive(ps,p)});
  function up(e,cancel){var ps=P&&P.ps;if(!ps||!ps.drawing||e.pointerId!==ps.pid)return;ps.drawing=false;ps.pid=null;
    if(ps.role==='s'){if(ps.sent)return;ps.st.setTrail(null);if(cancel){ps.trail=[];return}
      if(ps.trail.length<300)ps.trail.push(ps.st.pos(e));var sh=mkShot2(ps,ps.trail);if(!sh){ps.trail=[];say('To\u2018pdan darvoza tomon uzunroq chizing');return}ps.sent=true;ps.shot=sh;fireKick(ps,sh)}
    else if(ps.dv&&!ps.lock){sendDive(ps);setHint('\ud83e\udde4 Tanlandi! Zarbani kuting\u2026 (zarba berilguncha o\u2018zgartirish mumkin)')}}
  cv.addEventListener('pointerup',function(e){up(e,false)});cv.addEventListener('pointercancel',function(e){up(e,true)})}
function fireKick(ps,sh){var tries=0,key=P.penKey;setHint('\u26bd Zarba berildi! Darvozabon so\u2018nggi tanlovini qilmoqda\u2026');
  (function go(){if(!P||P.ps!==ps||P.penKey!==key||ps.anim||tries>4)return;tries++;P.ak=false;send({t:'kick',p:P.pid,mi:[ps.mm.r,ps.mm.s],k:sh});setTimeout(function(){if(!P.ak)go()},900)})()}
function resText(m,ps){var me=m.sh===ps.mm.side;return m.r==='goal'?(me?'GOL! \u26bd\ud83d\udd25':'Gol kiritdingiz\u2026 \ud83d\ude2c'):m.r==='save'?(me?'Darvozabon qaytardi \ud83e\udde4':'SEYV! \ud83e\udde4\ud83d\udd25'):!m.k?'Vaqt tugadi \u2014 zarba berilmadi \u23f1':(m.pt?'Ustun/to\u2018sin \u2014 gol emas':'Aut \u274c')}
function pResult(m){var ps=P&&P.ps;if(!ps||ps.anim||!m.mi||m.mi[0]!==ps.mm.r||m.mi[1]!==ps.mm.s)return;
  ps.anim=m;ps.hold=true;ps.sent=true;ps.drawing=false;if(ps.st)ps.st.setTrail(null);
  if(!ps.st){if(ps.fb){setHint(resText(m,ps));finRes(ps)}else ps.pend=m;return}
  playResult(ps,m)}
function playResult(ps,m){if(!P||P.ps!==ps)return;ps.anim=m;ps.hold=true;setHint('');var ok=false;
  try{ok=ps.st.play({k:m.k,d:m.d,seed:m.seed,r:m.r,pt:m.pt},function(){setHint(resText(m,ps));finRes(ps)})}catch(e){}
  if(!ok){setHint(resText(m,ps));finRes(ps)}}
function finRes(ps){if(!P||P.ps!==ps)return;ps.anim=null;ps.hold=false;ps.done=true;if(P.S&&P.S.ph==='pen')pPen()}
/* sahna yuklanmasa \u2014 oddiy zona tanlash (o'yin to'xtamasligi uchun) */
function fallbackUI(ps){ps.fb=true;var l=$('#lgload');if(l)l.textContent='\u26a0\ufe0f Stadion yuklanmadi \u2014 oddiy rejim';fbRender(ps)}
function fbRender(ps){var fb=$('#lgfb');if(!fb)return;var h='<div class="lgzg">',r,c2,nm=['Chap','O\u2018rta','O\u2018ng'];
  for(r=1;r>=0;r--)for(c2=0;c2<3;c2++)h+='<button data-act="zone" data-u="'+(c2===0?.12:c2===1?.5:.88)+'" data-v="'+(r?.85:.25)+'">'+(r?'Yuqori ':'Past ')+nm[c2]+'</button>';
  fb.innerHTML=h+'</div>';setHint(ps.role==='s'?'\u26bd Zarba yo\u2018nalishini tanlang':'\ud83e\udde4 Qayerga tashlanishni tanlang')}
function fbZone(b){var ps=P&&P.ps;if(!ps||!ps.fb||ps.sent||ps.done)return;var u=+b.dataset.u,v=+b.dataset.v;
  if(ps.role==='s'){ps.sent=true;var sh={tx:(u-.5)*2*3.66*.8,ty:v*2.6*.85,sp:24,cu:0};ps.shot=sh;fireKick(ps,sh)}
  else{if(ps.lock)return;ps.dv=[u,v];sendDive(ps);diveBeat(ps)}
  var fb=$('#lgfb');if(fb&&ps.role==='s')fb.querySelectorAll('button').forEach(function(x){x.disabled=true})}

/* ===== tugmalar ===== */
function setSnd(v){SND=v;if(H){H.set.snd=v;persist()}var b=$('#lgsnd');if(b)b.textContent=v?'\ud83d\udd0a':'\ud83d\udd07'}
function onClick(e){var m=$('#lgmod');if(e.target===m){modalClose();return}
  var b=e.target.closest('[data-act]');if(!b)return;var a=b.dataset.act,v=b.dataset.v;
  switch(a){
    case'exit':askExit();break;case'mclose':modalClose();break;case'exitok':leave();break;case'snd':setSnd(!SND);break;
    case'cfg':if(H&&H.ph==='lobby'){H.set[b.dataset.k]=+v;persist();hLobby()}break;
    case'draw':hDraw();break;
    case'go':if(H){if(H.ph==='draw'||H.ph==='res')hRoundStart()}break;
    case'ans':pAnswer(+v);break;case'zone':fbZone(b);break;
    case'share':if(H){var url=joinUrl();if(navigator.share&&/Android|iPhone|iPad/i.test(navigator.userAgent||''))navigator.share({title:'Chempionlar ligasi',url:url}).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(url).then(function(){say('Havola nusxalandi')},function(){say(url)});else say(url)}break;
    case'retry':if(P){var s={pin:P.pin,pid:P.pid,n:P.n,a:P.a};disposeStage();netClose();clearInterval(P.hl);P=null;pResume(s)}break}}

/* ===== ochiq API ===== */
window.League={host:host,join:function(s){setTimeout(function(){join(s)},0)},active:function(){return !!(H||P)},open:function(){if(H||P)openOv()},_t:{mkBracket:mkBracket,penDone:penDone,mkShot:mkShot,rname:rname,fbResolve:fbResolve}};
function boot(){if(LQ().active&&LQ().active())return;var h=ls(LSH),p=ls(LSP);
  if(h&&h.pin&&Date.now()-h.ts<STALE){H=h;hBoot();return}else if(h)lsDel(LSH);
  if(p&&p.pin&&Date.now()-p.ts<STALE){pResume(p);return}else if(p)lsDel(LSP)}
if(typeof document!=='undefined'&&document.body)setTimeout(boot,500);

/* ===== uslublar ===== */
var CSS='.lgx{position:fixed;inset:0;z-index:95;color:#fff;font-family:Nunito,system-ui,sans-serif;font-weight:700;background:radial-gradient(120% 80% at 50% 0,#2A2F7A 0,#0E1034 60%);overflow:hidden;-webkit-user-select:none;user-select:none}.lgx[hidden]{display:none}.lgx *{box-sizing:border-box;margin:0}.lgx button{font:inherit;color:inherit;border:0;background:none;cursor:pointer}'+
'.lgm{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;padding:0 0 28px;-webkit-overflow-scrolling:touch}.lgt{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(14,16,52,.82);backdrop-filter:blur(8px)}.lgt .sp{flex:1}'+
'.lgib{width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.12);font-size:16px}.lgpill{background:linear-gradient(90deg,#FFC53D,#FF8A5B);color:#33250A;font-weight:900;font-size:11px;letter-spacing:.06em;padding:6px 10px;border-radius:999px}.lgchip{background:rgba(255,255,255,.14);padding:6px 11px;border-radius:999px;font-size:12px}'+
'.lgc{width:100%;max-width:980px;margin:0 auto;padding:14px 16px;display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center}.lgh{font-family:"Baloo 2",Nunito,sans-serif;font-weight:800;font-size:clamp(22px,4vw,34px);line-height:1.1}.lgmut{opacity:.75;font-size:14px;max-width:560px}.lgmut .w,.lgnote .w{color:#FFC53D}'+
'.lgb{padding:14px 22px;border-radius:16px;font-weight:900;font-size:16px;background:rgba(255,255,255,.14)}.lgb.go{background:linear-gradient(90deg,#27C99A,#4B6BFF);box-shadow:0 8px 24px rgba(39,201,154,.35)}.lgb.bad{background:#FF3B5C}.lgb.sm{padding:6px 12px;font-size:12px;border-radius:10px}.lgb:disabled{opacity:.4;cursor:not-allowed}.lgbtns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.lgfoot{display:flex;gap:10px;justify-content:center;padding:6px 0}'+
'.lgjoin{display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap}.lgpin{background:rgba(255,255,255,.1);border-radius:20px;padding:14px 22px;display:flex;flex-direction:column;gap:6px;align-items:center}.lgpin small{opacity:.7}.lgpin b{font-family:"Baloo 2",sans-serif;font-size:clamp(34px,7vw,56px);letter-spacing:.08em;line-height:1}.lgqr{width:132px;height:132px;background:#fff;border-radius:16px;padding:6px;color:#1B2150;font-size:10px;overflow:hidden}.lgqr svg{width:100%;height:100%}'+
'.lgset{display:grid;grid-template-columns:auto auto;gap:8px 12px;align-items:center;background:rgba(255,255,255,.07);padding:12px 14px;border-radius:16px}.lgset label{font-size:13px;opacity:.8;text-align:left}.seg{display:flex;gap:4px}.seg button{padding:7px 12px;border-radius:10px;background:rgba(255,255,255,.1);font-size:13px}.seg button.on{background:#FFC53D;color:#33250A}.lgnote{font-size:13px;opacity:.85}.lgcnt{font-size:15px}.lgcnt b{font-size:22px;color:#FFC53D}'+
'.lggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px;width:100%}.lgpt{display:flex;flex-direction:column;align-items:center;gap:5px;padding:9px 4px;border-radius:14px;background:rgba(255,255,255,.08);animation:lgpop .35s both}.lgpt.me{outline:2px solid #FFC53D}.lgpt b{font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
'.lgcd{min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;text-align:center}.lgcd.inl{min-height:0;padding:10px}.lgbig{font-family:"Baloo 2",sans-serif;font-weight:800;font-size:clamp(46px,12vw,110px);line-height:1;background:linear-gradient(90deg,#FFC53D,#FF8A5B);-webkit-background-clip:text;background-clip:text;color:transparent;animation:lgpop .5s both}.lgbig.sm{font-size:clamp(40px,10vw,70px)}.em{font-size:44px}.em.big{font-size:64px}.lgcd h2{font-family:"Baloo 2",sans-serif;font-size:26px}'+
'.lgspin{width:46px;height:46px;border-radius:50%;border:5px solid rgba(255,255,255,.2);border-top-color:#FFC53D;animation:lgrot 1s linear infinite}@keyframes lgrot{to{transform:rotate(360deg)}}@keyframes lgpop{from{opacity:0;transform:scale(.85) translateY(8px)}to{opacity:1;transform:none}}'+
'.lgbr{display:flex;gap:14px;overflow-x:auto;width:100%;padding:6px 2px 10px;text-align:left;-webkit-overflow-scrolling:touch}.lgcol{display:flex;flex-direction:column;justify-content:space-around;gap:8px;min-width:150px;flex:1}.lgcol h4{font-size:12px;opacity:.7;text-align:center;text-transform:uppercase;letter-spacing:.05em}.lgcol.cur h4{color:#FFC53D;opacity:1}'+
'.lgmx{background:rgba(255,255,255,.09);border-radius:12px;overflow:hidden;position:relative;animation:lgpop .4s both}.lgmx.pen{box-shadow:0 0 0 2px #FFC53D}.lgmx i{position:absolute;right:6px;top:50%;transform:translateY(-50%);font-style:normal}.lgr{display:flex;justify-content:space-between;gap:6px;padding:7px 10px;font-size:13px;border-bottom:1px solid rgba(255,255,255,.07)}.lgr:last-child{border:0}.lgr span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lgr.me{background:rgba(255,197,61,.22)}.lgr.win{color:#27C99A}.lgr.win span{font-weight:900}.lgr.bye{color:#FFC53D;font-size:12px}.lgr .q{opacity:.4}'+
'.lgvsl{display:flex;flex-direction:column;gap:10px;width:100%}.lgvsc{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;background:rgba(255,255,255,.08);border-radius:18px;padding:10px 14px;animation:lgpop .5s both}.lgvsc .s{display:flex;align-items:center;gap:10px;justify-content:flex-start;font-size:15px}.lgvsc .s:last-child{justify-content:flex-end;flex-direction:row-reverse}.lgvsc .vs{font-family:"Baloo 2",sans-serif;font-size:22px;color:#FFC53D}.lgvsc .bye{color:#FFC53D;font-size:13px}'+
'.lgvs{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;width:100%;max-width:560px;background:rgba(255,255,255,.08);border-radius:20px;padding:8px 12px}.lgvs .s{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}.lgvs .s b{font-size:13px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lgvs .sc,.lgdc .sc{display:flex;align-items:center;gap:6px;font-family:"Baloo 2",sans-serif;font-size:30px;flex-direction:row}.lgvs .sc em,.lgdc .sc em{font-style:normal;background:rgba(255,255,255,.14);border-radius:10px;min-width:38px;padding:0 8px}.lgvs.sm{padding:6px 10px}.lgvs.sm .sc{font-size:24px}.dots{font-size:13px;min-height:18px;letter-spacing:2px}'+
'.lgbar{width:100%;max-width:700px;height:10px;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden}.lgbar i{display:block;height:100%;background:linear-gradient(90deg,#27C99A,#FFC53D);transition:width .2s linear}.lgsec{font-family:"Baloo 2",sans-serif;font-size:34px;color:#FFC53D;line-height:1}.lgq{font-family:"Baloo 2",sans-serif;font-weight:800;font-size:clamp(24px,4.4vw,44px);line-height:1.15;max-width:900px}.lgq.p{font-size:clamp(20px,5.4vw,28px)}.lgq.sm{font-size:18px;opacity:.85}'+
'.lgops{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:900px}.lgops.host{pointer-events:none}.lgop{display:flex;align-items:center;gap:10px;padding:16px 14px;border-radius:16px;font-size:clamp(15px,2.6vw,22px);text-align:left;min-height:64px;transition:transform .12s,opacity .2s}.lgop u{text-decoration:none;font-size:18px;opacity:.9}.lgop:active{transform:scale(.97)}.o0{background:#FF3B5C}.o1{background:#2D7BFF}.o2{background:#E39B00}.o3{background:#1FA56E}.lgop.dim{opacity:.35}.lgop.sel{outline:3px solid #fff}.lgop.ok{outline:3px solid #fff;box-shadow:0 0 22px rgba(39,201,154,.9)}.lgop.no{opacity:.6}'+
'.lgverdict{font-family:"Baloo 2",sans-serif;font-size:26px;padding:6px 18px;border-radius:14px}.lgverdict.y{background:rgba(39,201,154,.25)}.lgverdict.n{background:rgba(255,59,92,.25)}'+
'.lgduels{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;width:100%}.lgdc{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:6px;background:rgba(255,255,255,.08);border-radius:16px;padding:10px}.lgdc.pen{box-shadow:0 0 0 2px #FFC53D}.lgdc.done{opacity:.8}.lgdc .s{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:12px;min-width:0;position:relative}.lgdc .s b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lgdc .s.win b{color:#27C99A}.lgdc .s i{position:absolute;top:0;right:8px;font-style:normal;color:#27C99A}.lgdc .sc{flex-wrap:wrap;justify-content:center;font-size:22px}.lgdc .sc small{width:100%;font-family:Nunito;font-size:10px;opacity:.8}.seqr{font-size:12px;min-height:16px}.lgbyes{grid-column:1/-1;opacity:.8;font-size:13px}'+
'.lgpod{display:flex;align-items:flex-end;justify-content:center;gap:10px;margin:10px 0;width:100%}.lgpod .c{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;max-width:170px}.lgpod .pp{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:13px;min-height:84px;justify-content:flex-end}.lgpod .bar{width:100%;border-radius:14px 14px 0 0;display:flex;justify-content:center;padding-top:8px;font-family:"Baloo 2",sans-serif;font-size:30px;color:#33250A}.s1 .bar{height:150px;background:linear-gradient(#FFD95E,#F2A516)}.s2 .bar{height:104px;background:linear-gradient(#E4E8F4,#9BA6C2)}.s3 .bar{height:76px;background:linear-gradient(#F3B27A,#C77A3E)}.cup{font-size:40px;animation:lgpop .8s infinite alternate}.lg4{opacity:.85}'+
'.lgpk{gap:8px}#lgpkh{display:none}.lgpk{width:100%}.lgstage{position:relative;width:100%;max-width:980px;margin:0 auto}.lgstage canvas{display:block;margin:0 auto;border-radius:20px;touch-action:none;box-shadow:0 10px 30px rgba(0,0,0,.4)}.lghint{font-size:13px;opacity:.9;max-width:420px}.lgcr{font-size:11px;opacity:.6;text-align:center;max-width:520px;margin:6px auto 0;line-height:1.4}.lgcr a{color:inherit;text-decoration:underline}.lgban{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font-family:"Baloo 2",sans-serif;font-size:34px;padding:10px 20px;border-radius:18px;background:rgba(0,0,0,.65);white-space:nowrap;animation:lgpop .4s both}.lgban.goal{color:#27C99A}.lgban.save{color:#FFC53D}.lgban.miss{color:#FF3B5C}.lgban[hidden]{display:none}'+
'.lgmod{position:absolute;inset:0;z-index:5;background:rgba(5,6,30,.7);display:grid;place-items:center;padding:20px}.lgmod[hidden]{display:none}.lgmb{background:#1B1F5E;border-radius:22px;padding:22px;max-width:360px;width:100%;display:flex;flex-direction:column;gap:12px;text-align:center}.lgmb h3{font-family:"Baloo 2",sans-serif;font-size:22px}.lgmb p{opacity:.8;font-size:14px}.lgconn{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:6;background:#FF3B5C;padding:8px 14px;border-radius:999px;font-size:13px}.lgconn[hidden]{display:none}'+
'.lgload{min-height:220px;display:grid;place-items:center;border-radius:18px;background:rgba(255,255,255,.07);font-size:15px;width:100%}.lgload[hidden],.lgstage canvas[hidden]{display:none}.lghlab{font-family:"Baloo 2",sans-serif;font-size:18px;color:#FFC53D;min-height:24px}.lgzg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;max-width:420px;margin:0 auto}.lgzg button{padding:18px 6px;border-radius:14px;background:rgba(255,255,255,.14);font-size:14px}.lgzg button:disabled{opacity:.4}'+
'@media(max-width:560px){.lgops{grid-template-columns:1fr}.lgcol{min-width:138px}}';
})();

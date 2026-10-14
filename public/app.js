const S=["الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"];
const ST=[0,2,50,77,106,128,151,177,187,208,221,235,249,255,262,267,282,293,305,312,322,332,342,350,359,367,377,385,396,404,411,415,418,428,434,440,446,453,458,467,477,483,489,496,499,502,507,511,515,518,520,523,526,528,531,534,537,542,545,549,551,553,554,556,558,560,562,564,566,568,570,572,574,575,577,578,580,582];
const SH=[1.5,1.4,1,.8,.6,1.5,1,.8,.5,.6,.8,1.3,.7,.5,.6,.4,.3,.4,.6,.3,.8,.5,.6,.5,.4,.2,.4,.3,.3,.3,.2,.4,.3,.3,.25,.3,1/3];
const pg=i=>i<77?ST[i+1]-ST[i]:SH[i-77];
const pts=i=>pg(i)/2;
const cnt=v=>v===true?1:(+v||0);
const fmt=n=>Number.isInteger(n)?n:+n.toFixed(2);
const $=(h)=>{const d=document.createElement('div');d.innerHTML=h.trim();return d.firstElementChild};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hex=s=>[...new TextEncoder().encode(s.trim().toLowerCase().replace(/\s+/g,' '))].map(b=>b.toString(16).padStart(2,'0')).join('');
const dkey=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const when=ts=>{const d=new Date(ts);return d.toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long'})+' الساعة '+d.toLocaleTimeString('ar-EG',{hour:'numeric',minute:'2-digit'})};
const ls={get(k){try{return localStorage.getItem(k)||sessionStorage.getItem(k)}catch(e){return null}},set(k,v,keep=true){try{(keep?localStorage:sessionStorage).setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k);sessionStorage.removeItem(k)}catch(e){}}};
const VISIBLE_DAYS=5,ADMIN_DAYS=30,JUZ_PTS=10;

/* ===== الوضع الفاتح / الغامق ===== */
const savedTheme=ls.get('wird_theme');
if(savedTheme)document.documentElement.setAttribute('data-theme',savedTheme);
const curTheme=()=>document.documentElement.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
const themeIcon=()=>curTheme()=='dark'?'☀️':'🌙';
let endsAt=0,memQ='',logQ='',cdTimer=null,cfg=null,lastA=false,today=dkey(),me=null,users=[],logs=[],page='wird',photo='',viewUid=null,doneSet=new Set();
const app=document.getElementById('app');

async function api(path,body){
  const h={'Content-Type':'application/json'},t=ls.get('wird_tok');if(t)h.Authorization='Bearer '+t;
  const r=await fetch(path,{method:body?'POST':'GET',headers:h,body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error(j.error||'error'),{status:r.status,msg:j.error});
  return j;
}
async function refresh(first){
  const j=await api('/api/state');users=j.users;logs=j.logs;cfg=j.admins||null;today=j.today;endsAt=Date.now()+(j.left||0);doneSet=new Set(j.done||[]);const was=lastA;me=j.me;
  /* غير الأدمن مايشوفش غير ورده هو بس */
  if(!admin())logs=logs.filter(l=>me&&l.uid==me.id);
  if(!me&&ls.get('wird_tok'))ls.del('wird_tok');
  if(first)render();else if(admin()!==was)shell();else sync();
}
async function init(){
  app.innerHTML='<p class="empty">جاري التحميل…</p>';
  try{await refresh(true)}catch(e){app.innerHTML='<p class="empty">السيرفر مش متاح دلوقتي، حاول بعد شوية.</p>';return}
  let tick=0;
  setInterval(()=>{tick++;if(!document.hidden&&(page=='members'||tick%6==0))refresh().catch(()=>{})},5000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh().catch(()=>{})});
}
const adminNames=()=>cfg||[];
/* تطبيع الاسم للبحث (يتجاهل التشكيل والهمزات) */
const nrm=t=>String(t||'').toLowerCase().replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').trim();
const pad2=n=>String(n).padStart(2,'0');
const SEARCH_BOX=(id,val)=>`<input type="text" id="${id}" class="srch" placeholder="🔍 ابحث عن عضو بالاسم…" value="${esc(val)}" autocomplete="off" style="margin:0 0 12px">`;
const admin=()=>!!(me&&me.admin);
function sync(){if(page=='members'&&paintMembers())return;if(page=='admins'){if(document.getElementById('al'))drawAdmins();return}if(['top','members','log','mine'].includes(page))renderView()}

function resize(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),z=160,m=Math.min(im.width,im.height);c.width=c.height=z;c.getContext('2d').drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,z,z);res(c.toDataURL('image/jpeg',.8))};im.onerror=rej;im.src=r.result};r.readAsDataURL(file)})}

function render(){shell()}
function authView(v){
  let mode='in';photo='';
  v.innerHTML='';
  const el=$(`<div class="login card an"><div class="bsm"><span id="bsp">﷽</span></div><h1>ورد القرآن</h1><p>سجّل وردك اليومي واجمع النقاط</p>
  <div class="seg"><button class="on" data-m="in">تسجيل دخول</button><button data-m="up">حساب جديد</button></div>
  <label class="l" style="display:block;text-align:start">الاسم</label><input type="text" id="nm" placeholder="اكتب اسمك" maxlength="40" autocomplete="username">
  <label class="l" style="display:block;text-align:start">كلمة السر</label><div class="pw"><input type="password" id="pw" placeholder="كلمة السر (٤ حروف على الأقل)" maxlength="60" autocomplete="current-password"><button type="button" class="eye" id="eye" aria-label="إظهار كلمة السر">👁️</button></div>
  <div id="ph" class="pick hide"><img class="av" id="pv" alt=""><label class="btn sm ghost" style="cursor:pointer">اختار صورتك<input type="file" id="pf" accept="image/*" hidden></label></div>
  <label class="chk" style="padding:10px"><input type="checkbox" id="rm" checked><b style="text-align:start">ابقى مسجل دخول</b></label>
  <div class="err" id="er"></div><button class="btn" id="go">دخول</button></div>`);
  v.append(el);
  const q=s=>el.querySelector(s);
  const fit=()=>{const sp=q('#bsp');if(!sp)return;const w=el.clientWidth-2*parseFloat(getComputedStyle(el).paddingLeft);sp.style.fontSize='100px';const k=sp.getBoundingClientRect().width;if(k&&w>0)sp.style.fontSize=(100*w*.95/k)+'px'};
  fit();try{new ResizeObserver(fit).observe(el)}catch(e){addEventListener('resize',fit)}try{document.fonts.ready.then(fit)}catch(e){}
  el.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{mode=b.dataset.m;el.querySelectorAll('.seg button').forEach(x=>x.classList.toggle('on',x==b));q('#ph').classList.toggle('hide',mode=='in');q('#go').textContent=mode=='in'?'دخول':'إنشاء الحساب';q('#er').textContent=''});
  q('#eye').onclick=()=>{
    const p=q('#pw'),show=p.type=='password';
    p.type=show?'text':'password';
    q('#eye').textContent=show?'🙈':'👁️';
    q('#eye').setAttribute('aria-label',show?'إخفاء كلمة السر':'إظهار كلمة السر');
  };
  q('#pf').onchange=async e=>{if(e.target.files[0]){photo=await resize(e.target.files[0]);q('#pv').src=photo}};
  q('#go').onclick=async()=>{
    const name=q('#nm').value.trim(),pw=q('#pw').value,er=q('#er');er.textContent='';
    if(name.length<2){er.textContent='اكتب اسمك من فضلك';return}
    if(pw.length<4){er.textContent='كلمة السر لازم تكون ٤ حروف على الأقل';return}
    if(mode=='up'&&!photo){er.textContent='لازم تختار صورة';return}
    q('#go').disabled=true;
    try{const j=await api(mode=='in'?'/api/login':'/api/register',{name,password:pw,photo});
      ls.del('wird_tok');ls.set('wird_tok',j.token,q('#rm').checked);page='wird';await refresh();shell();
    }catch(e){er.textContent=e.msg||'حصلت مشكلة، حاول تاني'}finally{q('#go').disabled=false}
  };
}
function shell(){
  lastA=admin();
  const tabs=[['wird','تسجيل الورد']];
  tabs.push(['mine','نقاطي']);
  tabs.push(['members','الأعضاء']);
  if(lastA)tabs.push(['top','الترتيب'],['log','سجل الورد']);
  if(lastA)tabs.push(['admins','الأدمن']);
  const nm=me?`<img class="av" src="${esc(me.photo)}" alt=""><span class="nm">${esc(me.name)}</span><button class="btn sm ghost" id="out">خروج</button>`:`<button class="btn sm" id="out">دخول</button>`;
  app.innerHTML=`<nav><span class="logo">ورد القرآن</span>
  <div class="menu" id="menu">${tabs.map(t=>`<button class="t ${page==t[0]?'on':''}" data-p="${t[0]}">${t[1]}</button>`).join('')}</div>
  <div class="me"><button class="ic" id="th" title="تغيير الوضع" aria-label="تغيير الوضع">${themeIcon()}</button>${nm}<button class="ic burger" id="bg" aria-label="القائمة" aria-expanded="false">☰</button></div></nav><main id="view"></main>`;
  app.querySelectorAll('nav .t').forEach(b=>b.onclick=()=>{page=b.dataset.p;viewUid=null;shell();if(page=='members')refresh().catch(()=>{})});
  document.getElementById('th').onclick=function(){
    const t=curTheme()=='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',t);
    ls.set('wird_theme',t);
    this.textContent=themeIcon();
  };
  document.getElementById('bg').onclick=()=>{
    const open=document.getElementById('menu').classList.toggle('open');
    const b=document.getElementById('bg');
    b.textContent=open?'✕':'☰';
    b.setAttribute('aria-expanded',open);
  };
  document.getElementById('out').onclick=()=>{if(me){api('/api/logout',{}).catch(()=>{});ls.del('wird_tok');me=null;logs=[];viewUid=null;page='wird'}else page='auth';shell()};
  renderView();
}
function renderView(){const v=document.getElementById('view');if(!v)return;const need={top:admin(),log:admin(),admins:admin()};if(need[page]===false){page='wird';return shell()}({wird:wirdView,members:membersView,top:topView,log:logView,auth:authView,mine:mineView,admins:adminsView})[page](v)}

function wirdView(v){
  const mine=me&&logs.find(l=>l.id==me.id+'_'+today);
  if(mine){v.innerHTML=`<div class="card done an"><div class="big">✅</div><h2>اتسجّل ورد النهاردة</h2><p>جمعت <b style="color:var(--gold);font-size:24px">${fmt(mine.points)}</b> نقطة. ارجع بكره بإذن الله 🌙</p>
  <p style="color:var(--mut);margin:14px 0 4px">الباقي على بداية اليوم الجديد (الساعة ١٢ بليل)</p>
  <div id="cd" dir="ltr" style="font:800 34px Tajawal;color:var(--gold);letter-spacing:2px">--:--:--</div>
  <small style="color:var(--mut)">ساعة : دقيقة : ثانية</small></div>`;startCountdown();return}
  clearInterval(cdTimer);
  const sel=new Set(),jz=new Set(),c={nw:0,tath:0,tahd:0};let mode='s';
  const rows=[['nw','الجديد','المطلوب ١٠ مرات'],['tath','التثبيت','المطلوب ٥ مرات'],['tahd','التحضير','المطلوب مرة']];
  v.innerHTML=(me?'':`<div class="card an"><b>تقدر تتصفح الموقع، لكن لازم تسجل دخول عشان تحفظ وردك.</b> <button class="btn sm" id="gl" style="margin-top:8px">تسجيل دخول</button></div>`)+
  `<div class="card an"><h2 style="margin-bottom:12px">ورد النهاردة <small style="font:500 14px Tajawal;color:var(--mut)">(كل مرة = نقطة)</small></h2>
  ${rows.map(r=>`<div class="chk" style="cursor:default"><b>${r[1]}<br><small style="color:var(--mut)">${r[2]}</small></b><div class="step"><button data-k="${r[0]}" data-d="1">+</button><input type="number" inputmode="numeric" min="0" max="99" value="0" id="n_${r[0]}"><button data-k="${r[0]}" data-d="-1">−</button></div></div>`).join('')}</div>
  <div class="card an" style="animation-delay:.1s"><h2 style="margin-bottom:10px">المراجعة</h2>
  <div class="seg"><button class="on" data-m="s">حسب السورة</button><button data-m="j">حسب الجزء (١٠ نقاط)</button></div><div id="hint" class="hide" style="color:var(--mut);font-size:13px;margin:-6px 0 10px"></div>
  <input type="text" id="se" placeholder="ابحث عن سورة…"><div class="chips" id="ch"></div></div>
  <div class="total"><div class="n" id="tn">0</div><div style="flex:1;color:var(--mut)">نقطة</div><button class="btn sm" id="sv" disabled>سجّل الورد</button></div>`;
  const ch=v.querySelector('#ch'),se=v.querySelector('#se');
  const calc=()=>{let t=c.nw+c.tath+c.tahd;sel.forEach(i=>t+=pts(i));t+=jz.size*JUZ_PTS;t=+t.toFixed(2);v.querySelector('#tn').textContent=fmt(t);v.querySelector('#sv').disabled=t==0;const h=v.querySelector('#hint');h.classList.toggle('hide',!(sel.size||jz.size));h.textContent=sel.size?'اخترت مراجعة بالسورة، امسح اختياراتك لو عايز تراجع بالجزء.':'اخترت مراجعة بالجزء، امسح اختياراتك لو عايز تراجع بالسورة.';v.querySelectorAll('.seg button').forEach(b=>{const k=(b.dataset.m=='j'&&sel.size>0)||(b.dataset.m=='s'&&jz.size>0);b.disabled=k;b.style.opacity=k?.4:1});return t};
  const setN=(k,x)=>{c[k]=Math.max(0,Math.min(99,Math.floor(+x||0)));v.querySelector('#n_'+k).value=c[k];calc()};
  v.querySelectorAll('.step button').forEach(b=>b.onclick=()=>setN(b.dataset.k,c[b.dataset.k]+ +b.dataset.d));
  rows.forEach(r=>v.querySelector('#n_'+r[0]).oninput=e=>{c[r[0]]=Math.max(0,Math.min(99,Math.floor(+e.target.value||0)));calc()});
  const draw=()=>{ch.innerHTML='';const items=mode=='s'?S.map((n,i)=>[i,n,pts(i),sel]).filter(x=>x[0]>0&&x[1].includes(se.value.trim())):Array.from({length:30},(_,i)=>[i,'الجزء '+(i+1),JUZ_PTS,jz]);
    items.forEach(([i,n,p,set])=>{const e=$(`<div class="chip ${set.has(i)?'on':''}">${n}<small>${fmt(p)} نقطة</small></div>`);e.onclick=()=>{set.has(i)?set.delete(i):set.add(i);e.classList.toggle('on');calc()};ch.append(e)})};
  v.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{mode=b.dataset.m;v.querySelectorAll('.seg button').forEach(x=>x.classList.toggle('on',x==b));se.classList.toggle('hide',mode=='j');draw()});
  se.oninput=draw;draw();
  const gl=v.querySelector('#gl');if(gl)gl.onclick=()=>{page='auth';shell()};
  v.querySelector('#sv').onclick=async function(){
    if(!me){page='auth';shell();return}
    if(!calc())return;this.disabled=true;
    try{await api('/api/log',{nw:c.nw,tath:c.tath,tahd:c.tahd,rev:[...sel],juz:[...jz]});doneSet.add(me.id);await refresh();renderView()}
    catch(e){alert(e.msg||'حصلت مشكلة في الحفظ، حاول تاني');this.disabled=false;if(e.status==409){await refresh();renderView()}}
  };
}
/* عداد تنازلي لحد الساعة 12 بليل بتوقيت القاهرة */
function startCountdown(){
  clearInterval(cdTimer);
  const el=()=>document.getElementById('cd');
  const tick=()=>{
    const e=el();if(!e||page!='wird'){clearInterval(cdTimer);return}
    let s=Math.max(0,Math.ceil((endsAt-Date.now())/1000));
    e.textContent=pad2(Math.floor(s/3600))+':'+pad2(Math.floor(s%3600/60))+':'+pad2(s%60);
    if(s<=0){
      clearInterval(cdTimer);
      /* اليوم الجديد بدأ: نجيب الحالة من السيرفر ونعيد المحاولة لو لسه ماتغيرش */
      const go=()=>refresh().then(()=>{if(page!='wird')return;if(endsAt-Date.now()<=0)endsAt=Date.now()+1500;renderView()}).catch(()=>setTimeout(go,2000));
      go();
    }
  };
  tick();cdTimer=setInterval(tick,250);
}
function sumFor(from){const m={};logs.forEach(l=>{if(l.ts>=from)m[l.uid]=(m[l.uid]||0)+l.points});return m}
function topView(v){
  const now=new Date(),sat=new Date(now.getFullYear(),now.getMonth(),now.getDate());sat.setDate(sat.getDate()-((sat.getDay()+1)%7));
  const ranges={w:['الأسبوع',+sat],m:['الشهر',+new Date(now.getFullYear(),now.getMonth(),1)],y:['السنة',+new Date(now.getFullYear(),0,1)]};
  const cur=v._r||'w';
  v.innerHTML=`<div class="seg an">${Object.entries(ranges).map(([k,r])=>`<button data-r="${k}" class="${k==cur?'on':''}">${r[0]}</button>`).join('')}</div><div id="rk"></div>`;
  v.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{v._r=b.dataset.r;topView(v)});
  const m=sumFor(ranges[cur][1]),rows=Object.entries(m).sort((a,b)=>b[1]-a[1]);
  v.querySelector('#rk').innerHTML=rows.length?rows.map(([id,p],i)=>{const u=users.find(x=>x.id==id)||{name:'؟',photo:''};
    return `<div class="rank an" style="animation-delay:${i*.05}s"><div class="no">${i<3?['🥇','🥈','🥉'][i]:i+1}</div><img class="av" src="${esc(u.photo||'')}" alt=""><div class="nm">${esc(u.name)}</div><div class="pt">${fmt(p)} نقطة</div></div>`}).join(''):'<div class="empty">لسه مفيش نقاط في الفترة دي</div>';
}
function membersView(v){
  if(!users.length){v.innerHTML='<div class="empty">مفيش أعضاء لسه</div>';return}
  if(!v.querySelector('#mq')){
    v.innerHTML=SEARCH_BOX('mq',memQ)+'<p style="color:var(--mut);font-size:14px;margin:0 0 12px">🟩 رفع ورد النهاردة &nbsp; 🟥 لسه</p><div id="mg"></div>';
    v.querySelector('#mq').oninput=e=>{memQ=e.target.value;filterMembers()};
  }
  const tot=sumFor(0);
  v.querySelector('#mg').innerHTML=`<div class="grid">${users.map((u,i)=>`<div class="card mem an ${doneSet.has(u.id)?'ok':'no'} ${admin()?'clk':''}" data-id="${esc(u.id)}" data-n="${esc(nrm(u.name))}" style="animation-delay:${i*.05}s"><img class="av" src="${esc(u.photo)}" alt=""><b>${esc(u.name)}</b>${admin()?`<div class="pts" style="color:var(--gold);font-weight:800">${fmt(tot[u.id]||0)} نقطة</div>`:''}</div>`).join('')}</div><div class="empty hide" id="mno">مفيش عضو بالاسم ده</div>`;
  /* الأدمن بس يقدر يفتح صفحة نقاط العضو */
  if(admin())v.querySelectorAll('.mem').forEach(c=>c.onclick=()=>{viewUid=c.dataset.id;page='mine';shell()});
  filterMembers();
}
/* البحث في الأعضاء: بيخفي الكروت اللي مش مطابقة من غير ما يعيد الرسم */
function filterMembers(){
  const q=nrm(memQ);let n=0;
  document.querySelectorAll('#view .mem').forEach(c=>{const ok=!q||c.dataset.n.includes(q);c.style.display=ok?'':'none';if(ok)n++});
  const e=document.getElementById('mno');if(e)e.classList.toggle('hide',n>0);
}
/* بتغير لون الإطار والنقاط في مكانها من غير إعادة رسم (بترجع false لو لازم رسم كامل) */
function paintMembers(){
  const cards=document.querySelectorAll('#view .mem');
  if(!cards.length||cards.length!=users.length)return false;
  const tot=sumFor(0);
  cards.forEach(c=>{
    const id=c.dataset.id,ok=doneSet.has(id);
    c.classList.toggle('ok',ok);
    c.classList.toggle('no',!ok);
    const p=c.querySelector('.pts');
    if(p)p.textContent=fmt(tot[id]||0)+' نقطة';
  });
  return true;
}
function logView(v){
  if(!v.querySelector('#lq')){
    v.innerHTML=SEARCH_BOX('lq',logQ)+'<div id="ll"></div>';
    v.querySelector('#lq').oninput=e=>{logQ=e.target.value;drawLogs(v)};
  }
  drawLogs(v);
}
function drawLogs(v){
  const q=nrm(logQ);
  const rows=[...logs].filter(l=>!q||nrm(l.name).includes(q)).sort((a,b)=>b.ts-a.ts);
  v.querySelector('#ll').innerHTML=`<div class="card an">${rows.length?rows.map(l=>{const u=users.find(x=>x.id==l.uid);
    const t=[['nw','الجديد'],['tath','التثبيت'],['tahd','التحضير']].filter(x=>cnt(l[x[0]])).map(x=>x[1]+' ×'+cnt(l[x[0]])).concat((l.rev||[]).map(x=>'مراجعة '+S[x]),(l.juz||[]).map(j=>'مراجعة جزء '+j));
    return `<div class="log"><img class="av" src="${esc(u?u.photo:'')}" alt=""><div class="tx"><b>${esc(l.name)}</b> — ${fmt(l.points)} نقطة<br>${t.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}<br><small>اترفع ${when(l.ts)}</small></div></div>`}).join(''):`<div class="empty">${q?'مفيش نتائج للبحث ده':'مفيش ورد متسجل لسه'}</div>`}</div>`;
}
function mineView(v){
  if(!me){v.innerHTML='<div class="card an"><b>سجّل دخولك عشان تشوف نقاطك.</b> <button class="btn sm" id="gl2" style="margin-top:8px">تسجيل دخول</button></div>';v.querySelector('#gl2').onclick=()=>{page='auth';shell()};return}
  /* الأدمن لما يدوس على عضو بيشوف نقاطه، وبيشوف ٣٠ يوم بدل ٥ */
  const tgt=admin()&&viewUid?users.find(x=>x.id==viewUid):null;
  const who=tgt||me,limit=admin()?ADMIN_DAYS:VISIBLE_DAYS;
  const title=tgt&&tgt.id!=me.id?'نقاط '+esc(tgt.name):'نقاطي';
  const canDel=!!(tgt&&tgt.id!=me.id&&!adminNames().some(n=>hex(n)==tgt.id));
  const rows=logs.filter(l=>l.uid==who.id).sort((a,b)=>b.ts-a.ts);
  v.innerHTML=`<div class="card an"><div class="row">${tgt?`<img class="av" src="${esc(tgt.photo||'')}" alt="">`:''}<h2 style="flex:1">${title}</h2>${tgt?'<button class="btn sm ghost" id="bk">رجوع للأعضاء</button>':''}</div>${admin()&&tgt?'<div class="row" style="margin-top:12px;gap:10px;flex-wrap:wrap"><button class="btn sm ghost" id="rs">♻️ تصفير النقاط</button>'+(canDel?'<button class="btn sm ghost" id="cp">🔑 تغيير الباسورد</button>':'')+(canDel?'<button class="btn sm danger" id="dl">🗑️ مسح العضو نهائيًا</button>':'')+'</div>':''}<p style="color:var(--mut);margin:6px 0 0">بتظهر لك نقاط آخر ${limit} يوم بس، وباقي الأيام مقفولة.</p></div>`+
  (rows.length?rows.map((l,i)=>{const lock=i>=limit||l.points==null;
    const t=lock?'':[['nw','الجديد'],['tath','التثبيت'],['tahd','التحضير']].filter(x=>cnt(l[x[0]])).map(x=>`<span class="tag">${x[1]} ×${cnt(l[x[0]])}</span>`).join('')+(l.rev||[]).map(x=>`<span class="tag">مراجعة ${esc(S[x])}</span>`).join('')+(l.juz||[]).map(j=>`<span class="tag">مراجعة جزء ${j}</span>`).join('');
    return `<div class="card dayc an ${lock?'lockd':''}" ${lock?'aria-disabled="true"':''} style="animation-delay:${Math.min(i,10)*.04}s"><div class="tx"><b>اترفع ${when(l.ts)}</b><br>${t}</div><div class="pt">${lock?'🔒 ٠٠':fmt(l.points)+' نقطة'}</div></div>`}).join(''):'<div class="empty">لسه ماسجلش ورد</div>');
  const bk=v.querySelector('#bk');if(bk)bk.onclick=()=>{viewUid=null;page='members';shell()};
  const dl=v.querySelector('#dl');if(dl)dl.onclick=()=>confirmDelete(tgt);
  const rs=v.querySelector('#rs');if(rs)rs.onclick=()=>confirmReset(tgt);
  const cp=v.querySelector('#cp');if(cp)cp.onclick=()=>changePassword(tgt);
}
/* نافذة تأكيد تصفير نقاط عضو (للأدمن بس) */
function confirmReset(u){
  const m=$(`<div class="mdl" role="dialog" aria-modal="true"><div class="box"><div class="big">♻️</div><h2>تصفير النقاط؟</h2>
  <img class="av" src="${esc(u.photo||'')}" alt=""><p><b>${esc(u.name)}</b></p>
  <p style="color:var(--mut)">هتتمسح كل نقاطه وسجلات وِرده، والحساب هيفضل موجود. العملية دي <b>مينفعش يتراجع عنها</b>.</p>
  <div class="err" id="de"></div>
  <div class="row" style="justify-content:center;gap:10px"><button class="btn sm danger" id="dy">أيوه، صفّر</button><button class="btn sm ghost" id="dn">إلغاء</button></div></div></div>`);
  document.body.append(m);
  const close=()=>m.remove();
  m.onclick=e=>{if(e.target==m)close()};
  m.querySelector('#dn').onclick=close;
  m.querySelector('#dy').onclick=async function(){
    this.disabled=true;
    try{await api('/api/admin/reset-points',{id:u.id});close();await refresh();renderView()}
    catch(e){m.querySelector('#de').textContent=e.msg||'حصلت مشكلة، حاول تاني';this.disabled=false}
  };
}
/* نافذة تغيير كلمة سر عضو (للأدمن بس) */
function changePassword(u){
  const m=$(`<div class="mdl" role="dialog" aria-modal="true"><div class="box"><div class="big">🔑</div><h2>تغيير كلمة السر</h2>
  <img class="av" src="${esc(u.photo||'')}" alt=""><p><b>${esc(u.name)}</b></p>
  <div class="pw"><input type="password" id="np" placeholder="كلمة السر الجديدة (٤ حروف على الأقل)" maxlength="60" autocomplete="new-password"><button type="button" class="eye" id="ey" aria-label="إظهار كلمة السر">👁️</button></div>
  <p style="color:var(--mut);font-size:13px">هيتسجّل خروجه من كل الأجهزة وهيدخل بالباسورد الجديد.</p>
  <div class="err" id="de"></div>
  <div class="row" style="justify-content:center;gap:10px"><button class="btn sm" id="dy">حفظ</button><button class="btn sm ghost" id="dn">إلغاء</button></div></div></div>`);
  document.body.append(m);
  const close=()=>m.remove(),q=s=>m.querySelector(s);
  m.onclick=e=>{if(e.target==m)close()};
  q('#dn').onclick=close;
  q('#ey').onclick=()=>{const p=q('#np'),s=p.type=='password';p.type=s?'text':'password';q('#ey').textContent=s?'🙈':'👁️'};
  q('#dy').onclick=async function(){
    const pw=q('#np').value;
    if(pw.length<4){q('#de').textContent='كلمة السر لازم تكون ٤ حروف على الأقل';return}
    this.disabled=true;
    try{await api('/api/admin/change-password',{id:u.id,password:pw});close();alert('تم تغيير كلمة السر ✅')}
    catch(e){q('#de').textContent=e.msg||'حصلت مشكلة، حاول تاني';this.disabled=false}
  };
}
/* نافذة تأكيد مسح عضو (للأدمن بس) */
function confirmDelete(u){
  const m=$(`<div class="mdl" role="dialog" aria-modal="true"><div class="box"><div class="big">⚠️</div><h2>مسح العضو نهائيًا؟</h2>
  <img class="av" src="${esc(u.photo||'')}" alt=""><p><b>${esc(u.name)}</b></p>
  <p style="color:var(--mut)">هيتمسح حسابه وصورته وكل الورد والنقاط بتاعته من الموقع كله، والعملية دي <b>مينفعش يتراجع عنها</b>.</p>
  <div class="err" id="de"></div>
  <div class="row" style="justify-content:center;gap:10px"><button class="btn sm danger" id="dy">أيوه، امسح</button><button class="btn sm ghost" id="dn">إلغاء</button></div></div></div>`);
  document.body.append(m);
  const close=()=>m.remove();
  m.onclick=e=>{if(e.target==m)close()};
  m.querySelector('#dn').onclick=close;
  m.querySelector('#dy').onclick=async function(){
    this.disabled=true;
    try{await api('/api/admin/delete-user',{id:u.id});close();viewUid=null;page='members';await refresh();shell()}
    catch(e){m.querySelector('#de').textContent=e.msg||'حصلت مشكلة، حاول تاني';this.disabled=false}
  };
}
function drawAdmins(){
  const el=document.getElementById('al');if(!el)return;const names=adminNames();
  el.innerHTML=names.map((n,i)=>{const u=users.find(x=>x.id==hex(n));return `<div class="rank"><img class="av" src="${esc(u?u.photo:'')}" alt=""><div class="nm">${esc(n)}<br><small style="color:var(--mut)">${u?'مسجل':'لسه ما سجّلش حساب'}</small></div>${u?'<span class="safe">🔒 محمي</span>':`<button class="btn sm ghost" data-i="${i}">حذف</button>`}</div>`}).join('');
  el.querySelectorAll('button').forEach(b=>b.onclick=async()=>{
    const target=names[b.dataset.i];
    /* مينفعش حذف أدمن عنده حساب (نفسك أو أدمن تاني) */
    if(users.some(x=>x.id==hex(target))){alert('مينفعش تحذف حساب أدمن');return}
    const nn=names.filter((_,i)=>i!=b.dataset.i);if(!nn.length){alert('لازم يفضل أدمن واحد على الأقل');return}try{await api('/api/admin/admins',{names:nn});await refresh()}catch(e){alert(e.msg||'حصلت مشكلة')}});
}
function adminsView(v){
  v.innerHTML=`<div class="card an"><h2 style="margin-bottom:6px">الأدمن</h2><p style="color:var(--mut);margin:0 0 12px">اكتب الاسم بالظبط زي ما هو مسجل في الحساب (نفس الهمزات). الأدمن بيشوف الترتيب وسجل الورد ونقاط الأعضاء.</p><div class="row"><input type="text" id="an" placeholder="اسم أدمن جديد" style="margin:0"><button class="btn sm" id="aa">إضافة</button></div><div id="al" style="margin-top:14px"></div></div>`;
  v.querySelector('#aa').onclick=async()=>{const i=v.querySelector('#an'),n=i.value.trim().replace(/\s+/g,' ');if(n.length<2)return;const cur=adminNames();if(cur.some(x=>hex(x)==hex(n))){i.value='';return}try{await api('/api/admin/admins',{names:[...cur,n]});await refresh();i.value=''}catch(e){alert(e.msg||'حصلت مشكلة')}};
  drawAdmins();
}
/* قفل المنيو في الموبايل لما تدوس برّه */
document.addEventListener('click',e=>{
  const m=document.getElementById('menu'),b=document.getElementById('bg');
  if(!m||!b||!m.classList.contains('open'))return;
  if(e.target.closest('#menu,#bg'))return;
  m.classList.remove('open');
  b.textContent='☰';
  b.setAttribute('aria-expanded',false);
});
init();
const $=s=>document.querySelector(s),K='schoolsync_v4';
const SUBJ=['English','Hindi','Science','Maths','Social Studies','Sanskrit'];
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const pd=k=>new Date(k+'T00:00');
const short=k=>pd(k).toLocaleDateString('en-US',{month:'short',day:'numeric'});
const def={name:'',dark:true,email:'',tasks:[],marks:[],events:[],tt:Array.from({length:8},()=>Array(6).fill('')),ttDays:DAYS.slice(0,6),ttPer:Array.from({length:8},(_,i)=>'Period '+(i+1)),sess:[],notes:[]};
let S;try{S={...def,...JSON.parse(localStorage.getItem(K)||'{}')}}catch(e){S=def}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}};
let tab='today',sub='',off=0,flt='All',editTT=false;
const tm={left:0,total:0,run:false,id:null};

const ALLS=()=>[...new Set([...SUBJ,...S.marks.map(m=>m.sub)])];
const subSel=id=>`<select class="sel" id="${id}" onchange="$('#${id}c').style.display=this.value==='Other'?'block':'none'"><option value="">Select Subject</option>${SUBJ.map(s=>`<option>${s}</option>`).join('')}<option value="Other">Other (specify below)</option></select><input class="inp" id="${id}c" placeholder="e.g., German, French, Spanish" style="display:none;margin-top:10px">`;
const getSub=id=>{const v=$('#'+id).value;return v==='Other'?$('#'+id+'c').value.trim():v};
const pct=l=>{const m=l.reduce((a,x)=>a+ +x.max,0);return m?Math.round(l.reduce((a,x)=>a+ +x.sc,0)/m*100):0};
const subAvg=s=>{const l=S.marks.filter(m=>m.sub===s);return l.length?pct(l):null};
const fmt=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),3500)}

function taskRow(t,full){return `<div class="row"><input type="checkbox" ${t.done?'checked':''} onchange="tog(${t.id})"><div class="in"><b class="${t.done?'dn':''}">${esc(t.t)}</b><div><span class="tag ${t.p}">${t.p}</span>${full&&t.d?`<span class="dl">📅 ${short(t.d)}</span>`:''}</div></div>${full?`<button class="del" onclick="delTask(${t.id})">🗑️</button>`:''}</div>`}

const V={
today(){const a=ALLS().map(s=>[s,subAvg(s)]).filter(x=>x[1]!==null).sort((x,y)=>x[1]-y[1])[0],ev=S.events.filter(e=>e.date===iso(new Date())).sort((p,q)=>(p.time||'').localeCompare(q.time||'')),tk=S.tasks.filter(t=>!t.done);
 return `<div class="card focus"><span class="ic">⚠️</span><div><b>Focus Area</b><span class="mu">${a?`${esc(a[0])} is your weakest subject at ${a[1]}%`:'X is your weakest subject at Y%'}</span></div></div><h3>TODAY'S TASKS</h3>${tk.map(t=>taskRow(t)).join('')||'<p class="mu">No tasks added yet</p>'}<h3>TODAY'S EVENTS</h3>${ev.map(e=>`<div class="row"><div class="in"><b>${esc(e.title)}</b><div><span class="tag NORMAL">${esc(e.type)}</span>${e.time?`<span class="dl">🕐 ${e.time}</span>`:''}</div></div></div>`).join('')||'<p class="mu">No events added yet</p>'}`},
cal(){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+off);const y=d.getFullYear(),m=d.getMonth(),f=d.getDay(),td=iso(new Date());
 let c='';for(let i=0;i<42;i++){const x=new Date(y,m,i-f+1),k=iso(x);c+=`<div class="day ${x.getMonth()!==m?'o':''} ${k===td?'td':''}" onclick="addEv('${k}')">${x.getDate()}${S.events.some(e=>e.date===k)?'<i></i>':''}</div>`}
 return `<div class="cal"><div class="hd"><button onclick="mon(-1)">&lt;</button><span>${d.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span><button onclick="mon(1)">&gt;</button></div><div class="hint">Tap a date to add an event</div><div class="grid">${['SUN','MON','TUE','WED','THU','FRI','SAT'].map(w=>`<div class="wd">${w}</div>`).join('')}${c}</div></div>`},
todo(){const l=S.tasks.filter(t=>flt==='All'||t.p===flt.toUpperCase());
 return `<div class="top"><button class="btn" onclick="addTask()">+ Add Task</button><button class="pill" onclick="stDel=false;openNotes()">Your Notes</button></div><div class="chips">${['All','Urgent','High','Normal'].map(f=>`<button class="chip ${f===flt?'on':''}" onclick="flt='${f}';render()">${f}</button>`).join('')}</div>`+(l.map(t=>taskRow(t,1)).join('')||'<p class="mu">No tasks added yet</p>')},
timer(){const g={};[...S.sess].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id).forEach(s=>(g[s.date]=g[s.date]||[]).push(s));
 return `<div class="card"><label class="sc"><b>Subject</b></label>${subSel('tsub')}<div class="clk" id="clk">${fmt(tm.left)}</div><div class="two"><input class="tin" id="tmin" type="number" min="0" max="59" placeholder="Minutes"><input class="tin" id="tsec" type="number" min="0" max="59" placeholder="Seconds"></div><div class="two" style="margin:0"><button onclick="tmReset()"><b>Reset</b></button><button class="start" id="tgo" onclick="tmGo()">${tm.run?'Pause':'Start'}</button></div></div><h3>RECENT SESSIONS</h3>`+
 (Object.keys(g).map(d=>`<h3 style="font-size:13px;margin:12px 0 8px">${short(d).toUpperCase()}, ${pd(d).getFullYear()}</h3>`+g[d].map(s=>`<div class="ses">${esc(s.subj)}<div><span>${s.mins} mins</span><button class="del" onclick="delSess(${s.id})">🗑️</button></div></div>`).join('')).join(''))},
more(){if(sub==='marks')return V.marks();if(sub==='tt')return V.tt();
 return `<button class="menu" onclick="sub='marks';render()"><span class="ic">📊</span><div><b>Marks</b><span class="mu">Test scores and subject performance</span></div></button><button class="menu" onclick="sub='tt';render()"><span class="ic">🗓️</span><div><b>Timetable</b><span class="mu">Your class schedule</span></div></button><button class="menu" onclick="openSettings()"><span class="ic">⚙️</span><div><b>Settings</b><span class="mu">Theme and profile</span></div></button>`},
marks(){const top=`<div class="top"><button class="btn" onclick="addScore()">+ Add Score</button>${S.marks.length?`<div class="grad"><small>Overall Percentage (all subjects)</small><b>${pct(S.marks)}%</b></div>`:''}</div>`;if(!S.marks.length)return top;
 return top+`<h3>SUBJECT PERFORMANCE</h3>`+ALLS().filter(s=>subAvg(s)!==null).map(s=>`<div class="bar"><em>${s}</em><div class="tr"><div style="width:${subAvg(s)}%"></div></div><span>${subAvg(s)}%</span></div>`).join('')+`<h3>SCORE HISTORY</h3>`+[...S.marks].reverse().map(m=>`<div class="ses"><div>${esc(m.sub)}<div class="mu" style="font-weight:400;font-size:12px">${esc(m.title)} · ${m.sc}/${m.max}</div></div><div><span>${Math.round(m.sc/m.max*100)}%</span><button class="del" onclick="delScore(${m.id})">🗑️</button></div></div>`).join('')},
tt(){const e=editTT,ctl=e?`<div class="two" style="margin:14px 0 0">${[['Periods','P',S.tt.length],['Days','D',S.ttDays.length]].map(([l,k,n])=>`<div class="ses" style="margin:0">${l}<div style="display:flex;align-items:center;gap:12px"><button class="sq" onclick="ttAdj('${k}',-1)">−</button>${n}<button class="sq" onclick="ttAdj('${k}',1)">+</button></div></div>`).join('')}</div>`:'';
 return `<button class="btn" onclick="editTT=!editTT;render()">${e?'✓ Save Timetable':'+ Edit Timetable'}</button>${ctl}<div style="overflow-x:auto"><table><tr><th>Period</th>${S.ttDays.map((d,j)=>`<th>${e?`<input value="${esc(d)}" onchange="S.ttDays[${j}]=this.value;save()">`:esc(d)}</th>`).join('')}</tr>${S.tt.map((r,i)=>`<tr><td class="pn">${e?`<input value="${esc(S.ttPer[i])}" onchange="S.ttPer[${i}]=this.value;save()">`:esc(S.ttPer[i])}</td>${r.map((v,j)=>e?`<td><input value="${esc(v)}" placeholder="Subject" onchange="S.tt[${i}][${j}]=this.value;save()"></td>`:`<td class="${v?'':'e'}">${esc(v)||'Subject'}</td>`).join('')}</tr>`).join('')}</table></div>`}
};

function render(){const n=new Date();$('#date').textContent=`${n.toLocaleDateString('en-US',{weekday:'long'})}, ${n.getMonth()+1}/${n.getDate()}`;
 document.body.classList.toggle('light',!S.dark);
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab&&!(tab==='more'&&sub)));
 document.body.style.overflow=tab==='timer'&&!S.sess.length?'hidden':'';$('#view').innerHTML=V[tab]()}
function go(t){if(t==='more'&&tab==='more')sub='';tab=t;if(t!=='more')sub='';render();scrollTo(0,0)}
function mon(n){off+=n;render()}

function sheet(title,body,extra=''){$('#sheet').innerHTML=`<div class="sh"><span>${title}</span><div>${extra}<button class="x" onclick="closeSheet()">×</button></div></div><div class="sb">${body}</div>`;document.body.classList.add('open');requestAnimationFrame(()=>$('#sheet').classList.add('on'))}
function closeSheet(){$('#sheet').classList.remove('on');document.body.classList.remove('open')}

/* tasks */
function addTask(){sheet('Add Task',`<input class="inp" id="nt" placeholder="Task title"><label>Deadline (optional)</label><input class="inp" id="nd" type="date"><select class="sel" id="np"><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select><button class="btn big" onclick="saveTask()">Add Task</button>`)}
function saveTask(){const t=$('#nt').value.trim();if(!t)return $('#nt').focus();S.tasks.push({id:Date.now(),t,d:$('#nd').value,p:$('#np').value,done:false});save();closeSheet();render()}
function tog(id){const t=S.tasks.find(x=>x.id===id);t.done=!t.done;save();render()}
function delTask(id){S.tasks=S.tasks.filter(t=>t.id!==id);save();render()}

/* notes */
let stDel=false,stSel=new Set();
function openNotes(){sheet('Sticky Notes',`<div class="notes">${S.notes.map((n,i)=>stDel?`<div class="nt ${stSel.has(i)?'sel':''}" onclick="stTog(${i})">${esc(n)||'&nbsp;'}</div>`:`<textarea oninput="S.notes[${i}]=this.value;save()">${esc(n)}</textarea>`).join('')||'<p class="mu">No notes yet. Tap + to add one.</p>'}</div>${stDel?`<button class="btn big" style="background:#ef4444;width:100%" onclick="stRm()">Delete Selected</button>`:''}`,`<button class="sq" onclick="S.notes.push('');save();stDel=false;openNotes()">+</button><button class="sq" style="${stDel?'background:#ef4444':''}" onclick="stDel=!stDel;stSel.clear();openNotes()">−</button>`)}
function stTog(i){stSel.has(i)?stSel.delete(i):stSel.add(i);openNotes()}
function stRm(){S.notes=S.notes.filter((_,i)=>!stSel.has(i));stSel.clear();stDel=false;save();openNotes()}

/* events */
function addEv(k){const x=pd(k),lab=`${x.toLocaleDateString('en-US',{weekday:'long'})}, ${x.getDate()} ${x.toLocaleDateString('en-US',{month:'long'})}`;
 const ex=S.events.filter(e=>e.date===k).map(e=>`<div class="ses" style="font-size:14px">${esc(e.title)}${e.time?` · ${e.time}`:''}<button class="del" onclick="delEv(${e.id},'${k}')">🗑️</button></div>`).join('');
 sheet(`Add Event — ${lab}`,`${ex}<input class="inp" id="et" placeholder="e.g. Chemistry Lab"><label>Time</label><input class="inp" id="etm" type="time"><label>Type</label><select class="sel" id="ety"><option>Academic</option><option>Exam</option><option>Sports</option><option>Holiday</option><option>Other</option></select><label>Notes</label><textarea class="inp" id="en" rows="3" placeholder="Optional notes..."></textarea><button class="btn big" onclick="saveEv('${k}')">Save Event</button>`)}
function saveEv(k){const t=$('#et').value.trim();if(!t)return $('#et').focus();const n=S.events.filter(e=>e.date===k);if(n.length&&!confirm(`⚠️ This date already has ${n.length} event${n.length>1?'s':''} ("${n[0].title}"${n.length>1?' and more':''}). Add another one anyway?`))return;S.events.push({id:Date.now(),date:k,title:t,time:$('#etm').value,type:$('#ety').value,notes:$('#en').value});save();closeSheet();render()}
function delEv(id,k){S.events=S.events.filter(e=>e.id!==id);save();addEv(k);render()}

/* marks */
function addScore(){sheet('Add Score',`${subSel('ss')}<input class="inp" id="st" placeholder="Title (e.g. UT-1, Periodic-2)"><div class="sr"><input class="inp" id="sv" type="number" min="0" placeholder="Score" style="width:90px;margin:0" oninput="pcUp()"><span>/</span><input class="inp" id="sm" type="number" min="1" value="100" style="width:90px;margin:0" oninput="pcUp()"></div><div class="pc">Percentage<b id="pcv">0%</b></div><button class="btn big" onclick="saveScore()">Add Score</button>`)}
function pcUp(){const v=+$('#sv').value,m=+$('#sm').value;$('#pcv').textContent=(m>0?Math.round(v/m*100):0)+'%'}
function saveScore(){const s=getSub('ss'),v=$('#sv').value,m=+$('#sm').value;if(!s||v===''||!m)return toast('Pick a subject and enter a score');
 S.marks.push({id:Date.now(),sub:s,title:$('#st').value.trim()||'Test',sc:+v,max:m,date:iso(new Date())});save();closeSheet();render()}
function delScore(id){S.marks=S.marks.filter(m=>m.id!==id);save();render()}

/* timer */
function tmGo(){if(tm.run){clearInterval(tm.id);tm.run=false;return render()}
 if(!tm.left){const t=(+$('#tmin').value||0)*60+(+$('#tsec').value||0);if(!t)return toast('Enter minutes or seconds');tm.left=tm.total=t}
 tm.run=true;tm.sub=getSub('tsub')||'General';render();
 tm.id=setInterval(()=>{tm.left--;const c=$('#clk');if(c)c.textContent=fmt(tm.left);if(tm.left<=0)tmDone()},1000)}
function tmDone(){clearInterval(tm.id);tm.run=false;tm.left=0;S.sess.push({id:Date.now(),subj:tm.sub||'General',mins:Math.max(1,Math.round(tm.total/60)),date:iso(new Date())});save();navigator.vibrate&&navigator.vibrate(300);toast('Session complete 🎉');render()}
function tmReset(){clearInterval(tm.id);tm.run=false;tm.left=0;render()}
function delSess(id){S.sess=S.sess.filter(s=>s.id!==id);save();render()}

function ttAdj(k,n){if(k==='P'){const l=S.tt.length+n;if(l<1||l>12)return;if(n>0){S.tt.push(Array(S.ttDays.length).fill(''));S.ttPer.push('Period '+l)}else{S.tt.pop();S.ttPer.pop()}}
 else{const l=S.ttDays.length+n;if(l<1||l>7)return;if(n>0){S.ttDays.push(DAYS[l-1]||'Day '+l);S.tt.forEach(r=>r.push(''))}else{S.ttDays.pop();S.tt.forEach(r=>r.pop())}}save();render()}
/* google auth */
let auth=null;
try{if(window.firebase&&typeof firebaseConfig!=='undefined'){firebase.initializeApp(firebaseConfig);auth=firebase.auth();
 auth.onAuthStateChanged(u=>{S.email=u?u.email:'';if(u&&!S.name)S.name=u.displayName||'';save();gUi()})}}catch(e){console.error(e)}
function gUi(){const b=$('#gbtn'),t=$('#gst');if(b)b.textContent=S.email?'Sign out':'Sign in with Google';if(t)t.textContent=S.email?'Signed in as '+S.email:''}
const MOB=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||matchMedia('(display-mode: standalone)').matches;
const gErr=e=>{if(e&&e.code!=='auth/popup-closed-by-user'&&e.code!=='auth/cancelled-popup-request')toast(e.code==='auth/unauthorized-domain'?'Add nitantjain014.github.io in Firebase > Authorized domains':'Sign-in failed: '+(e.code||e.message))};
if(auth)auth.getRedirectResult().catch(gErr);
function gAuth(){if(!auth)return toast('Google sign-in could not load. Check internet.');if(auth.currentUser)return auth.signOut();
 const p=new firebase.auth.GoogleAuthProvider();
 if(MOB)return auth.signInWithRedirect(p).catch(gErr);
 auth.signInWithPopup(p).catch(e=>{if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment')auth.signInWithRedirect(p).catch(gErr);else gErr(e)})}
/* settings */
function openSettings(){sheet('Settings',`<label>Student Name</label><input class="inp" id="sn" value="${esc(S.name)}"><label>Dark Mode</label><input type="checkbox" id="sd" ${S.dark?'checked':''} style="width:20px;height:20px;display:block;margin:0 auto 8px"><label>Google Account</label><button class="pill" id="gbtn" style="width:100%;background:var(--in)" onclick="gAuth()">${S.email?'Sign out':'Sign in with Google'}</button><p id="gst" style="margin:14px 0;font-size:16px;min-height:22px">${S.email?`Signed in as ${esc(S.email)}`:''}</p><button class="btn big" onclick="saveSet()">Save Settings</button>`)}
function saveSet(){S.name=$('#sn').value.trim();S.dark=$('#sd').checked;save();closeSheet();render()}

render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js?v=3').catch(()=>{});

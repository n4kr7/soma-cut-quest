const KEY='somaCutQuestV2';
const OLDKEY='somaCutQuestV1';
const exercises={
 Push:['Incline Press','Flat Bench Press','Pec Deck / Chest Press','Shoulder Press','Lateral Cable Raise','Triceps Pushdown','Overhead Triceps Extension'],
 Pull:['Lat Pulldown','Cable Row','Rear-Delt Fly / Face Pull','Hammer Curl','Cable Preacher / Preacher Curl'],
 Legs:['Leg Press','Romanian Deadlift','Seated Hamstring Curl','Leg Extension','Calf Raise']
};
const allExercises=[...exercises.Push,...exercises.Pull,...exercises.Legs];
const $=id=>document.getElementById(id);
function today(){return new Date().toISOString().slice(0,10)}
function fresh(){return {xp:0,weight:102.3,weights:[],days:[],gym:[],prs:{}}}
let S=JSON.parse(localStorage.getItem(KEY)||'null');
if(!S){
  const old=JSON.parse(localStorage.getItem(OLDKEY)||'null');
  S=old||fresh();
  if(old){localStorage.setItem(KEY,JSON.stringify(S))}
}
S.gym=S.gym||[];S.prs=S.prs||{};S.weights=S.weights||[];S.days=S.days||[];

function save(){localStorage.setItem(KEY,JSON.stringify(S));render()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.tab,nav button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');$(b.dataset.tab).classList.add('active');
  if(b.dataset.tab==='progress')drawCharts();
});

function currentDay(){return S.days.filter(d=>d.date===today()).at(-1)||{}}
function render(){
 $('xp').textContent=S.xp;
 $('level').textContent=Math.floor(S.xp/250)+1;
 $('currentWeight').textContent=S.weight.toFixed(1);
 $('todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 let d=currentDay();
 $('remaining').textContent=2300-(d.cal||0);
 $('proteinNow').textContent=d.protein||0;
 $('stepsNow').textContent=(d.steps||0).toLocaleString();
 let pct=Math.max(0,Math.min(100,(102.3-S.weight)/2.4*100));$('bossBar').style.width=pct+'%';
 $('weights').innerHTML=S.weights.slice(-10).reverse().map(w=>`<div class='mission'><span>${w.date}</span><strong>${w.value.toFixed(1)} kg</strong></div>`).join('')||'<p>No weigh-ins logged yet.</p>';
 $('workouts').innerHTML=S.gym.slice(-8).reverse().map(g=>`<div class='workoutRow'><span>${g.date.slice(0,10)} · ${g.type}</span><strong>${g.prs||0} PR${(g.prs||0)===1?'':'s'}</strong></div>`).join('')||'<p>No workouts logged yet.</p>';
 let weekAgo=new Date(Date.now()-7*864e5);$('gymWeek').textContent=S.gym.filter(g=>new Date(g.date)>=weekAgo).length;
 renderMissions(d); populateChartExercise(); drawCharts();
}
function renderMissions(d){
 let ms=[['Calories around target',d.cal>0&&Math.abs(d.cal-2300)<=200],['Protein 150g+',d.protein>=150],['8,000+ steps',d.steps>=8000],['Balanced portions',d.balanced],['Honest log',d.honest]];
 $('missions').innerHTML=ms.map(m=>`<div class='mission ${m[1]?'done':''}'><span>${m[1]?'✓':'○'} ${m[0]}</span><strong>${m[1]?'+XP':''}</strong></div>`).join('');
}
function clearDayForm(){
 ['cal','protein','steps','weight'].forEach(id=>$(id).value='');
 ['balanced','honest'].forEach(id=>$(id).checked=false);
 $('dayMsg').textContent='Form cleared. Your saved progress is untouched.';
}
$('newDay').onclick=clearDayForm;
$('saveDay').onclick=()=>{
 let cal=+$('cal').value,protein=+$('protein').value,steps=+$('steps').value,w=+$('weight').value;
 if(!cal&&!protein&&!steps){$('dayMsg').textContent='Enter today’s numbers first.';return}
 let pts=10+(protein>=150?25:0)+(steps>=8000?20:0)+($('balanced').checked?15:0)+($('honest').checked?10:0)+(Math.abs(cal-2300)<=200?10:0);
 let day={date:today(),cal,protein,steps,balanced:$('balanced').checked,honest:$('honest').checked};
 S.days.push(day);S.xp+=pts;
 if(w>=40&&w<=250){S.weight=w;S.weights.push({date:day.date,value:w})}
 $('dayMsg').textContent=`Quest complete: +${pts} XP. ${cal>2500?'Above target today is not failure - return to normal tomorrow.':'Nice work.'}`;
 save();
};

let draftSets={};
function setKey(type,e){return type+'|'+e}
function defaultSets(type,e){const k=setKey(type,e);if(!draftSets[k])draftSets[k]=[{weight:'',reps:''},{weight:'',reps:''},{weight:'',reps:''}];return draftSets[k]}
function buildExercises(){
 let type=$('workout').value;
 $('exerciseList').innerHTML=exercises[type].map((e,i)=>{
   let pr=S.prs[e],sets=defaultSets(type,e);
   return `<div class='exercise' data-ex='${i}'><div class='exerciseTop'><div><strong>${e}</strong><div>${pr?`Best: ${pr.weight} kg × ${pr.reps} <span class='badge'>PR</span>`:'No score yet'}</div></div><button class='addSet' data-add='${i}' type='button'>+ Set</button></div><div class='sets'>${sets.map((s,j)=>setRow(i,j,s)).join('')}</div></div>`
 }).join('');
 document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{let e=exercises[type][+b.dataset.add];defaultSets(type,e).push({weight:'',reps:''});buildExercises()});
 bindSetInputs();
}
function setRow(i,j,s){return `<div class='setRow'><div class='setNo'>Set ${j+1}</div><label>kg<input data-set-ex='${i}' data-set='${j}' data-k='weight' type='number' min='0' step='.5' value='${s.weight}'></label><label>reps<input data-set-ex='${i}' data-set='${j}' data-k='reps' type='number' min='0' value='${s.reps}'></label><button class='removeSet' data-remove-ex='${i}' data-remove='${j}' type='button' aria-label='Remove set'>×</button></div>`}
function bindSetInputs(){
 let type=$('workout').value;
 document.querySelectorAll('[data-set-ex]').forEach(inp=>inp.oninput=()=>{let e=exercises[type][+inp.dataset.setEx];defaultSets(type,e)[+inp.dataset.set][inp.dataset.k]=inp.value});
 document.querySelectorAll('[data-remove-ex]').forEach(b=>b.onclick=()=>{let e=exercises[type][+b.dataset.removeEx],arr=defaultSets(type,e);if(arr.length>1)arr.splice(+b.dataset.remove,1);buildExercises()});
}
$('workout').onchange=buildExercises;
$('saveGym').onclick=()=>{
 let type=$('workout').value,prs=0,logged=0,sessionExercises={};
 exercises[type].forEach(e=>{
   let sets=defaultSets(type,e).map(s=>({weight:+s.weight,reps:+s.reps})).filter(s=>s.weight>0&&s.reps>0);
   if(!sets.length)return;logged++;
   sessionExercises[e]=sets;
   let best=sets.slice().sort((a,b)=>b.weight-a.weight||b.reps-a.reps)[0],old=S.prs[e];
   if(!old||best.weight>old.weight||(best.weight===old.weight&&best.reps>old.reps)){S.prs[e]={weight:best.weight,reps:best.reps};prs++}
 });
 if(!logged){$('gymMsg').textContent='Log at least one exercise set.';return}
 let pts=30+prs*15;S.xp+=pts;S.gym.push({date:new Date().toISOString(),type,prs,exercises:sessionExercises});
 $('gymMsg').textContent=`${type} cleared: +${pts} XP${prs?` · ${prs} new PR${prs>1?'s':''}!`:' · Consistency XP earned.'}`;
 Object.keys(draftSets).filter(k=>k.startsWith(type+'|')).forEach(k=>delete draftSets[k]);
 save();buildExercises();
};

function populateChartExercise(){
 let sel=$('chartExercise'),prev=sel.value;
 let used=allExercises.filter(e=>S.gym.some(g=>g.exercises&&g.exercises[e]));
 let opts=used.length?used:allExercises;
 sel.innerHTML=opts.map(e=>`<option>${e}</option>`).join('');
 if(opts.includes(prev))sel.value=prev;
}
$('chartExercise').onchange=drawCharts;

function lineChart(canvas,points,label,unit){
 const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height,pad=46;c.clearRect(0,0,W,H);c.fillStyle='#0b1326';c.fillRect(0,0,W,H);
 c.strokeStyle='#33415f';c.lineWidth=1;c.beginPath();c.moveTo(pad,20);c.lineTo(pad,H-pad);c.lineTo(W-18,H-pad);c.stroke();
 c.fillStyle='#8f9bb0';c.font='20px system-ui';c.fillText(label,pad,28);
 if(points.length<1){c.fillText('Not enough data yet',pad+20,H/2);return}
 let vals=points.map(p=>p.v),min=Math.min(...vals),max=Math.max(...vals);if(min===max){min-=1;max+=1}else{let m=(max-min)*.15;min-=m;max+=m}
 const x=i=>points.length===1?W/2:pad+i*(W-pad-25)/(points.length-1),y=v=>20+(max-v)*(H-pad-30)/(max-min);
 c.strokeStyle='#8de6b1';c.lineWidth=4;c.beginPath();points.forEach((p,i)=>i?c.lineTo(x(i),y(p.v)):c.moveTo(x(i),y(p.v)));c.stroke();
 points.forEach((p,i)=>{c.fillStyle='#8de6b1';c.beginPath();c.arc(x(i),y(p.v),6,0,Math.PI*2);c.fill()});
 c.fillStyle='#cbd5e1';c.font='16px system-ui';c.fillText(max.toFixed(1)+unit,4,35);c.fillText(min.toFixed(1)+unit,4,H-pad);
}
function strengthPoints(ex){
 return S.gym.filter(g=>g.exercises&&g.exercises[ex]).map(g=>{let sets=g.exercises[ex];let best=sets.slice().sort((a,b)=>b.weight-a.weight||b.reps-a.reps)[0];return {d:g.date.slice(0,10),v:best.weight}});
}
function drawCharts(){
 if(!$('weightChart'))return;
 lineChart($('weightChart'),S.weights.map(w=>({d:w.date,v:w.value})),'Weight trend',' kg');
 let ex=$('chartExercise').value||allExercises[0];lineChart($('strengthChart'),strengthPoints(ex),ex,' kg');
}

function pdfEsc(s){return String(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function pdfText(cmd,x,y,size,text,bold=false){cmd.push(`BT /${bold?'F2':'F1'} ${size} Tf ${x} ${y} Td (${pdfEsc(text)}) Tj ET`)}
function pdfChart(cmd,points,x,y,w,h,title,unit){
 pdfText(cmd,x,y+h+12,11,title,true);cmd.push(`0.75 G ${x} ${y} ${w} ${h} re S`);
 if(!points.length){pdfText(cmd,x+8,y+h/2,9,'No data yet');return}
 let vals=points.map(p=>p.v),min=Math.min(...vals),max=Math.max(...vals);if(min===max){min-=1;max+=1}
 let px=i=>points.length===1?x+w/2:x+8+i*(w-16)/(points.length-1),py=v=>y+8+(v-min)*(h-16)/(max-min);
 cmd.push('0.15 0.55 0.35 RG 1.5 w');for(let i=1;i<points.length;i++)cmd.push(`${px(i-1).toFixed(2)} ${py(points[i-1].v).toFixed(2)} m ${px(i).toFixed(2)} ${py(points[i].v).toFixed(2)} l S`);
 cmd.push('0 G');pdfText(cmd,x+2,y+h-10,7,max.toFixed(1)+unit);pdfText(cmd,x+2,y+3,7,min.toFixed(1)+unit);
}
function makePdf(){
 const pages=[];let c=[],y=810;
 const addPage=()=>{if(c.length)pages.push(c.join('\n'));c=[];y=810};
 const line=(text,size=9,bold=false,indent=42)=>{if(y<45)addPage();pdfText(c,indent,y,size,text,bold);y-=size+5};
 line("Soma's Cut Quest - Progress Report",20,true);line('Generated '+new Date().toLocaleString(),8);y-=4;
 line(`Level ${Math.floor(S.xp/250)+1}   XP: ${S.xp}   Start: 102.3 kg   Current: ${S.weight.toFixed(1)} kg`,11);
 let last=S.days.at(-1);if(last)line(`Latest day: ${last.cal} kcal | ${last.protein} g protein | ${last.steps} steps`,10);
 y-=8;pdfChart(c,S.weights.map(w=>({v:w.value})),42,y-120,510,110,'Weight trend',' kg');y-=150;
 let ex=$('chartExercise').value||allExercises[0];pdfChart(c,strengthPoints(ex),42,y-120,510,110,'Strength trend - '+ex,' kg');y-=150;
 line('Recent weigh-ins',12,true);S.weights.slice(-8).reverse().forEach(w=>line(`${w.date}    ${w.value.toFixed(1)} kg`,9,false,50));
 y-=6;line('Recent workouts',12,true);S.gym.slice(-8).reverse().forEach(g=>line(`${g.date.slice(0,10)}    ${g.type}    ${g.prs||0} PR(s)`,9,false,50));
 y-=6;line('Current personal records',12,true);Object.entries(S.prs).forEach(([e,p])=>line(`${e}: ${p.weight} kg x ${p.reps}`,9,false,50));
 addPage();
 const objs=[];const add=o=>{objs.push(o);return objs.length};
 const font1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const font2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const pageIds=[];const contentIds=[];
 pages.forEach(stream=>{contentIds.push(add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));pageIds.push(add('PENDING'))});
 const pagesId=add('PAGES_PENDING');const catalogId=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
 pageIds.forEach((pid,i)=>objs[pid-1]=`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`);
 objs[pagesId-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
 let pdf='%PDF-1.4\n',offsets=[0];objs.forEach((o,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});let xref=pdf.length;
 pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offsets.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 pdf+=`trailer\n<< /Size ${objs.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return new Blob([pdf],{type:'application/pdf'});
}
$('exportPdf').onclick=()=>{const blob=makePdf(),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Soma-Cut-Quest-Progress.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};

$('resetAll').onclick=()=>{if(confirm('Reset all Cut Quest progress? This cannot be undone.')){localStorage.removeItem(KEY);localStorage.removeItem(OLDKEY);location.reload()}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
buildExercises();render();

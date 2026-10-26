/* Shared chart kit for concepts3: candles, area, multi-line. SVG, responsive, crosshair hover. */
(function(){
const NS='http://www.w3.org/2000/svg';
function nice(min,max,n){const span=max-min||1;const step0=span/n;const mag=Math.pow(10,Math.floor(Math.log10(step0)));const st=[1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=step0);const a=Math.ceil(min/st)*st,t=[];for(let v=a;v<=max+1e-9;v+=st)t.push(+v.toFixed(10));return t}
function fmtUTC(t){const d=new Date(t*1000);return String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0')}
function fmtDay(t){const d=new Date(t*1000);return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()]+' '+d.getUTCDate()}
function mount(el,draw){let w=0;const r=()=>{const nw=el.clientWidth;if(nw&&nw!==w){w=nw;draw(w,el.clientHeight)}};r();new ResizeObserver(r).observe(el);return r}
function tipEl(el,cls){let t=el.querySelector('.ck-tip');if(!t){t=document.createElement('div');t.className='ck-tip '+(cls||'');el.appendChild(t)}return t}
/* CANDLES */
function candles(el,bars,o){o=Object.assign({up:'#2BB673',down:'#E5484D',grid:'rgba(255,255,255,.07)',axis:'rgba(255,255,255,.45)',font:'inherit',fs:11,pad:[14,64,26,4],fmt:v=>v.toLocaleString('en-US',{maximumFractionDigits:2}),levels:[],last:true,hollowUp:false,vol:false,tip:null,ticks:5,bodyW:.62,area:false},o||{});
 mount(el,(W,H)=>{
  const [pt,pr,pb,pl]=o.pad,iw=W-pl-pr,ih=H-pt-pb;
  let lo=Math.min(...bars.map(b=>b[3])),hi=Math.max(...bars.map(b=>b[2]));
  o.levels.forEach(l=>{if(l.v>lo-(hi-lo)*.25&&l.v<hi+(hi-lo)*.25){lo=Math.min(lo,l.v);hi=Math.max(hi,l.v)}});
  const m=(hi-lo)*.06;lo-=m;hi+=m;
  const X=i=>pl+(i+.5)*iw/bars.length,Y=v=>pt+(hi-v)/(hi-lo)*ih,bw=Math.max(1.5,iw/bars.length*o.bodyW);
  let g='';
  nice(lo,hi,o.ticks).forEach(v=>{g+=`<line x1="${pl}" x2="${pl+iw}" y1="${Y(v)}" y2="${Y(v)}" stroke="${o.grid}"/><text x="${W-pr+10}" y="${Y(v)+4}" fill="${o.axis}" font-size="${o.fs}">${o.fmt(v)}</text>`});
  let lastDay=-1,lx=-999;bars.forEach((b,i)=>{const d=new Date(b[0]*1000).getUTCDate();if(d!==lastDay){if(lastDay>=0)g+=`<line x1="${X(i)-iw/bars.length/2}" x2="${X(i)-iw/bars.length/2}" y1="${pt}" y2="${pt+ih}" stroke="${o.grid}"/>`;if(X(i)-lx>54){g+=`<text x="${X(i)}" y="${H-8}" fill="${o.axis}" font-size="${o.fs}">${fmtDay(b[0])}</text>`;lx=X(i)}lastDay=d}});
  let lv='';o.levels.forEach(l=>{const y=Y(l.v);lv+=`<line x1="${pl}" x2="${pl+iw}" y1="${y}" y2="${y}" stroke="${l.c||o.axis}" stroke-dasharray="${l.dash||'3 4'}" opacity=".8"/><text x="${pl+6}" y="${y-5}" fill="${l.c||o.axis}" font-size="${o.fs-1}">${l.label}</text>`});
  let c='';
  if(o.area){const pts=bars.map((b,i)=>`${X(i)},${Y(b[4])}`).join(' ');const id='ga'+Math.random().toString(36).slice(2,7);
   c+=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.area}" stop-opacity=".28"/><stop offset="1" stop-color="${o.area}" stop-opacity="0"/></linearGradient></defs><polygon class="ck-areaf" points="${X(0)},${pt+ih} ${pts} ${X(bars.length-1)},${pt+ih}" fill="url(#${id})"/>`}
  bars.forEach((b,i)=>{const up=b[4]>=b[1],col=up?o.up:o.down,y1=Y(Math.max(b[1],b[4])),y2=Y(Math.min(b[1],b[4])),h=Math.max(1,y2-y1);
   c+=`<g class="ck-c" style="--i:${i}"><line x1="${X(i)}" x2="${X(i)}" y1="${Y(b[2])}" y2="${Y(b[3])}" stroke="${col}" stroke-width="1"/><rect x="${X(i)-bw/2}" y="${y1}" width="${bw}" height="${h}" rx="${Math.min(1.5,bw/4)}" fill="${up&&o.hollowUp?'none':col}" stroke="${col}" stroke-width="${up&&o.hollowUp?1:0}"/></g>`});
  const L=bars[bars.length-1];let lt='';
  if(o.last){const y=Y(L[4]);if(pr<24){lt=`<line x1="${pl}" x2="${pl+iw}" y1="${y}" y2="${y}" stroke="${o.lastC||o.axis}" stroke-dasharray="1 3"/>`}else lt=`<line x1="${pl}" x2="${pl+iw}" y1="${y}" y2="${y}" stroke="${o.lastC||o.axis}" stroke-width="1" stroke-dasharray="1 3"/><rect x="${W-pr+2}" y="${y-10}" width="${pr-4}" height="20" rx="4" fill="${o.lastC||o.axis}"/><text x="${W-pr+8}" y="${y+4}" fill="${o.lastT||'#000'}" font-size="${o.fs}" font-weight="600">${o.fmt(L[4])}</text>`}
  el.innerHTML=`<svg class="ck" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${o.font}" style="display:block;overflow:visible">${g}${lv}${c}${lt}<g class="ck-x" style="opacity:0;pointer-events:none"><line class="vx" y1="${pt}" y2="${pt+ih}" stroke="${o.axis}" stroke-dasharray="2 3"/><line class="hx" x1="${pl}" x2="${pl+iw}" stroke="${o.axis}" stroke-dasharray="2 3"/></g><rect x="${pl}" y="${pt}" width="${iw}" height="${ih}" fill="transparent" class="ck-hit"/></svg>`;
  const svg=el.querySelector('svg'),cx=svg.querySelector('.ck-x'),tip=tipEl(el,o.tipCls);
  svg.querySelector('.ck-hit').addEventListener('pointermove',e=>{const r=svg.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const i=Math.max(0,Math.min(bars.length-1,Math.floor((x-pl)/iw*bars.length)));const b=bars[i];
   cx.style.opacity=1;cx.querySelector('.vx').setAttribute('x1',X(i));cx.querySelector('.vx').setAttribute('x2',X(i));cx.querySelector('.hx').setAttribute('y1',y);cx.querySelector('.hx').setAttribute('y2',y);
   tip.style.opacity=1;tip.innerHTML=(o.tip?o.tip(b):`<b>${fmtDay(b[0])} ${fmtUTC(b[0])} UTC</b><span>O ${o.fmt(b[1])}</span><span>H ${o.fmt(b[2])}</span><span>L ${o.fmt(b[3])}</span><span>C ${o.fmt(b[4])}</span>`);
   const tx=X(i)+14+tip.offsetWidth>W-pr?X(i)-14-tip.offsetWidth:X(i)+14;tip.style.transform=`translate(${tx}px,${pt+6}px)`});
  svg.querySelector('.ck-hit').addEventListener('pointerleave',()=>{cx.style.opacity=0;tip.style.opacity=0});
  if(o.onDraw)o.onDraw(svg);
 })}
/* AREA (equity) */
function area(el,pts,o){o=Object.assign({stroke:'#fff',fill:'#fff',grid:'rgba(255,255,255,.07)',axis:'rgba(255,255,255,.45)',fs:11,pad:[12,60,24,4],fmt:v=>'$'+Math.round(v).toLocaleString('en-US'),base:null,baseLabel:'',ticks:4,font:'inherit',sw:2,labels:null,dots:false,tip:null,step:false},o||{});
 mount(el,(W,H)=>{
  const [pt,pr,pb,pl]=o.pad,iw=W-pl-pr,ih=H-pt-pb,vs=pts.map(p=>p.v);
  let lo=Math.min(...vs,o.base??Infinity,...(o.minS||[])),hi=Math.max(...vs);const m=(hi-lo)*.08;lo-=m;hi+=m;
  const X=i=>pl+i*iw/(pts.length-1),Y=v=>pt+(hi-v)/(hi-lo)*ih;
  let g='';nice(lo,hi,o.ticks).forEach(v=>{g+=`<line x1="${pl}" x2="${pl+iw}" y1="${Y(v)}" y2="${Y(v)}" stroke="${o.grid}"/><text x="${W-pr+10}" y="${Y(v)+4}" fill="${o.axis}" font-size="${o.fs}">${o.fmt(v)}</text>`});
  if(o.labels)o.labels.forEach(([i,t])=>{g+=`<text x="${X(i)}" y="${H-6}" fill="${o.axis}" font-size="${o.fs}" text-anchor="${i==0?'start':i==pts.length-1?'end':'middle'}">${t}</text>`});
  let path='';pts.forEach((p,i)=>{path+=(i?(o.step?`H${X(i)}V${Y(p.v)}`:`L${X(i)},${Y(p.v)}`):`M${X(i)},${Y(p.v)}`)});
  if(o.smooth)path=mono(pts.map((p,i)=>[X(i),Y(p.v)]));let ms='';if(o.minS){const mp=o.step2?o.minS.map((v,i)=>(i?`H${X(i)}V${Y(v)}`:`M${X(i)},${Y(v)}`)).join(''):mono(o.minS.map((v,i)=>[X(i),Y(v)]));ms=`<path class="ck-min" d="${mp}" fill="none" stroke="${o.minC||'#f44'}" stroke-width="1.4" stroke-dasharray="5 4"/>`;if(o.minLabel){const L=o.minS.length-1;ms+=`<text x="${X(L)-6}" y="${Y(o.minS[L])+16}" text-anchor="end" fill="${o.minC}" font-size="${o.fs}">${o.minLabel}</text>`}}
  const id='gq'+Math.random().toString(36).slice(2,7);
  let b='';if(o.base!=null){const y=Y(o.base);b=`<line x1="${pl}" x2="${pl+iw}" y1="${y}" y2="${y}" stroke="${o.baseC||o.axis}" stroke-dasharray="4 4"/><text x="${pl+6}" y="${y-6}" fill="${o.baseC||o.axis}" font-size="${o.fs}">${o.baseLabel}</text>`}
  let d='';if(o.dots)pts.forEach((p,i)=>{d+=`<circle cx="${X(i)}" cy="${Y(p.v)}" r="2.5" fill="${o.dotFill||o.stroke}"/>`});
  el.innerHTML=`<svg class="ck" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${o.font}" style="display:block;overflow:visible"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.fill}" stop-opacity="${o.fo??.32}"/><stop offset="1" stop-color="${o.fill}" stop-opacity="0"/></linearGradient></defs>${g}${b}${ms}<path class="ck-af" d="${path}L${X(pts.length-1)},${pt+ih}L${X(0)},${pt+ih}Z" fill="url(#${id})"/><path class="ck-al" d="${path}" fill="none" stroke="${o.stroke}" stroke-width="${o.sw}" stroke-linejoin="round" stroke-linecap="round"/>${d}<g class="ck-x" style="opacity:0;pointer-events:none"><line class="vx" y1="${pt}" y2="${pt+ih}" stroke="${o.axis}" stroke-dasharray="2 3"/><circle class="pd" r="4.5" fill="${o.stroke}" stroke="${o.ring||'#000'}" stroke-width="2"/></g><rect x="${pl}" y="${pt}" width="${iw}" height="${ih}" fill="transparent" class="ck-hit"/></svg>`;
  const svg=el.querySelector('svg'),cx=svg.querySelector('.ck-x'),tip=tipEl(el,o.tipCls);
  svg.querySelector('.ck-hit').addEventListener('pointermove',e=>{const r=svg.getBoundingClientRect(),x=e.clientX-r.left;const i=Math.max(0,Math.min(pts.length-1,Math.round((x-pl)/iw*(pts.length-1))));const p=pts[i];
   cx.style.opacity=1;cx.querySelector('.vx').setAttribute('x1',X(i));cx.querySelector('.vx').setAttribute('x2',X(i));cx.querySelector('.pd').setAttribute('cx',X(i));cx.querySelector('.pd').setAttribute('cy',Y(p.v));
   tip.style.opacity=1;tip.innerHTML=o.tip?o.tip(p,i):`<b>${o.fmt(p.v)}</b>`;const tx=X(i)+14+tip.offsetWidth>W-pr?X(i)-14-tip.offsetWidth:X(i)+14;tip.style.transform=`translate(${tx}px,${Math.max(0,Y(p.v)-tip.offsetHeight-12)}px)`});
  svg.querySelector('.ck-hit').addEventListener('pointerleave',()=>{cx.style.opacity=0;tip.style.opacity=0});
  if(o.onDraw)o.onDraw(svg);
 })}
/* LINES (normalised % change, head-to-head) */
function lines(el,series,o){o=Object.assign({grid:'rgba(0,0,0,.08)',axis:'rgba(0,0,0,.5)',fs:11,pad:[12,52,26,4],font:'inherit',ticks:5,sw:1.75,tip:null},o||{});
 mount(el,(W,H)=>{
  const [pt,pr,pb,pl]=o.pad,iw=W-pl-pr,ih=H-pt-pb,n=Math.max(...series.map(s=>s.pts.length));
  const all=series.flatMap(s=>s.pts.map(p=>p[1]));let lo=Math.min(...all,0),hi=Math.max(...all,0);const m=(hi-lo)*.08;lo-=m;hi+=m;
  const X=i=>pl+i*iw/(n-1),Y=v=>pt+(hi-v)/(hi-lo)*ih;
  let g='';nice(lo,hi,o.ticks).forEach(v=>{g+=`<line x1="${pl}" x2="${pl+iw}" y1="${Y(v)}" y2="${Y(v)}" stroke="${o.grid}" ${Math.abs(v)<1e-9?'stroke-width="1.25" stroke-opacity="2.2"':''}/><text x="${W-pr+10}" y="${Y(v)+4}" fill="${o.axis}" font-size="${o.fs}">${v>0?'+':''}${v.toFixed(Math.abs(hi-lo)<4?1:0)}%</text>`});
  const ref=series[0].pts;let ld=-1,lx=-999;ref.forEach((p,i)=>{const d=new Date(p[0]*1000).getUTCDate();if(d!==ld){if(ld>=0)g+=`<line x1="${X(i)}" x2="${X(i)}" y1="${pt}" y2="${pt+ih}" stroke="${o.grid}"/>`;if(X(i)-lx>54){g+=`<text x="${X(i)+4}" y="${H-8}" fill="${o.axis}" font-size="${o.fs}">${fmtDay(p[0])}</text>`;lx=X(i)}ld=d}});
  let ls='';series.forEach((s,k)=>{let d='';s.pts.forEach((p,i)=>d+=(i?'L':'M')+X(i)+','+Y(p[1]));ls+=`<path class="ck-ln" data-k="${k}" d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.w||o.sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
   const L=s.pts[s.pts.length-1];ls+=`<circle cx="${X(s.pts.length-1)}" cy="${Y(L[1])}" r="3" fill="${s.color}"/>`});
  el.innerHTML=`<svg class="ck" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${o.font}" style="display:block;overflow:visible">${g}${ls}<g class="ck-x" style="opacity:0;pointer-events:none"><line class="vx" y1="${pt}" y2="${pt+ih}" stroke="${o.axis}" stroke-dasharray="2 3"/>${series.map((s,k)=>`<circle class="pd" data-k="${k}" r="4" fill="${s.color}" stroke="#fff" stroke-width="2"/>`).join('')}</g><rect x="${pl}" y="${pt}" width="${iw}" height="${ih}" fill="transparent" class="ck-hit"/></svg>`;
  const svg=el.querySelector('svg'),cx=svg.querySelector('.ck-x'),tip=tipEl(el,o.tipCls);
  svg.querySelector('.ck-hit').addEventListener('pointermove',e=>{const r=svg.getBoundingClientRect(),x=e.clientX-r.left;const i=Math.max(0,Math.min(n-1,Math.round((x-pl)/iw*(n-1))));
   cx.style.opacity=1;cx.querySelector('.vx').setAttribute('x1',X(i));cx.querySelector('.vx').setAttribute('x2',X(i));
   series.forEach((s,k)=>{const p=s.pts[Math.min(i,s.pts.length-1)];const c=cx.querySelector(`.pd[data-k="${k}"]`);c.setAttribute('cx',X(i));c.setAttribute('cy',Y(p[1]))});
   tip.style.opacity=1;tip.innerHTML=`<b>${fmtDay(ref[i][0])} ${fmtUTC(ref[i][0])} UTC</b>`+series.map(s=>{const p=s.pts[Math.min(i,s.pts.length-1)];return `<span><i style="background:${s.color}"></i>${s.name}<em>${p[1]>0?'+':''}${p[1].toFixed(2)}%</em></span>`}).join('');
   const tx=X(i)+16+tip.offsetWidth>W-pr?X(i)-16-tip.offsetWidth:X(i)+16;tip.style.transform=`translate(${tx}px,${pt+4}px)`});
  svg.querySelector('.ck-hit').addEventListener('pointerleave',()=>{cx.style.opacity=0;tip.style.opacity=0});
  if(o.onDraw)o.onDraw(svg);
 })}
/* helpers */
function mono(P){const n=P.length;if(n<3)return P.map((p,i)=>(i?'L':'M')+p[0]+','+p[1]).join('');const d=[],m=[];for(let i=0;i<n-1;i++)d.push((P[i+1][1]-P[i][1])/(P[i+1][0]-P[i][0]||1));m[0]=d[0];m[n-1]=d[n-2];for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;
 for(let i=0;i<n-1;i++){if(d[i]==0){m[i]=m[i+1]=0;continue}const a=m[i]/d[i],b=m[i+1]/d[i],h=a*a+b*b;if(h>9){const t=3/Math.sqrt(h);m[i]=t*a*d[i];m[i+1]=t*b*d[i]}}
 let s='M'+P[0][0]+','+P[0][1];for(let i=0;i<n-1;i++){const h=(P[i+1][0]-P[i][0])/3;s+=`C${P[i][0]+h},${P[i][1]+m[i]*h} ${P[i+1][0]-h},${P[i+1][1]-m[i+1]*h} ${P[i+1][0]},${P[i+1][1]}`}return s}
function norm(bars){const b0=bars[0][4];return bars.map(b=>[b[0],(b[4]/b0-1)*100])}
function cd(ep){let s=Math.max(0,Math.floor(ep-Date.now()/1000));const d=Math.floor(s/86400);s-=d*86400;const h=Math.floor(s/3600);s-=h*3600;const m=Math.floor(s/60);return {d,h,m,s:s-m*60}}
function money(v,sign){const a=Math.abs(v);const t='$'+a.toLocaleString('en-US',{maximumFractionDigits:0});return (v<0?'−':(sign?'+':''))+t}
function utc(){const d=new Date();return String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0')}
function et(){return new Date().toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false})}
function andList(a){return a.length>1?a.slice(0,-1).join(', ')+' and '+a[a.length-1]:a[0]||''}
function biasLine(assets,name,sep){sep=sep||', ';const g=b=>assets.filter(a=>a.bias==b).map(a=>name(a.key));const P=[];const lo=g('BEARISH'),hi=g('BULLISH'),fl=g('NEUTRAL');
 if(lo.length)P.push(andList(lo)+(lo.length>1?' lean':' leans')+' lower');if(hi.length)P.push(andList(hi)+(hi.length>1?' lean':' leans')+' higher');if(fl.length)P.push(andList(fl)+(fl.length>1?' are':' is')+' flat');
 const t=P.join(sep);return t?t[0].toUpperCase()+t.slice(1)+'.':''}
function evt(e){return e.event.replace(/\s*\(time not verified\)/i,'').replace(/[,;]\s*time not verified/i,'').replace(/\s*\(\s*\)/,'').replace(/;\s*$/,'').trim()}
window.CK={andList,biasLine,evt,candles,area,lines,norm,cd,money,utc,et,fmtUTC,fmtDay,nice};
})();

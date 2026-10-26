/* Cards finance dashboard: renders window.D (built from /workspace/finance) with the Desk "Lucid Silver" motion kit. */
(function(){
const _cs=getComputedStyle(document.documentElement),T=new Proxy({},{get:(o,k)=>_cs.getPropertyValue('--'+k).trim()});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const set=(s,h)=>{const e=$(s);if(e)e.innerHTML=h;return e};
const mob=matchMedia('(max-width:900px)').matches,fine=matchMedia('(pointer:fine)').matches,V=window.V||{};
gsap.registerPlugin(ScrollTrigger);
const n2=v=>Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const n0=v=>Math.round(Math.abs(v)).toLocaleString('en-US');
const U=v=>(v<0?'−':'')+'$'+n2(v),E=v=>(v<0?'−':'')+'€'+n2(v),U0=v=>(v<0?'−':'')+'$'+n0(v),E0=v=>(v<0?'−':'')+'€'+n0(v);
const P=v=>({GBP:'£',EUR:'€',USD:'$'}[v]||'');
const O=D.okta,M=D.mt,C=D.combined,R=D.rates;
/* header */
function clock(){set('#clk',CK.utc()+' UTC')}clock();setInterval(clock,15000);
set('#asof',`Balances as of ${D.asOf} · rates ECB ${D.ecbDate} · page built ${D.built}`);
set('#pills',`<span class="pill">OKTA <b>USD</b></span><span class="pill">MT BANK <b>EUR</b></span><span class="pill">${D.month.label.toUpperCase()}</span>`);
/* combined */
set('#goh',`<span class="ln"><span class="hi num" id="cusd">${U0(C.user.USD)}</span></span><small class="num">${E0(C.user.EUR)}</small>`);
set('#gop',`Okta plus MT Bank on your own running totals. MT Bank at 1 EUR = ${R.EUR_USD} USD, Okta at 1 USD = ${R.USD_EUR} EUR (ECB ${D.ecbDate}).`);
set('#rings',[[U(C.corr.USD),'Corrected USD'],[E(C.corr.EUR),'Corrected EUR'],[U(C.corr.USD-C.user.USD),'Difference']].map(x=>`<div><b class="num">${x[0]}</b><span>${x[1]}</span></div>`).join(''));
/* cards */
function cardTile(k,B,F,F0,dk){const t=D.month,w=D.week;
 set(`#${k}c`,'Your totals');set(`#${k}b`,`<span id="${k}roll">${F(B.user_basis)}</span>`);
 set(`#${k}s`,`Corrected <b>${F(B.corrected)}</b> · maths fixed, £ at 1:1 ${F(B.arithmetic_fixed_1to1)}`);
 set(`#${k}m`,[[`${t.short} dated spend`,F(t[dk])],['This week',F(w[dk])],['Corrected gap',F(B.corrected-B.user_basis)]].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join(''));
 set(`#${k}amt`,F0(B.user_basis));set(`#${k}sub`,`YOUR TOTALS<br>CORR. ${F0(B.corrected)}`)}
cardTile('ok',O,U,U0,'okta');cardTile('mt',M,E,E0,'mt');
/* spending */
set('#sps',`Dated spends only · weeks Mon–Sun · UTC · ${D.undated} older statement lines have no date`);
set('#trl',`${D.daily.length} days · ${D.daily[0].lab} – ${D.daily[D.daily.length-1].lab} Oct · hover`);
const tr=D.daily.map(d=>({v:d.cum,d}));if(tr.length==1)tr.unshift({v:0,d:{lab:'start',usd:0,n:0,okta:0,mt:0,cum:0}});
function glow(svg,sel,col,w,blur,op){const p=svg.querySelector(sel);if(!p)return;const id='gl'+Math.random().toString(36).slice(2,7);const defs=svg.querySelector('defs');
 defs.insertAdjacentHTML('beforeend',`<filter id="${id}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="${blur}"/></filter>`);
 const g=p.cloneNode();g.setAttribute('stroke',col);g.setAttribute('stroke-width',w);g.setAttribute('opacity',op);g.setAttribute('filter',`url(#${id})`);g.classList.remove('ck-al');p.parentNode.insertBefore(g,p);return g}
function drawTr(){const el=$('#trend');el.innerHTML='';
 CK.area(el,tr,{stroke:T.t1,fill:T.sil,fo:+T.eqfo||.3,grid:T.grid,axis:T.t3,font:T.fb.replace(/'/g,''),fs:11,smooth:true,dots:true,ring:T.bg,pad:[16,72,26,4],sw:2,ticks:4,fmt:v=>'$'+Math.round(v).toLocaleString('en-US'),
  labels:tr.map((p,i)=>[i,p.d.lab]),
  tip:p=>`<b>${U(p.v)} so far</b><span>${p.d.lab} Oct · ${U(p.d.usd)} that day</span><span class="o">${p.d.n} spend${p.d.n==1?'':'s'} · Okta ${U(p.d.okta)} · MT ${E(p.d.mt)}</span>`,
  onDraw:svg=>{const p=svg.querySelector('.ck-al'),g=glow(svg,'.ck-al',T.t1,6,6,.35),L=p.getTotalLength();[p,g].forEach(x=>{x.style.strokeDasharray=L;x.style.strokeDashoffset=L;gsap.to(x,{strokeDashoffset:0,duration:2,ease:'power3.inOut',delay:.3})});gsap.from(svg.querySelector('.ck-af'),{opacity:0,duration:1.4,delay:.9})}})}
set('#wkrow',[['Today · '+D.today.label,D.today],['This week · '+D.week.label,D.week],['Last week · '+D.lastWeek.label,D.lastWeek],['This month · '+D.month.short,D.month]].map(x=>`<div><span>${x[0]}</span><b>${U(x[1].okta)} · ${E(x[1].mt)}</b><small>${x[1].n} spend${x[1].n==1?'':'s'} · ≈ ${U(x[1].usd)} combined</small></div>`).join(''));
/* month vs last month */
const m=D.month,pm=D.prevMonth;
set('#moc',m.label);set('#mob',U(m.usd));
set('#mos',`<b>${U(m.okta)}</b> on Okta · <b>${E(m.mt)}</b> on MT Bank · ${m.n} dated spends (USD equivalent at ${R.EUR_USD})`);
const mx=Math.max(m.usd,pm.usd,1);
const wmx=Math.max(D.week.usd,D.lastWeek.usd,1);
set('#cmp',[[m.label.split(' ')[0],m,mx],[pm.label.split(' ')[0],pm,mx],['This week',D.week,wmx],['Last week',D.lastWeek,wmx]].map(([l,x,mm],i)=>`<div class="r${i==2?' sep':''}"><span>${l}</span>${x.n?`<div class="bar"><i style="width:${x.usd/mm*100}%"></i></div><b>${U(x.usd)}</b>`:`<div class="bar"></div><span class="np">No dated spends</span>`}</div>`).join(''));
set('#mon',pm.n?'':`Nothing dated is logged for ${pm.label}. Dating only began on ${+D.firstDated.slice(8)} ${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+D.firstDated.slice(5,7)]}; the ${D.undated} statement lines before that have no dates, so they can’t be split by month.`);
/* categories */
let ck='current';
function drawCats(){const L=D.cats[ck],mx=Math.max(...L.map(c=>c.eur),1);
 set('#cats',`<div class="cr h"><span>Category</span><span class="bar" style="background:none"></span><span class="n">Okta</span><span class="n">MT Bank</span><span class="n c">Both · EUR</span></div>`+L.map(c=>`<div class="cr"><span>${c.label}</span><div class="bar"><i style="width:${c.eur/mx*100}%"></i></div><span class="n ${c.okta?'':'z'}">${c.okta?U(c.okta):'—'}</span><span class="n m ${c.mt?'':'z'}">${c.mt?E(c.mt):'—'}</span><span class="n c">${E(c.eur)}</span></div>`).join(''));
 gsap.from('#cats .bar i',{scaleX:0,transformOrigin:'0 50%',duration:1.1,stagger:.05,ease:'expo.out'})}
drawCats();
set('#catn',`Corrected amounts in each card’s currency. “Both” converts Okta at 1 USD = ${R.USD_EUR} EUR. Current statements plus live logs; all lines adds the earlier MT Bank statement.`);
const cf=$('#cf');cf.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;ck=b.dataset.k;[...cf.querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x==b));drawCats();ScrollTrigger.refresh()});
/* transactions */
set('#acs',`${D.dated.length} dated spends · newest first · times UTC`);
const F=c=>c=='okta'?U:E;
set('#feed',D.dated.map(t=>`<div class="it"><div class="av">${t.card=='okta'?'OK':'MT'}</div><div class="a">${t.note}<small>${t.when} · ${t.cat}</small></div><div class="orig">${P(t.oc)}${t.orig.toFixed(t.orig%1?2:0)} ${t.oc}<small>at ${t.rate} → ${t.card=='okta'?'USD':'EUR'}</small></div><div class="p">${F(t.card)(-t.amt)}</div></div>`).join('')+`<div class="more">Plus ${D.undated} undated lines from your 22 Oct statement (in ledger.csv, not shown here).</div>`);
set('#flc',D.flags.length+' open');set('#flags',D.flags.map(f=>`<div class="h">${f}</div>`).join(''));
/* rates */
set('#rts','ECB reference rates via Frankfurter · cross-checked with open.er-api.com');set('#rtc','ECB '+D.ecbDate);
const kv=[['GBP → USD',R.GBP_USD],['GBP → EUR',R.GBP_EUR],['EUR → USD',R.EUR_USD],['USD → EUR',R.USD_EUR],['Source',`Frankfurter API (ECB) <small>${D.ecbDate}</small>`],['Fetched',D.fetched]];
if(D.checked)kv.push(['Last re-checked',D.checked+' <small>same fix</small>']);
if(D.cross)kv.push(['Cross-check',`${D.cross.GBP_USD?'GBP→USD '+D.cross.GBP_USD:''}${D.cross.GBP_EUR?' · GBP→EUR '+D.cross.GBP_EUR:''} <small>open.er-api · ${D.cross.at||''}</small>`]);
set('#rkv',kv.map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join(''));
set('#upt',D.asOfTime+' <span style="font-size:.45em">UTC</span>');set('#ups',`${D.asOfDay} · last spend logged · page built ${D.built}`);
set('#meth',`<p><b>Your totals</b> are your own last subtotal minus the lines after it, with £ counted 1:1, as you wrote them.</p><p><b>Corrected</b> re-adds every line exactly and converts £/€ at the rate on the day. Each dated spend keeps the rate recorded in the ledger.</p>`);
set('#srcs',`Sources: /workspace/finance ledger.csv (${D.lines} lines) · balances.json · rates.json · Frankfurter/ECB · open.er-api.com`);
/* ---------- motion (Desk) ---------- */
const lenis=new Lenis({lerp:.09,smoothWheel:true});window.lenis=lenis;function raf(t){lenis.raf(t);requestAnimationFrame(raf)}requestAnimationFrame(raf);lenis.on('scroll',ScrollTrigger.update);
$$('.tabs a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();lenis.scrollTo(a.getAttribute('href'),{offset:-96,duration:1.3})}));
['overview','spending','activity','rates'].forEach(id=>$('#'+id)&&ScrollTrigger.create({trigger:'#'+id,start:'top 50%',end:()=>'+='+innerHeight,onToggle:s=>s.isActive&&$$('.tabs a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')=='#'+id))}));
const tabs=$('.tabs');if(tabs){tabs.insertAdjacentHTML('beforeend','<i class="tbi"></i>');const mv=()=>{const on=tabs.querySelector('a.on'),i=tabs.querySelector('.tbi');if(on)gsap.to(i,{x:on.offsetLeft,width:on.offsetWidth,duration:.6,ease:'expo.out'})};new MutationObserver(mv).observe(tabs,{subtree:true,attributes:true,attributeFilter:['class']});setTimeout(mv,50)}
gsap.set('.tile',{opacity:0,y:36,scale:.985});
ScrollTrigger.batch('.tile',{start:'top 94%',once:true,onEnter:b=>gsap.to(b,{opacity:1,y:0,scale:1,duration:1.1,ease:'expo.out',stagger:.08,overwrite:true,clearProps:'transform'})});
$$('.sec h2').forEach(h=>gsap.from(h,{yPercent:110,opacity:0,duration:1,ease:'expo.out',scrollTrigger:{trigger:h,start:'top 92%'}}));
if(fine){$$('.t').forEach(t=>t.addEventListener('pointermove',e=>{const r=t.getBoundingClientRect();t.style.setProperty('--mx',(e.clientX-r.left)+'px');t.style.setProperty('--my',(e.clientY-r.top)+'px')}))}
$$('.card').forEach((card,i)=>{const host=card.parentElement;
 gsap.to(card,{y:-6,rotateZ:(V.cardRot||0)*(i?-1:1),duration:3.2+i*.4,ease:'sine.inOut',yoyo:true,repeat:-1});
 host.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.setProperty('--gx',(x+.5)*100+'%');card.style.setProperty('--gy',(y+.5)*100+'%');gsap.to(card,{rotateY:x*16,rotateX:-y*14,transformPerspective:900,duration:.6,ease:'power3.out'})});
 host.addEventListener('pointerleave',()=>gsap.to(card,{rotateY:0,rotateX:0,duration:1,ease:'expo.out'}))});
document.fonts.ready.then(()=>{drawTr();
 const h=$('#goh');if(h)gsap.from(h.querySelectorAll('.ln>span'),{yPercent:115,duration:1.2,ease:'expo.out',delay:.15});
 const roll=(el,v,fmt,dl,du)=>{if(!el)return;const o={v:0};gsap.to(o,{v,duration:du||1.8,delay:dl||0,ease:'expo.out',onUpdate:()=>el.textContent=fmt(o.v),onComplete:()=>el.textContent=fmt(v)})};
 roll($('#okroll'),O.user_basis,U,.3,2.2);roll($('#mtroll'),M.user_basis,E,.4,2.2);roll($('#cusd'),C.user.USD,U0,.2,2.2);
 roll($('#okamt'),O.user_basis,U0,.6);roll($('#mtamt'),M.user_basis,E0,.7);
 $$('.feed .it').forEach(it=>gsap.from(it,{opacity:0,x:-24,duration:.8,ease:'expo.out',scrollTrigger:{trigger:it,start:'top 96%'}}));
});
window.__still=()=>{const vl=$('.veil');if(vl){vl.style.position='absolute';vl.style.height=document.documentElement.scrollHeight+'px'}window.__waveFull&&window.__waveFull();$$('.tile,.feed .it').forEach(t=>{t.style.opacity=1;t.style.transform='none'});
 [['#okroll',U(O.user_basis)],['#mtroll',E(M.user_basis)],['#cusd',U0(C.user.USD)],['#okamt',U0(O.user_basis)],['#mtamt',E0(M.user_basis)]].forEach(([s,v])=>{const e=$(s);if(e)e.textContent=v})};
})();

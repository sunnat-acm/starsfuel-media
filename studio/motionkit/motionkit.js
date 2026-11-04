/* MotionKit — reusable motion for code-rendered ads (deterministic: everything is a function of t).
   MK.ease.*                      easing
   MK.captions(el, words, t, o)   word-by-word kinetic captions synced to voice
   MK.tr.<name>(A, B, p, o)       scene transitions between two layers (p 0..1); returns {shake, flash}
   MK.shake(el, amt, t)           camera shake
*/
(function(){
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), lin=(x,a,b)=>cl((x-a)/(b-a)), mix=(a,b,k)=>a+(b-a)*k;
const ease={
 out:x=>1-Math.pow(1-x,3), in:x=>x*x*x, io:x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2,
 back:x=>{const c=1.9;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)},
 expo:x=>x>=1?1:1-Math.pow(2,-10*x),
 elastic:x=>x<=0?0:x>=1?1:Math.pow(2,-10*x)*Math.sin((x*10-.75)*2*Math.PI/3)+1
};
function rnd(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
function reset(el){if(!el)return;el.style.transform='';el.style.filter='';el.style.clipPath='';el.style.opacity='';el.style.visibility=''}

/* ---------- CAPTIONS ----------
 words: [{text, t0, t1, key}]  (key=true -> accent highlight)
 o: {maxChars:16, lines:2, accent:'#A6D06A', font:92, keyText:'#0d1a07', y (top px), upper:true}
 Pages of up to `lines` lines; a page shows from its first word t0 until the next page starts.
 Each word pops in at t0 (scale .55->1 back-ease, rise 30px); active word = brighter + slightly bigger; key words get a pill. */
function paginate(words,o){
 const pages=[];let page=[],line=[],len=0;
 const push=()=>{if(line.length)page.push(line);line=[];len=0};
 words.forEach((w,i)=>{
  const L=w.text.length;
  if(len&&len+1+L>o.maxChars){push();if(page.length>=o.lines){pages.push(page);page=[]}}
  line.push(w);len+=(len?1:0)+L;
  if(w.brk){push();pages.push(page);page=[]}
 });
 push();if(page.length)pages.push(page);return pages.filter(p=>p.length);
}
function captions(el,words,t,o={}){
 o=Object.assign({maxChars:16,lines:2,accent:'#A6D06A',font:92,keyText:'#0d1a07',upper:true,y:1320},o);
 if(!el._pages||el._src!==words){el._src=words;el._pages=paginate(words,o);el._built=-1}
 const pages=el._pages;let pi=-1;
 for(let i=0;i<pages.length;i++){if(t>=pages[i][0][0].t0-0.02)pi=i}
 const last=pages[pages.length-1];const lastW=last[last.length-1][last[last.length-1].length-1];
 if(pi<0||t>lastW.t1+0.6){el.innerHTML='';el._built=-1;return}
 if(el._built!==pi){
  el._built=pi;
  el.innerHTML=pages[pi].map(line=>`<div class="mk-line">${line.map(w=>`<span class="mk-w${w.key?' mk-key':''}">${o.upper?w.text.toUpperCase():w.text}</span>`).join(' ')}</div>`).join('');
  el.style.cssText=`position:absolute;left:40px;right:40px;top:${o.y}px;text-align:center;font-family:I,sans-serif;font-weight:900;font-size:${o.font}px;line-height:1.08;letter-spacing:-.02em;color:#fff`;
  el.querySelectorAll('.mk-w').forEach(s=>{s.style.cssText='display:inline-block;padding:0 .12em;border-radius:.22em;text-shadow:0 6px 18px rgba(0,0,0,.6),0 0 2px rgba(0,0,0,.8);transform-origin:50% 80%'});
 }
 const spans=el.querySelectorAll('.mk-w');let k=0;
 pages[pi].forEach(line=>line.forEach(w=>{
  const s=spans[k++];const a=lin(t,w.t0-0.04,w.t0+0.14);const on=t>=w.t0&&t<w.t1+0.05;
  s.style.opacity=a<=0?0:1;
  s.style.transform=`translateY(${30*(1-ease.out(a))}px) scale(${mix(.55,1,ease.back(a))*(on?1.08:1)})`;
  if(w.key){s.style.background=a>0?o.accent:'transparent';s.style.color=o.keyText;s.style.textShadow='none'}
  else s.style.color=on?o.accent:'#fff';
 }));
}
/* turn per-line voice timing into word timing: tokens [display, spoken, key], line t0..t1 (speech start/end).
   Spoken length (chars) is the weight; tokens with empty spoken text show together with the next word. */
function timeWords(tokens,t0,t1){
 const W=tokens.map(x=>Math.max(1,(x[1]||'').replace(/[^\p{L}\p{N}]/gu,'').length+1));
 const tot=W.reduce((a,b)=>a+b,0);let acc=t0;const out=[];
 tokens.forEach((x,i)=>{const d=(t1-t0)*W[i]/tot;const s=x[1]?acc:acc;out.push({text:x[0],t0:s,t1:s+d,key:!!x[2]});if(x[1])acc+=d});
 return out;
}

/* ---------- TRANSITIONS (A = outgoing layer, B = incoming) ---------- */
const tr={
 cut(A,B,p){A.style.visibility=p<.5?'visible':'hidden';B.style.visibility=p>=.5?'visible':'hidden';return{shake:0,flash:0}},
 whip(A,B,p,o={}){const d=o.dir||1,W=1080,k=ease.io(p),bl=Math.sin(p*Math.PI)*40;
  A.style.visibility=p<1?'visible':'hidden';B.style.visibility='visible';
  A.style.transform=`translateX(${-d*k*W}px) skewX(${-d*bl*.3}deg)`;A.style.filter=`blur(${bl}px)`;
  B.style.transform=`translateX(${d*(1-k)*W}px) skewX(${-d*bl*.3}deg)`;B.style.filter=`blur(${bl}px)`;
  return{shake:p>.85?8:0,flash:0}},
 zoomBlur(A,B,p){const k=ease.io(p),bl=Math.sin(p*Math.PI)*28;
  A.style.visibility=p<.55?'visible':'hidden';B.style.visibility=p>=.45?'visible':'hidden';
  A.style.transform=`scale(${1+k*1.4})`;A.style.filter=`blur(${bl}px) brightness(${1+k})`;A.style.opacity=1-lin(p,.35,.55);
  B.style.transform=`scale(${mix(.45,1,ease.out(lin(p,.45,1)))})`;B.style.filter=`blur(${bl}px)`;B.style.opacity=lin(p,.45,.6);
  return{shake:0,flash:Math.sin(p*Math.PI)*.35}},
 glitch(A,B,p,o={}){const f=Math.floor(p*14),j=(rnd(f+(o.seed||0))-.5),show=p<.5?A:B,hide=p<.5?B:A;
  hide.style.visibility='hidden';show.style.visibility='visible';
  const amt=Math.sin(p*Math.PI);const y0=Math.floor(rnd(f*3.1)*80),h=10+Math.floor(rnd(f*7.7)*25);
  show.style.transform=`translateX(${j*90*amt}px) skewX(${j*14*amt}deg)`;
  show.style.filter=`drop-shadow(${-14*amt}px 0 rgba(255,30,80,.9)) drop-shadow(${14*amt}px 0 rgba(30,230,255,.9)) contrast(${1+amt*.4})`;
  show.style.clipPath=amt>.2&&rnd(f*5.3)>.4?`polygon(0 0,100% 0,100% ${y0}%,${(j+.5)*20}% ${y0}%,${(j+.5)*20}% ${y0+h}%,100% ${y0+h}%,100% 100%,0 100%)`:'';
  return{shake:amt*18,flash:0}},
 liquid(A,B,p,o={}){const cx=o.x??540,cy=o.y??960,R=ease.io(p)*2300,N=56,pts=[];
  for(let i=0;i<N;i++){const a=i/N*2*Math.PI;const r=R*(1+.07*Math.sin(5*a+p*9)+.05*Math.sin(3*a-p*6));pts.push(`${cx+r*Math.cos(a)}px ${cy+r*Math.sin(a)}px`)}
  A.style.visibility=p<1?'visible':'hidden';B.style.visibility='visible';
  A.style.transform=`scale(${1+p*.08})`;A.style.filter=`brightness(${1-p*.4})`;
  B.style.clipPath=p<1?`polygon(${pts.join(',')})`:'';B.style.transform=`scale(${mix(1.15,1,ease.out(p))})`;
  return{shake:0,flash:0}},
 mask(A,B,p){const k=ease.io(p)*140;A.style.visibility='visible';B.style.visibility='visible';
  B.style.clipPath=p<1?`polygon(0 ${100-k+20}%,100% ${100-k}%,100% 100%,0 100%)`:'';
  B.style.transform=`translateY(${(1-ease.out(p))*80}px)`;A.style.transform=`translateY(${-ease.in(p)*120}px)`;
  return{shake:0,flash:0}},
 slam(A,B,p){const k=ease.back(lin(p,0,1));A.style.visibility=p<.25?'visible':'hidden';B.style.visibility=p>=.15?'visible':'hidden';
  B.style.transform=`scale(${mix(2.2,1,k)})`;B.style.opacity=lin(p,.15,.35);B.style.filter=`blur(${(1-lin(p,.15,.5))*20}px)`;
  return{shake:p>.45&&p<.8?30*(1-lin(p,.45,.8)):0,flash:p>.4?.5*(1-lin(p,.4,.9)):0}}
};
function shake(el,amt,t){const f=Math.floor(t*60);el.style.transform=amt?`translate(${(rnd(f)-.5)*amt}px,${(rnd(f+9)-.5)*amt}px)`:''}
window.MK={ease,captions,timeWords,tr,shake,reset,rnd,cl,lin,mix};
})();

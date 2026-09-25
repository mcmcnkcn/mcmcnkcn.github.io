import {absolutePath} from './logo-morph.js';
// 「雲の上から、こんにちは」: 看板が先に着地して名前を読ませ、その裏から (＞ω＜) の猫が顔を出す。
// ゲーム一覧は猫が上がり始めたところで出し始め、再生後はまぶたで時々まばたきする。
// 初回は基本の登場 (peek)、2回目以降は前回と違う登場のしかたを選ぶ。 options.variant で指定もできる。
export const VARIANTS=['peek','wink','sneeze','hop','kururin'];
export function createLogoIntro(logo, effects, options={}){
const NS='http://www.w3.org/2000/svg';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const prog=(t,a,b)=>clamp((t-a)/(b-a));
const mix=(a,b,p)=>a+(b-a)*p;
const easeOut=x=>1-(1-x)**3;
const back=(x,k=1.9)=>1+(k+1)*(x-1)**3+k*(x-1)**2;
const spring=(dt,w=16,z=5)=>dt<=0?0:1-Math.exp(-z*dt)*Math.cos(w*dt);
const wobble=(dt,amp,w=13,z=4.5)=>dt<=0?0:amp*Math.exp(-z*dt)*Math.sin(w*dt);
const el=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);parent?.append(e);return e};
const $=s=>logo.querySelector(s),$$=s=>[...logo.querySelectorAll(s)];

// 動かす要素は外側の <g> で包み、元の transform 属性は触らない
function layer(node,pivot='center'){
  const g=el('g',{});node.before(g);g.append(node);
  const b=g.getBBox();
  return {g,x:b.x+b.width/2,y:b.y+b.height*(pivot==='bottom'?1:pivot==='top'?0:.5)};
}
function set(l,{x=0,y=0,sx=1,sy=1,r=0,o=1}={}){
  l.g.setAttribute('transform',`translate(${x} ${y}) translate(${l.x} ${l.y}) rotate(${r}) scale(${sx} ${sy}) translate(${-l.x} ${-l.y})`);
  l.g.style.opacity=o;
}

let variant=options.variant;
if(!VARIANTS.includes(variant)){
  let visits=0,last='';
  try{visits=+(localStorage.getItem('logo-intro-visits')||0);last=localStorage.getItem('logo-intro-last')||'';localStorage.setItem('logo-intro-visits',visits+1)}catch{}
  const others=VARIANTS.filter(v=>v!==last);
  variant=visits===0?'peek':others[Math.floor(Math.random()*others.length)];
  try{localStorage.setItem('logo-intro-last',variant)}catch{}
}

// 効果レイヤーは、このイントロが作る要素だけにする
effects.replaceChildren();

// ---- 猫: 看板の裏に隠れる舞台と、輪郭の変形 ----
const mascot=$('#mascot');
const defs=logo.querySelector('defs')||logo.insertBefore(el('defs',{}),logo.firstChild);
const peek=el('clipPath',{id:'intro-peek',clipPathUnits:'userSpaceOnUse'},defs);
el('rect',{x:-1000,y:-1000,width:4000,height:1725},peek); // artwork座標で y<725 (看板の中ほど) まで
const stage=el('g',{'clip-path':'url(#intro-peek)'});mascot.before(stage);stage.append(mascot);
const cat=layer(mascot,'bottom');
const BODY={top:134,bottom:710,cx:778};
const warpWith=k=>(x,y)=>{
  const u=clamp((y-BODY.top)/(BODY.bottom-BODY.top));
  return [BODY.cx+(x-BODY.cx)*(1+k*(.2+.8*u*u)),BODY.bottom-(BODY.bottom-y)*(1-k*.85)];
};
const bodyPaths=$$('#mascot-base > path').map(node=>({node,d:node.getAttribute('d'),segs:absolutePath(node.getAttribute('d'))}));
function warpBody(k,cheek=0){
  if(Math.abs(k)<1e-4&&Math.abs(cheek)<1e-4){bodyPaths.forEach(b=>b.node.setAttribute('d',b.d));return warpWith(0)}
  const base=warpWith(k);
  // ほっぺ: 耳と額は動かさず、顔の下半分だけ横に膨らませる (Codex版の変形を移植)
  const w=(x,y)=>{const [bx,by]=base(x,y),v=clamp((y-345)/210),side=(x-785)/290;return [bx+side*52*v*cheek,by+18*v*cheek]};
  bodyPaths.forEach(b=>b.node.setAttribute('d',b.segs.map(([c,...v])=>{
    const out=[];for(let j=0;j<v.length;j+=2)out.push(...w(v[j],v[j+1]).map(n=>n.toFixed(2)));return c+out.join(' ');
  }).join('')));
  return w;
}
const face=layer($('#face')),ribbonL=layer($('#ornament-left'),'top'),ribbonR=layer($('#ornament-right'),'top');
const anchors=[[face,805,421],[ribbonL,612,322],[ribbonR,1027,408]];
// 紙垂: 根元を固定し、先端ほど大きくしならせる (Codex版の変形を移植)
const streamerLayers=['left','right'].map(side=>layer($('#ornament-'+side+'-streamers'),'top'));
const streamerPaths=$$('#ornament-left-streamers > path, #ornament-right-streamers > path').map(node=>({node,d:node.getAttribute('d'),segs:absolutePath(node.getAttribute('d')),box:node.getBBox()}));
function waveStreamers(strengthAt){
  streamerPaths.forEach((p,i)=>{
    const st=strengthAt(i);
    if(Math.abs(st)<1e-4){p.node.setAttribute('d',p.d);return}
    const dir=i<4?1:-1;
    p.node.setAttribute('d',p.segs.map(([c,...v])=>{const out=[];for(let j=0;j<v.length;j+=2){const u=clamp((v[j+1]-p.box.y)/p.box.height);out.push((v[j]+dir*42*u*u*st).toFixed(2),(v[j+1]+10*u*u*st).toFixed(2))}return c+out.join(' ')}).join(''));
  });
}

// ---- 目: (＞ω＜) と、まぶたで開閉する目 ----
// 元の目は顔ごと傾いているので、まぶたの線の角度を測り、その傾いた座標系で「＞＜」とまぶたを扱う
const eyes=['left','right'].map(side=>{
  const group=$('#eye-'+side),pupil=group.querySelector(':scope > path');
  const lidPaths=[...$('#eye-'+side+'-lines').querySelectorAll('path')];
  const lines=layer($('#eye-'+side+'-lines'));
  const toEye=node=>{const m=group.getCTM().inverse().multiply(node.getCTM());return p=>new DOMPoint(p.x,p.y).matrixTransform(m)};
  const main=lidPaths[0],mapMain=toEye(main),a0=mapMain(main.getPointAtLength(0)),a1=mapMain(main.getPointAtLength(main.getTotalLength()));
  const ang=Math.atan2(a1.y-a0.y,a1.x-a0.x),cos=Math.cos(ang),sin=Math.sin(ang);
  const pb=pupil.getBBox(),cx=pb.x+pb.width/2,cy=pb.y+pb.height/2;
  const along=p=>(p.x-cx)*cos+(p.y-cy)*sin,down=p=>-(p.x-cx)*sin+(p.y-cy)*cos; // 顔にとっての横と下
  let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity,lidN=-Infinity;
  const pl=pupil.getTotalLength();
  for(let i=0;i<=160;i++){const p=pupil.getPointAtLength(pl*i/160),u=along(p),v=down(p);left=Math.min(left,u);right=Math.max(right,u);top=Math.min(top,v);bottom=Math.max(bottom,v)}
  lidPaths.forEach(node=>{const m=toEye(node),L=node.getTotalLength();for(let i=0;i<=24;i++)lidN=Math.max(lidN,down(m(node.getPointAtLength(L*i/24))))});
  lidN+=20; // まぶたの線の太さの半分
  const at=(u,v)=>[cx+u*cos-v*sin,cy+u*sin+v*cos];
  const clip=el('clipPath',{id:'intro-lid-'+side,clipPathUnits:'userSpaceOnUse'},defs);
  const rect=el('rect',{x:cx-3000,y:cy-3000,width:6000,height:6000,transform:`rotate(${ang*180/Math.PI} ${cx} ${cy})`},clip);
  pupil.setAttribute('clip-path',`url(#intro-lid-${side})`);
  // 「＞＜」は傾いた顔の中心線に対して左右対称
  const mu=(left+right)/2,mv=(top+bottom)/2,w=(right-left)*.27,h=(bottom-top)*.28,dir=side==='left'?1:-1;
  const pts=[at(mu-dir*w,mv-h),at(mu+dir*w*.9,mv),at(mu-dir*w,mv+h)];
  // 閉じ始めたら、まぶたの線を瞳の幅いっぱいまで伸ばし、瞳の切り口を必ずまぶたで覆う
  const cover=el('path',{fill:'none',stroke:'#8b99a7','stroke-width':40,'stroke-linecap':'round'},group);
  const lidU=[along(a0),along(a1)].sort((a,b)=>a-b);
  const shut=layer(el('path',{d:'M'+pts.map(p=>p.join(' ')).join('L'),fill:'none',stroke:'#8b99a7','stroke-width':46,'stroke-linecap':'round','stroke-linejoin':'round'},group));
  return {pupil,lines,rect,shut,cover,at,lidU,left,right,cy,lidN,nx:-sin,ny:cos,drop:top+(bottom-top)*.62-lidN};
});
// lid: 0 = 開いている, 1 = 閉じている。 まぶたは顔にとっての「下」へ下ろし、瞳を隠す境目もまぶたと平行にする
// squint が true の間は「＞＜」だけを見せる。 shut は「＞＜」の大きさ。 lid は左右別々に [左, 右] でも渡せる
function setEyes(lid,shut,squint=false){
  eyes.forEach((e,i)=>{
    const lv=clamp(Array.isArray(lid)?lid[i]:lid,-.3,1),d=e.drop*lv;
    set(e.lines,{x:e.nx*d,y:e.ny*d,o:squint?0:1});
    e.rect.setAttribute('y',e.cy+(lv<.02?-3000:e.lidN+d-14));
    const grow=clamp(lv/.3),v=e.lidN-20+d;
    e.cover.style.opacity=squint||lv<.02?0:1;
    if(!squint&&lv>=.02)e.cover.setAttribute('d','M'+e.at(mix(e.lidU[0],e.left-10,grow),v).join(' ')+'L'+e.at(mix(e.lidU[1],e.right+10,grow),v).join(' '));
    e.pupil.style.opacity=squint?0:1;
    set(e.shut,{sx:shut,sy:shut,o:shut>.01?1:0});
  });
}
const mouthOpen=layer($('#mouth > path'),'top'),fangs=$$('#mouth-details > path').slice(0,2),smile=layer($('#mouth-details > path:nth-child(3)'));

// ---- 看板と文字 ----
const byX=nodes=>nodes.map(n=>({n,b:n.getBoundingClientRect()})).sort((a,b)=>a.b.left-b.b.left);
const plate=layer($('#primary-outline'));
const paws=$$('#primary-fill > g[fill="#fff"]').map(g=>layer(g));
const letters=byX($$('#primary-fill path').filter(p=>!p.closest('g[fill="#fff"]'))).map(({n})=>layer(n,'bottom'));
const word=layer($('#primary-wordmark'));
const small=byX($$('#secondary-wordmark path'));
const smallRows=[...small.filter(s=>s.b.top<small[0].b.top+small[0].b.height*0.9),...small.filter(s=>s.b.top>=small[0].b.top+small[0].b.height*0.9)].map(({n})=>layer(n,'bottom'));
const blossoms=$$('#blossoms > path').map(p=>layer(p));
const petals=$$('#logo-petals > path, #petals > path').map(p=>layer(p));

// ---- 効果レイヤー: 着地の花びらと、目が開くときのキラッ ----
const toFx=(node,fx=.5,fy=.5)=>{
  const r=node.getBoundingClientRect(),m=effects.getScreenCTM();
  if(!m)return {x:640,y:360};
  const p=new DOMPoint(r.left+r.width*fx,r.top+r.height*fy).matrixTransform(m.inverse());
  return {x:p.x,y:p.y};
};
// 両足元から外側へ散らし、顔の上は横切らない
const feet=[toFx(mascot,.2,.82),toFx(mascot,.8,.82)];
const puff=Array.from({length:12},(_,i)=>({o:feet[i<6?0:1],a:i<6?Math.PI*(1.02+.3*(i/5)):-Math.PI*(.02+.3*((i-6)/5)),d:70+(i%3)*40,
  node:el('path',{d:'M0 -12C8 -9 9 3 0 12C-9 3 -8 -9 0 -12Z',fill:['#ffa7b1','#facfe7','#b4d8ff'][i%3]},effects)}));
const star=r=>`M0 ${-r}C${r*.16} ${-r*.16} ${r*.16} ${-r*.16} ${r} 0C${r*.16} ${r*.16} ${r*.16} ${r*.16} 0 ${r}C${-r*.16} ${r*.16} ${-r*.16} ${r*.16} ${-r} 0C${-r*.16} ${-r*.16} ${-r*.16} ${-r*.16} 0 ${-r}Z`;
eyes.forEach(e=>e.fxAt=toFx(e.pupil,.5,.4));
const glints=eyes.map(e=>({at:toFx(e.pupil,.35,.3),node:el('path',{d:star(1),fill:'#fff',stroke:'#facfe7','stroke-width':.08},effects)}));

// くるりん用: 花びらが画面を一周する軌跡と、猫の登場で散る飛沫 (Codex版の効果を移植)
const orbit=el('g',{fill:'none','stroke-linecap':'round'},effects);
const swoosh=el('path',{d:'M394 414C267 219 562 91 789 190C1034 297 945 520 672 521',stroke:'#facfe7','stroke-width':6},orbit);
const echo=el('path',{d:'M363 378C326 191 648 104 847 265',stroke:'#c8e3ff','stroke-width':3},orbit);
const orbitLen=[swoosh,echo].map(p=>p.getTotalLength());
const lead=el('path',{d:'M0 0C-34-24-38-58-16-60L0-42L16-60C42-52 36-18 0 0',fill:'#ffa7b1'},effects);
const dust=Array.from({length:22},(_,i)=>({angle:i*2.399963,delay:(i%5)*.023,radius:215+(i%4)*33,
  node:el('path',{d:i%3===0?'M0 -9 Q3 -2 9 0 Q2 3 0 9 Q-3 2 -9 0 Q-2 -3 0 -9':'M0 9 C-11 0 -9 -10 0 -4 C9 -10 11 0 0 9',fill:['#ffa7b1','#b4d8ff','#facfe7'][i%3]},effects)}));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
// キーフレーム [時刻, x, y, 横倍率, 縦倍率, 回転, 不透明度] を補間する
function track(t,keys){
  const pick=k=>({x:k[1],y:k[2],sx:k[3],sy:k[4],r:k[5],o:k[6]});
  if(t<=keys[0][0])return pick(keys[0]);
  for(let i=1;i<keys.length;i++)if(t<keys[i][0]){const a=keys[i-1],b=keys[i],p=smooth((t-a[0])/(b[0]-a[0]));return pick(a.map((v,j)=>mix(v,b[j],p)))}
  return pick(keys.at(-1));
}
const pulse=(t,start,len)=>{const u=(t-start)/len;return u<=0||u>=1?0:Math.sin(Math.PI*u)**2};
const osc=(t,start,len)=>{const u=(t-start)/len;return u<=0||u>=1?0:Math.sin(u*Math.PI*5)*(1-u)**2*Math.min(1,u*12)};
[orbit,lead,...dust.map(d=>d.node)].forEach(n=>n.style.opacity=0);

// 登場のしかたで使う追加の効果
const mouthAt=toFx($('#mouth'),.5,.6);
const cloud=Array.from({length:6},(_,i)=>({a:Math.PI*(.3+.4*i/5),d:60+(i%2)*35,node:el('circle',{r:1,fill:'#fff',stroke:'#c6d3de','stroke-width':.12},effects)}));
const winkStars=Array.from({length:4},(_,i)=>({a:-Math.PI*(.05+.18*i),node:el('path',{d:star(1),fill:['#fff1a8','#facfe7','#b4d8ff','#ffa7b1'][i]},effects)}));
const bump=(t,a,b,c,d)=>smooth(prog(t,a,b))*(1-smooth(prog(t,c,d)));

// 看板と文字の登場は全パターン共通。 猫と顔と効果だけを変える
const T={plate:0,letters:.08,small:.78,bloom:.85,showcase:.55};
const rise=(t,from=.42,to=.78)=>{const p=prog(t,from,to);return {y:700*(1-easeOut(p))-40*Math.sin(p*Math.PI),k:t<from?.3:mix(-.25,-.05,p)}};
const settle=dt=>.26*Math.exp(-5.5*dt)*Math.cos(13*dt);
// 基本の目覚め: 「＞＜」が縮んで消え、閉じたまぶたが上がる
const wake=(t,at,over=1.15)=>({squint:t<at,shut:t<at?1+.1*Math.sin(t*24):1-easeOut(prog(t,at,at+.08)),lid:t<at?1:1-clamp(spring(t-at-.04,18,6),0,over),mouth:clamp(spring(t-at-.08,20,7),0,1.2),mouthAt:at});
const blinks=(t,at,n=2)=>{let v=0;for(let i=0;i<n;i++)v=Math.max(v,Math.sin(Math.PI*prog(t,at+i*.2,at+i*.2+.16)));return v};
const V={
  // ひょこっ: 看板の裏から伸び上がって顔を出す
  peek:{duration:1.95,land:.78,
    cat:t=>t<.78?rise(t):{k:settle(t-.78)},
    face:t=>wake(t,1.25),
    jolt:t=>wobble(t-.42,-10,15,5)+wobble(t-.78,16,14,4.5)},
  // ウィンク: 右下から斜めに顔を出し、首をかしげてウィンクする
  wink:{duration:2.35,land:.86,
    cat:t=>{
      if(t<.86){const p=easeOut(prog(t,.42,.86));return {x:300*(1-p),y:700*(1-p)-30*Math.sin(p*Math.PI),r:30*(1-p),k:t<.42?.3:mix(-.2,-.04,p)}}
      return {r:wobble(t-.86,-7,11,5)-8*bump(t,1.2,1.35,1.8,2.0),k:settle(t-.86)};
    },
    face:t=>{const f=wake(t,1.2);const right=t<1.85?1:1-clamp(spring(t-1.85,18,6),0,1.1);return {...f,lid:t<1.2?1:[f.lid,Math.max(right,t<1.85?1:0)]}},
    jolt:t=>wobble(t-.42,-12,15,5)+wobble(t-.86,14,14,4.5)+wobble(t-1.2,-6,12,5),
    fx:t=>winkStars.forEach(({a,node},i)=>{const u=prog(t,1.28+i*.05,1.78+i*.05),o=eyes[1].fxAt,r=40+90*easeOut(u);
      node.setAttribute('transform',`translate(${o.x+Math.cos(a)*r} ${o.y+Math.sin(a)*r}) rotate(${u*180}) scale(${Math.sin(Math.PI*u)*(12-i*1.5)})`);node.style.opacity=u>0&&u<1?1:0})},
  // くしゅん: (＞ω＜) のまま息を吸って、くしゃみで桜が吹き飛び、驚いて目を開ける
  sneeze:{duration:2.45,land:.78,
    cat:t=>{
      if(t<.78)return rise(t);
      const inhale=smooth(prog(t,1.0,1.25))*(t<1.25?1:0),dt=t-1.25;
      const snap=t<1.25?0:Math.exp(-5*dt);
      return {y:-18*inhale+22*snap*Math.cos(12*dt),r:7*inhale-10*snap*Math.cos(9*dt),k:settle(t-.78)-.14*inhale+(t<1.25?0:.34*Math.exp(-5.5*dt)*Math.cos(14*dt))};
    },
    face:t=>{const f=wake(t,1.52,1.35);if(t<1.52)f.shut*=1+.25*smooth(prog(t,1.22,1.28));f.lid=Math.max(f.lid,blinks(t,1.98));f.smile=t<1.25?1+.35*smooth(prog(t,1.0,1.25)):1;return f},
    jolt:t=>wobble(t-.42,-10,15,5)+wobble(t-.78,14,14,4.5)+wobble(t-1.25,-24,13,4),
    blow:t=>wobble(t-1.25,1,10,3.5),
    fx:t=>cloud.forEach(({a,d,node},i)=>{const u=prog(t,1.25+i*.02,1.95+i*.02),r=d*easeOut(u);
      node.setAttribute('cx',mouthAt.x+Math.cos(a)*r*1.4);node.setAttribute('cy',mouthAt.y+Math.sin(a)*r*.6+10);node.setAttribute('r',(10+i%3*5)*Math.sin(Math.PI*Math.min(1,u*1.3)));node.style.opacity=u>0&&u<1?1-u*.6:0})},
  // ぴょーん: 画面の上まで跳ねすぎて、看板の上に落ちてくる。 看板が重みで沈む
  hop:{duration:2.3,land:1.14,
    cat:t=>{
      if(t<.42)return {y:700,k:.3};
      if(t<1.14){const p=prog(t,.42,1.14);return {y:700*(1-p)-1150*4*p*(1-p)*.5,r:16*Math.sin(p*Math.PI*2),k:p<.2?mix(-.3,0,p/.2):p>.8?-.15*smooth((p-.8)/.2):0}}
      const dt=t-1.14;return {k:.42*Math.exp(-4.5*dt)*Math.cos(12*dt)};
    },
    face:t=>{const f=wake(t,1.5);f.lid=Math.max(f.lid,blinks(t,2.0,1));return f},
    jolt:t=>wobble(t-.42,-14,15,5)+wobble(t-1.14,22,14,4),
    press:t=>t<1.14?0:Math.exp(-6*(t-1.14))*Math.cos(14*(t-1.14))},
  // くるりん: 花びらが画面を一周し、それを合図に小さく潰れた猫が大きく伸び上がって登場する。 看板はそのあと (Codex版の手直し)
  kururin:{duration:2.45,land:99,noClip:true,T:{plate:.86,letters:.9,small:1.23,bloom:.85},
    cat:t=>track(t,[[0,0,100,.02,.02,-12,0],[.42,0,100,.02,.02,-12,0],[.59,0,80,.5,.27,-10,1],[.9,0,-36,.85,1.2,5,1],[1.08,0,9,1.1,.88,-3,1],[1.29,0,-6,.97,1.045,1.2,1],[1.57,0,0,1,1,0,1]]),
    cheek:t=>-.6*pulse(t,.66,.34)+pulse(t,.96,.35)-.4*pulse(t,1.28,.31)+.17*pulse(t,1.59,.32),
    ribbons:t=>[0,1].map(i=>{const s=i?-1:1;return track(t-i*.055,[[0,0,0,1,1,-26*s,1],[.65,0,0,1,1,-26*s,1],[1.02,0,-6,1,1,22*s,1],[1.27,0,3,1,1,-12*s,1],[1.56,0,0,1,1,6*s,1],[1.9,0,0,1,1,0,1]])}),
    streamers:t=>[0,1].map(i=>{const s=i?-1:1;return track(t-i*.055,[[0,0,0,1,1,-12*s,1],[.88,0,0,1,1,-12*s,1],[1.18,0,0,1,1,18*s,1],[1.46,0,0,1,1,-9*s,1],[1.77,0,0,1,1,4*s,1],[2.12,0,0,1,1,0,1]])}),
    wave:(t,i)=>osc(t,.8+(i%4)*.055,1.65),
    face:t=>{const f=wake(t,1.55);f.lid=Math.max(f.lid,blinks(t,2.08,1));return f},
    jolt:()=>0,
    fx:t=>{
      [swoosh,echo].forEach((p,i)=>{const q=clamp((t-.03-i*.06)/.8);p.style.strokeDasharray=`${orbitLen[i]*q} ${orbitLen[i]}`;p.style.opacity=.7*(1-smooth((t-.77)/.38))});
      orbit.style.opacity=1;
      const lp=clamp(t/.82),pt=swoosh.getPointAtLength(orbitLen[0]*lp);
      lead.setAttribute('transform',`translate(${pt.x} ${pt.y}) rotate(${mix(-100,270,lp)}) scale(${.72*(1-smooth((t-.67)/.24))})`);
      lead.style.opacity=smooth(t/.08)*(t<.95?1:0);
      dust.forEach(({node,angle,delay,radius},i)=>{
        const u=clamp((t-.87-delay)/1.14),ease=1-(1-u)**3,r=mix(90,radius,ease);
        node.setAttribute('transform',`translate(${640+Math.cos(angle)*r*1.35} ${310+Math.sin(angle)*r*.72+45*u*u}) rotate(${i*43+u*(i%2?120:-100)}) scale(${(i%4===0?1.1:.75)*Math.sin(Math.PI*u)})`);
        node.style.opacity=(t<.87+delay?0:1)*(1-smooth((u-.55)/.45));
      });
    }},
};
const P=V[variant];
T.duration=P.duration;
const TT={...T,...P.T};
if(P.noClip)stage.removeAttribute('clip-path');

const render=t=>{
  // 看板: 土台が弾み、文字が上から順に落ちて収まる
  set(plate,{sx:spring(t-TT.plate,17,6)+wobble(t-TT.plate,.07,17,6),sy:spring(t-TT.plate,17,6),o:t>=TT.plate?1:0});
  letters.forEach((l,i)=>{const st=TT.letters+i*.035,p=prog(t,st,st+.3);set(l,{y:-380*(1-back(p,1.5)),sy:1+wobble(t-st-.18,.16,24,9),o:t>=st?1:0})});
  paws.forEach((l,i)=>{const st=TT.letters+.42+i*.1,p=easeOut(prog(t,st,st+.14));set(l,{sx:1+(1-p),sy:1+(1-p),o:p})});
  const stamp=wobble(t-TT.letters-.42,.02,30,9)+wobble(t-TT.letters-.52,.02,30,9),press=P.press?.(t)??0;
  set(word,{y:40*press,sx:1+stamp+.03*press,sy:1+stamp-.07*press});

  // 猫
  const c=P.cat(t);
  set(cat,{x:c.x??0,y:c.y??0,r:c.r??0,sx:c.sx??1,sy:c.sy??1,o:c.o??1});
  const w=warpBody(c.k??0,P.cheek?.(t)??0);
  anchors.forEach(([l,ax,ay])=>{const [wx,wy]=w(ax,ay);l.dx=wx-ax;l.dy=wy-ay});
  set(face,{x:face.dx,y:face.dy});
  const jolt=P.jolt(t),rb=P.ribbons?.(t);
  set(ribbonL,{x:ribbonL.dx+(rb?.[0].x??0),y:ribbonL.dy+(rb?.[0].y??0),r:rb?rb[0].r:jolt});
  set(ribbonR,{x:ribbonR.dx+(rb?.[1].x??0),y:ribbonR.dy+(rb?.[1].y??0),r:rb?rb[1].r:-jolt*1.1});
  const sm=P.streamers?.(t);
  streamerLayers.forEach((l,i)=>set(l,{r:sm?sm[i].r:0}));
  waveStreamers(i=>P.wave?.(t,i)??0);

  // 顔
  const f=P.face(t);
  setEyes(f.lid,f.shut,f.squint);
  set(mouthOpen,{sx:f.mouth,sy:f.mouth,o:t>f.mouthAt+.08?1:0});
  fangs.forEach(n=>n.style.opacity=clamp((t-f.mouthAt-.16)/.1));
  set(smile,{sy:f.smile??(f.squint?1+.14*Math.sin(t*24):1)});

  // nekochan games と桜 (くしゅんでは桜が吹き飛んで戻る)
  const blow=P.blow?.(t)??0;
  smallRows.forEach((l,i)=>{const st=TT.small+i*.03,p=prog(t,st,st+.38);set(l,{y:90*(1-back(p,2.4)),o:clamp((t-st)/.08)})});
  blossoms.forEach((l,i)=>{const p=prog(t,TT.bloom+i*.08,TT.bloom+.45+i*.08);set(l,{x:blow*(i%2?60:-60),sx:back(p,2.3),sy:back(p,2.3),r:-160*(1-easeOut(p))+blow*90,o:p>0?1:0})});
  petals.forEach((l,i)=>{const st=TT.bloom+.1+i*.06,p=easeOut(prog(t,st,st+.6));set(l,{x:Math.sin((t-st)*6+i)*20*(1-p)+blow*(i%2?80:-80),y:-110*(1-p)-blow*30,r:90*(1-p)*(i%2?1:-1)+blow*140,o:clamp((t-st)/.15)})});

  // 効果: 着地で花びらが散り、目が開く瞬間にキラッと光る
  puff.forEach(({o,a,d,node})=>{
    const u=prog(t,P.land,P.land+.75),r=d*easeOut(u)*(variant==='hop'?1.5:1);
    node.setAttribute('transform',`translate(${o.x+Math.cos(a)*r*1.3} ${o.y+Math.sin(a)*r*.8+40*u*u}) rotate(${u*200}) scale(${Math.sin(Math.PI*u)})`);
    node.style.opacity=u>0&&u<1?1:0;
  });
  glints.forEach(({at,node},i)=>{
    const u=prog(t,f.mouthAt+.1+i*.05,f.mouthAt+.55+i*.05);
    node.setAttribute('transform',`translate(${at.x} ${at.y}) rotate(${u*120}) scale(${Math.sin(Math.PI*u)*16*(variant==='wink'&&i===1?0:1)})`);
    node.style.opacity=u>0&&u<1?1:0;
  });
  P.fx?.(t);
  if(t>=T.duration)startIdle();
};

// ---- 再生後: 数秒おきに、まぶたでまばたきする ----
let idleTimer=0,idleStarted=false;
const still=()=>{const c=document.documentElement.classList;return c.contains('paused')||c.contains('backgrounded')||document.hidden||matchMedia('(prefers-reduced-motion:reduce)').matches};
function blinkOnce(twice){
  const start=performance.now(),len=twice?.42:.2;
  const frame=now=>{
    const s=(now-start)/1000,u=clamp(s/len);
    const lid=twice?Math.abs(Math.sin(u*Math.PI*2)):Math.sin(u*Math.PI);
    setEyes(lid,0);set(ribbonL,{x:ribbonL.dx,y:ribbonL.dy,r:wobble(s,-3,14,6)});set(ribbonR,{x:ribbonR.dx,y:ribbonR.dy,r:wobble(s,3,14,6)});
    if(u<1||s<.8)requestAnimationFrame(frame);else{setEyes(0,0);scheduleBlink()}
  };
  requestAnimationFrame(frame);
}
function scheduleBlink(){
  clearTimeout(idleTimer);
  idleTimer=setTimeout(()=>{if(still())scheduleBlink();else blinkOnce(Math.random()<.3)},4500+Math.random()*4500);
}
function startIdle(){if(idleStarted)return;idleStarted=true;ribbonL.dx=ribbonL.dy=ribbonR.dx=ribbonR.dy=0;scheduleBlink()}

return {render,showcaseAt:T.showcase,duration:T.duration,variant};
}

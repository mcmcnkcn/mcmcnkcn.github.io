import {installMorph} from './logo-morph.js';
export function createLogoIntro(logo, effects){
const NS='http://www.w3.org/2000/svg';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const mix=(a,b,t)=>a+(b-a)*t;
// Each wrapper owns animation only; every authored SVG transform stays intact.
function layer(id,pivot='center'){
  const element=typeof id==='string'?logo.querySelector('#'+id):id,g=document.createElementNS(NS,'g');
  element.before(g);g.append(element);
  const b=g.getBBox();
  return {g,x:b.x+b.width/2,y:b.y+b.height*(pivot==='bottom'?1:pivot==='top'?0:0.5)};
}
function set(l,x=0,y=0,sx=1,sy=1,r=0,a=1){
  l.g.setAttribute('transform',`translate(${x} ${y}) translate(${l.x} ${l.y}) rotate(${r}) scale(${sx} ${sy}) translate(${-l.x} ${-l.y})`);
  l.g.style.opacity=a;
}
// Channels: time, x, y, scaleX, scaleY, rotation, opacity.
function track(l,t,keys){
  if(t<=keys[0][0])return set(l,...keys[0].slice(1));
  for(let i=1;i<keys.length;i++)if(t<keys[i][0]){
    const a=keys[i-1],b=keys[i],p=smooth((t-a[0])/(b[0]-a[0]));
    return set(l,...a.slice(1).map((v,j)=>mix(v,b[j+1],p)));
  }
  set(l,...keys.at(-1).slice(1));
}
const cat=layer('mascot','bottom');
const primary=layer('primary-wordmark');
const secondary=layer('secondary-wordmark');
const ribbons=['ornament-left','ornament-right'].map(id=>layer(id,'top'));
const streamers=['ornament-left-streamers','ornament-right-streamers'].map(id=>layer(id,'top'));
// Sample the authored lower eyelid into the pupil's coordinate system. Its
// visible stroke and the clipping edge share exactly the same moving curve.
const eyes=['left','right'].map(side=>{
  const pupil=logo.querySelector('#eye-'+side+' > path');
  const stroke=logo.querySelector('#eye-'+side+'-lines > path:last-child'),b=pupil.getBBox();
  const matrix=pupil.parentNode.getCTM().inverse().multiply(stroke.getCTM()),length=stroke.getTotalLength();
  const curve=Array.from({length:49},(_,i)=>{const p=stroke.getPointAtLength(length*i/48).matrixTransform(matrix);return [p.x,p.y];});
  const width=parseFloat(getComputedStyle(stroke).strokeWidth)*Math.hypot(matrix.a,matrix.b);
  pupil.after(stroke);stroke.removeAttribute('transform');stroke.setAttribute('fill','none');stroke.setAttribute('stroke-width',width);stroke.setAttribute('stroke-linecap','round');
  const lid=layer('eye-'+side+'-lines');
  let defs=logo.querySelector('defs');
  if(!defs){defs=document.createElementNS(NS,'defs');logo.prepend(defs);}
  const clip=document.createElementNS(NS,'clipPath'),edge=document.createElementNS(NS,'path');
  clip.id='intro-eye-'+side;clip.setAttribute('clipPathUnits','userSpaceOnUse');clip.append(edge);defs.append(clip);
  pupil.setAttribute('clip-path','url(#'+clip.id+')');
  const drop=b.y+b.height*.58-curve[Math.floor(curve.length/2)][1];
  return {lid,b,edge,stroke,curve,drop,width};
});
const flowers=[...logo.querySelectorAll('#sakura path')].map(el=>layer(el));
const dust=effects.querySelector('#dust');
const particles=Array.from({length:22},(_,i)=>{
  const p=document.createElementNS(NS,'path');
  p.setAttribute('d',i%3===0?'M0 -9 Q3 -2 9 0 Q2 3 0 9 Q-3 2 -9 0 Q-2 -3 0 -9':'M0 9 C-11 0 -9 -10 0 -4 C9 -10 11 0 0 9');
  p.setAttribute('fill',['#ffa7b1','#b4d8ff','#facfe7'][i%3]);dust.append(p);
  return {p,angle:i*2.399963,delay:(i%5)*.023,radius:215+(i%4)*33};
});
const swoosh=effects.querySelector('#swoosh'),echo=effects.querySelector('#echo');
const lengths=[swoosh,echo].map(p=>p.getTotalLength());
const lead=effects.querySelector('#lead');
const render=t=>{
  t=Math.max(0,t);
  track(cat,t,[[0,0,100,.02,.02,-12,0],[.42,0,100,.02,.02,-12,0],[.59,0,80,.5,.27,-10,1],[.9,0,-36,.85,1.2,5,1],[1.08,0,9,1.1,.88,-3,1],[1.29,0,-6,.97,1.045,1.2,1],[1.57,0,0,1,1,0,1]]);
  track(primary,t,[[0,0,220,.8,.65,0,0],[.88,0,220,.8,.65,0,0],[1.12,0,-55,1.055,1.08,-2,1],[1.29,0,21,.98,.95,1,1],[1.52,0,0,1,1,0,1]]);
  track(secondary,t,[[0,0,90,.96,.96,0,0],[1.23,0,90,.96,.96,0,0],[1.53,0,-12,1.01,1.01,0,1],[1.76,0,0,1,1,0,1]]);
  ribbons.forEach((l,i)=>{
    const d=i*.055,s=i===0?1:-1;
    track(l,t-d,[[0,0,0,1,1,-26*s,1],[.65,0,0,1,1,-26*s,1],[1.02,0,-6,1,1,22*s,1],[1.27,0,3,1,1,-12*s,1],[1.56,0,0,1,1,6*s,1],[1.9,0,0,1,1,0,1]]);
    track(streamers[i],t-d,[[0,0,0,1,1,-12*s,1],[.88,0,0,1,1,-12*s,1],[1.18,0,0,1,1,18*s,1],[1.46,0,0,1,1,-9*s,1],[1.77,0,0,1,1,4*s,1],[2.12,0,0,1,1,0,1]]);
  });
  flowers.forEach((l,i)=>{
    const start=.85+i*.065;
    track(l,t,[[0,0,0,0,0,-48,0],[start,0,12,0,0,-48,0],[start+.26,0,-4,1.25,1.18,12,1],[start+.43,0,0,.92,.95,-4,1],[start+.66,0,0,1,1,0,1]]);
  });
  const blink=t<2.64?smooth((t-2.55)/.09):1-smooth((t-2.68)/.19);
  eyes.forEach(({lid,b,edge,stroke,curve,drop,width})=>{
    set(lid,0,drop*blink);
    const moving=curve.map(([x,y],i)=>[mix(x,b.x-width/2+(b.width+width)*i/(curve.length-1),blink),y+drop*blink]);
    const line='M'+moving.map(p=>p.join(',')).join('L');
    stroke.setAttribute('d',line);
    // Extend beyond the iris on either side; the pupil remains unscaled.
    const left=b.x-width*2,right=b.x+b.width+width*2,bottom=b.y+b.height+width;
    const upper=[[left,moving[0][1]],...moving,[right,moving.at(-1)[1]]];
    // A small lower-lid rise meets the upper lid at the eye centre instead of
    // dragging the closed eye down onto the cheek. The aperture closes exactly.
    const lower=upper.map(([x,y])=>[x,mix(bottom,y,blink)]).reverse();
    edge.setAttribute('d','M'+[...upper,...lower].map(p=>p.join(',')).join('L')+'Z');
  });
  [swoosh,echo].forEach((p,i)=>{
    const q=clamp((t-.03-i*.06)/.8),len=lengths[i];
    p.style.strokeDasharray=`${len*q} ${len}`;
    p.style.opacity=.7*(1-smooth((t-.77)/.38));
  });
  const lp=clamp(t/.82),point=swoosh.getPointAtLength(lengths[0]*lp);
  lead.setAttribute('transform',`translate(${point.x} ${point.y}) rotate(${mix(-100,270,lp)}) scale(${.72*(1-smooth((t-.67)/.24))})`);
  lead.style.opacity=smooth(t/.08);
  particles.forEach(({p,angle,delay,radius},i)=>{
    const u=clamp((t-.87-delay)/1.14),ease=1-(1-u)**3;
    const r=mix(90,radius,ease),x=640+Math.cos(angle)*r*1.35,y=310+Math.sin(angle)*r*.72+45*u*u;
    p.setAttribute('transform',`translate(${x} ${y}) rotate(${i*43+u*(i%2?120:-100)}) scale(${(i%4===0?1.1:.75)*Math.sin(Math.PI*u)})`);
    p.style.opacity=(t<.87+delay?0:1)*(1-smooth((u-.55)/.45));
  });
};
return {render:installMorph(logo,render),showcaseAt:1.3,duration:3.05};
}

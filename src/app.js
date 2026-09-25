import {contour,pathData} from './showcase.js';
import {createLogoIntro} from './logo-intro.js';
import {games,pageMeta} from './games.js';
import {initAnalytics,pageView,track} from './analytics.js';
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const storage = {get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
const shelf=$('#shelf'), list=$('#games'), dialog=$('#detail'), host=$('#detail-host');
const portrait=matchMedia('(max-aspect-ratio:1/1), (max-height:520px)');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let selected=null, placeholder=null, returnFocus=null, savedScroll=null, savedOutline=null, surface=null, frame=0;
let finishIntro=()=>{};
let instantOpen=false;
const routeGame=()=>games.find(g=>g.path===location.pathname.replace(/\/?$/,'/'))?.id || (location.pathname==='/'?games.find(g=>g.id===location.hash.slice(1)&&!g.preview)?.id:null);
function syncMeta(id){const meta=pageMeta(games.find(g=>g.id===id));document.title=meta.title;$('meta[name="description"]').content=meta.description;$('link[rel="canonical"]').href=meta.url;for(const key of ['title','description','url','image'])$(`meta[property="og:${key}"]`).content=meta[key];pageView();}
let currentOutline=null;
let transitionClips=[];
function clearTransitionClips(){for(const {node,clip,previous} of transitionClips){if(previous===null)node.removeAttribute('clip-path');else node.setAttribute('clip-path',previous);clip.remove();}transitionClips=[];}
function prepareTransitionClips(tile){
  clearTransitionClips();const poster=$('.poster',tile),ns='http://www.w3.org/2000/svg';
  if(!poster)return;
  // Logos include overhanging mascots; balloons are also intentionally outside
  // the paper. Only prose and genre labels follow the paper's clipping edge.
  $$('g[id]',poster).filter(n=>/-(explanations-without-boxes|stationary-genre-labels)$/.test(n.id)).forEach((node,i)=>{
    const clip=document.createElementNS(ns,'clipPath'),path=document.createElementNS(ns,'path');clip.id=`transition-copy-${i}`;clip.setAttribute('clipPathUnits','userSpaceOnUse');clip.append(path);poster.append(clip);
    transitionClips.push({node,clip,path,previous:node.getAttribute('clip-path')});node.setAttribute('clip-path',`url(#${clip.id})`);
  });
}
function releaseShowcase(){if(!document.documentElement.classList.contains('intro-pending'))return;document.documentElement.classList.remove('intro-pending');shelf.inert=false;openGame(routeGame(),false);}
function startIntro(logo){
  const ns='http://www.w3.org/2000/svg',effects=document.createElementNS(ns,'svg');
  effects.classList.add('logo-effects');effects.setAttribute('viewBox','0 0 1280 720');effects.setAttribute('aria-hidden','true');
  $('#brand').prepend(effects);
  const intro=createLogoIntro(logo,effects);let raf=0,done=false,elapsed=0,last=performance.now();
  $('#brand').classList.add('logo-ready');
  finishIntro=()=>{if(done)return;done=true;cancelAnimationFrame(raf);intro.render(intro.duration);effects.remove();releaseShowcase();};
  function tick(now){if(done)return;if(reduced.matches||document.documentElement.classList.contains('paused')){finishIntro();return;}if(!document.hidden)elapsed+=(now-last)/1000;last=now;intro.render(Math.min(elapsed,intro.duration));if(elapsed>=intro.showcaseAt)releaseShowcase();if(elapsed>=intro.duration)finishIntro();else raf=requestAnimationFrame(tick);}
  intro.render(0);raf=requestAnimationFrame(tick);
}
const motionDuration=()=>instantOpen||reduced.matches||document.documentElement.classList.contains('paused')?0:650;
function outline(tile){
  const svg=$('.card-surface',tile);
  if(svg){
    const mobile=svg.viewBox.baseVal.height===1040,mirror=svg.dataset.mirror==='true',matrix=svg.getScreenCTM();
    const corners=[[35,30],[705,285],[705,mobile?760:724],[35,mobile?1015:724]];
    // Equal samples per EDGE, not per perimeter: all four corners correspond.
    return Array.from({length:256},(_,i)=>{const edge=Math.floor(i/64),t=(i%64)/64,a=corners[edge],b=corners[(edge+1)%4],p=svg.createSVGPoint();p.x=a[0]+(b[0]-a[0])*t;p.y=a[1]+(b[1]-a[1])*t;if(mirror)p.x=740-p.x;const q=p.matrixTransform(matrix);return[q.x,q.y];});
  }
  const r=$('.hero',tile).getBoundingClientRect();
  return rectanglePoints(r.left+r.width*.03,r.top+r.height*.05,r.width*.94,r.height*.92,true);
}
function rectanglePoints(x,y,w,h,sloped=false){return Array.from({length:256},(_,i)=>{const edge=Math.floor(i/64),t=(i%64)/64,jitter=Math.sin(i*2.7)*1.6;return edge===0?[x+t*w,y+(sloped?t*h*.32:0)+jitter]:edge===1?[x+w+jitter,y+(sloped?.32*h:0)+t*h*(sloped?.68:1)]:edge===2?[x+(1-t)*w,y+h+jitter]:[x+jitter,y+(1-t)*h];});}
function fullOutline(){const points=rectanglePoints(6,6,innerWidth-12,dialog.clientHeight-12);return selected?.dataset.id==='nyan'?points.map(([x,y])=>[innerWidth-x,y]):points;}
function createSurface(tile){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.classList.add('expanded-surface');svg.setAttribute('aria-hidden','true');
  const tint=getComputedStyle(tile).getPropertyValue('--tint');
  svg.innerHTML=`<defs><clipPath id="expanded-outline"><path/></clipPath></defs><path class="surface-fill" fill="${tint}"/><g clip-path="url(#expanded-outline)"><image href="/assets/paint.webp" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" opacity=".12"/></g><path class="surface-border" fill="none" stroke="${tile.dataset.id==='mochi'?'#c3dfcf':tile.dataset.id==='nyan'?'#f8e6b6':'#decce9'}" stroke-width="12" stroke-linejoin="round"/>`;
  const patternImage=$(`[id$="-panel-${tile.dataset.id==='nyan'?'right':'left'}"] image`,tile)?.getAttribute('href');
  if(patternImage){const pattern=document.createElementNS(ns,'pattern');pattern.id='expanded-pattern';pattern.setAttribute('patternUnits','userSpaceOnUse');pattern.setAttribute('width','640');pattern.setAttribute('height','640');pattern.setAttribute('viewBox',`${tile.dataset.id==='nyan'?887:0} 0 887 887`);pattern.innerHTML=`<image href="${patternImage}" width="1774" height="887"/>`;$('defs',svg).append(pattern);const texture=document.createElementNS(ns,'rect');texture.setAttribute('width','100%');texture.setAttribute('height','100%');texture.setAttribute('fill','url(#expanded-pattern)');texture.setAttribute('opacity','.25');$('g',svg).prepend(texture);}
  dialog.prepend(svg);return svg;
}
function drawSurface(points){
  const d='M'+points.map(p=>p.join(',')).join('L')+'Z';
  $$('path',surface).forEach(p=>p.setAttribute('d',d));
  currentOutline=points;
}
function morph(from,to,onEnd){
  cancelAnimationFrame(frame);const duration=motionDuration(),start=performance.now();
  const tick=now=>{const t=duration?Math.min(1,(now-start)/duration):1,e=1-Math.pow(1-t,3);const points=from.map((p,i)=>[p[0]+(to[i][0]-p[0])*e,p[1]+(to[i][1]-p[1])*e]);const d='M'+points.map(p=>p.join(',')).join('L')+'Z';
    drawSurface(points);
    if(selected&&!selected.classList.contains('settled')&&!dialog.classList.contains('closing')){
      const body=$('.details',selected),rect=body.getBoundingClientRect();
      body.style.clipPath=`polygon(${points.map(([x,y])=>`${x-rect.left}px ${y-rect.top}px`).join(',')})`;
      body.style.opacity=String(t*t*(3-2*t));
    }
    for(const {node,path} of transitionClips){const inverse=node.getScreenCTM().inverse();const local=points.map(([x,y])=>new DOMPoint(x,y).matrixTransform(inverse));path.setAttribute('d','M'+local.map(p=>`${p.x},${p.y}`).join('L')+'Z');}
    // Clip prose independently; mascots keep their overhang during FLIP.
    if(t<1)frame=requestAnimationFrame(tick);else onEnd();};tick(start);
}
function moveHero(hero,from,to){hero.getAnimations().forEach(a=>a.cancel());hero.animate([{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width})`},{transform:'none'}],{duration:motionDuration(),easing:'cubic-bezier(.22,.8,.22,1)'});}
function decorate(tile){
  $$('g[id]',tile).filter(n=>/-(mochi-main|nyan-main|original-water|original-prune|choose-one-balloon|pour-order-balloon|daily-fish-locomotive|mochi-extra-\d|nyan-extra-(title|daily|stamp))$/.test(n.id)).forEach((n,i)=>{
    const wrapper=document.createElementNS('http://www.w3.org/2000/svg','g');wrapper.classList.add('float-layer');
    if(n.id.includes('balloon'))wrapper.classList.add('balloon-motion');if(n.id.includes('-main'))wrapper.classList.add('main-motion');
    wrapper.style.setProperty('--delay',`${-i*.49}s`);n.replaceWith(wrapper);wrapper.append(n);
  });
}
function openGame(id,push=true,immediate=false){
  const tile=$(`.tile[data-id="${id}"]`);if(!tile || selected || games.find(g=>g.id===id)?.preview)return;
  instantOpen=immediate;selected=tile;returnFocus=$('.hero',tile);savedScroll={x:shelf.scrollLeft,y:window.scrollY};
  const from=outline(tile),heroBefore=returnFocus.getBoundingClientRect();
  savedOutline=from.map(([x,y])=>[(x-heroBefore.left)/heroBefore.width,(y-heroBefore.top)/heroBefore.height]);
  placeholder=document.createElement('div');placeholder.className='tile placeholder';placeholder.style.height=`${tile.offsetHeight}px`;tile.before(placeholder);
  if(push)history.pushState({micoDetail:true},'',games.find(g=>g.id===id).path);
  syncMeta(id);
  {
    tile.classList.remove('entry');tile.classList.add('expanded','visible');host.append(tile);
    $('.details',tile).hidden=false;const title=$('.details h2',tile);title.id='detail-title';
    const button=$('.hero',tile);button.tabIndex=-1;button.setAttribute('aria-disabled','true');button.setAttribute('aria-expanded','true');
    shelf.inert=true;$('.shelf-nav').inert=true;
    dialog.show();host.scrollTop=0;surface=createSurface(tile);
    prepareTransitionClips(tile);
    moveHero(button,heroBefore,button.getBoundingClientRect());
    morph(from,fullOutline(),()=>{host.style.clipPath='';clearTransitionClips();tile.classList.add('settled');$('.details',tile).style.clipPath='';$('.details',tile).style.opacity='';drawSurface(fullOutline());});
    $('#close-detail').focus({preventScroll:true});
  }
  instantOpen=false;
  track('game_detail_open',id);
}
function requestClose(){if(!selected)return;if(history.state?.micoDetail)history.back();else{history.replaceState(null,'','/');closeGame();}}
function closeGame(){
  if(!selected || dialog.classList.contains('closing'))return;const tile=selected;
  dialog.classList.add('closing');syncMeta(routeGame());
  prepareTransitionClips(tile);
  const oldHero=$('.hero',tile).getBoundingClientRect();
  // Measure the real destination without changing its layout or scroll position.
  const target=placeholder.getBoundingClientRect();
  const destination=savedOutline.map(([x,y])=>[target.left+x*target.width,target.top+y*target.height]);
  const hero=$('.hero',tile);
  hero.getAnimations().forEach(a=>a.cancel());
  const resting=hero.getBoundingClientRect();
  hero.animate([{transform:`translate(${oldHero.left-resting.left}px,${oldHero.top-resting.top}px) scale(${oldHero.width/resting.width})`},{transform:`translate(${target.left-resting.left}px,${target.top-resting.top}px) scale(${target.width/resting.width})`}],{duration:motionDuration(),easing:'cubic-bezier(.22,.8,.22,1)',fill:'forwards'});
  morph(currentOutline||fullOutline(),destination,()=>{
    clearTransitionClips();
    dialog.close();$('.details',tile).hidden=true;$('.details',tile).style.clipPath='';$('.details',tile).style.opacity='';$('.details h2',tile).removeAttribute('id');tile.classList.remove('expanded','settled');
    $('.hero',tile).removeAttribute('tabindex');$('.hero',tile).removeAttribute('aria-disabled');$('.hero',tile).setAttribute('aria-expanded','false');placeholder.replaceWith(tile);placeholder=null;
    shelf.inert=false;$('.shelf-nav').inert=false;
    shelf.scrollLeft=savedScroll.x;window.scrollTo({top:savedScroll.y,behavior:'instant'});returnFocus.focus({preventScroll:true});
    hero.getAnimations().forEach(a=>a.cancel());surface.remove();surface=null;host.style.clipPath='';dialog.classList.remove('closing');selected=null;layout();
    if(routeGame())openGame(routeGame(),false);
  });
}
$('#close-detail').addEventListener('click',e=>{if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();requestClose();});
dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose();});
// Non-modal details keep the footer reachable; Escape still closes details,
// unless the privacy modal is handling Escape itself.
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selected&&!$('#privacy').open){e.preventDefault();requestClose();}});
window.addEventListener('popstate',()=>{const id=routeGame();if(selected && selected.dataset.id!==id){closeGame();}else if(!selected)openGame(id,false);});
const observer=new IntersectionObserver(entries=>{for(const e of entries)e.target.classList.toggle('visible',e.isIntersecting);},{threshold:[0,.65],rootMargin:'30px'});
function boundary(tile){return list.offsetLeft+tile.offsetLeft+tile.offsetWidth+7;}
const navigationGames=games.filter(g=>g.id!=='future');
function layout(){
  // Keep details inside the space above the footer's rough upper edge.
  const footerTop=$('.footer').getBoundingClientRect().top-7;
  document.documentElement.style.setProperty('--detail-height',Math.max(1,footerTop)+'px');
  const edge=$('.footer-edge'),points=Array.from({length:Math.ceil(innerWidth/5)+1},(_,i)=>[i*5,4+Math.sin(i*2.4)*2+Math.sin(i*.63)]);
  edge.setAttribute('viewBox',`0 0 ${innerWidth} 10`);$('path',edge).setAttribute('d',pathData([...points,[innerWidth+5,10],[0,10]]));
  const first=$('.tile',list);if(!first)return;
  const offset=portrait.matches?0:shelf.clientWidth/2-first.offsetWidth-7;
  list.style.marginLeft=`${Math.min(0,offset)}px`;list.style.paddingLeft=portrait.matches?'8px':`${Math.max(0,offset)}px`;
  const tower=$('.tile[data-id="tower"]',list),future=$('.tile[data-id="future"]',list);
  if(tower&&future)future.style.left=portrait.matches?'':`${tower.offsetLeft+tower.offsetWidth+14}px`;
  $$('.card-surface').forEach(svg=>{const mobile=portrait.matches&&!svg.closest('.expanded');svg.setAttribute('viewBox',`0 0 740 ${mobile?1040:760}`);$$('path',svg).forEach(path=>path.setAttribute('d',pathData(contour(mobile,svg.dataset.mirror==='true'))));});
  updateNavigation();
}
function updateNavigation(){if(selected||portrait.matches)return;const center=shelf.scrollLeft+shelf.clientWidth/2;const tiles=$$('.tile[data-id]:not([data-id="future"])',list);const nearest=tiles.reduce((best,t)=>Math.abs(boundary(t)-center)<Math.abs(boundary(best)-center)?t:best,tiles[0]);if(nearest)$$('[data-game]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.game===nearest.dataset.id)));}
shelf.addEventListener('scroll',updateNavigation,{passive:true});
function resizeLayout(){
  layout();
  // Never cancel an opening/closing morph: its completion restores DOM state.
  if(surface&&!dialog.classList.contains('closing')&&selected?.classList.contains('settled'))drawSurface(fullOutline());
}
window.addEventListener('resize',resizeLayout);
new ResizeObserver(resizeLayout).observe($('.footer'));
// Hydrate the HTML built on disk; content never depends on fetch or JS.
const initialId=routeGame();
if(dialog.hasAttribute('data-static-detail')){
  const tile=$('.tile',host);
  list.querySelector('.ssg-slot').replaceWith(tile);
  tile.classList.remove('expanded','settled');$('.details',tile).hidden=true;
  $('.details h2',tile).removeAttribute('id');
  dialog.close();dialog.removeAttribute('data-static-detail');
}
$$('.tile',list).forEach(tile=>{
  const g=games.find(g=>g.id===tile.dataset.id);
  decorate(tile);observer.observe(tile);
  if(!g.preview)$('.hero',tile).addEventListener('click',e=>{
    if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    e.preventDefault();if(!selected)openGame(g.id);
  });
  $('.play',tile)?.addEventListener('click',()=>track('game_play_click',g.id));
});
layout();shelf.scrollLeft=0;updateNavigation();
document.fonts.ready.then(()=>layout());
if(initialId){
  $$('.tile').forEach(tile=>tile.classList.add('visible'));
  openGame(initialId,false,true);
  if(location.hash)history.replaceState(null,'',games.find(g=>g.id===initialId).path);
}else{
  document.documentElement.classList.add('intro-pending');shelf.inert=true;
  $$('.tile',list).forEach(tile=>tile.classList.add('entry'));
  try{startIntro($('#brand > svg'));}
  catch(error){releaseShowcase();console.error(error);}
}
// Vertical wheel input becomes horizontal only on the landscape shelf; native trackpad x is retained.
clearTimeout(window.showcaseBootTimer);
document.documentElement.classList.remove('boot-pending');
shelf.addEventListener('wheel',e=>{if(portrait.matches || selected || e.ctrlKey || e.shiftKey || Math.abs(e.deltaX)>=Math.abs(e.deltaY))return;const delta=e.deltaY*(e.deltaMode===1?20:e.deltaMode===2?shelf.clientWidth:1);if((delta<0&&shelf.scrollLeft<=0)||(delta>0&&shelf.scrollLeft>=shelf.scrollWidth-shelf.clientWidth-1))return;e.preventDefault();shelf.scrollLeft+=delta;},{passive:false});
function go(id){const tile=$(`.tile[data-id="${id}"]`);if(!tile)return;const behavior=reduced.matches?'instant':'smooth';if(portrait.matches)tile.scrollIntoView({behavior,block:'nearest'});else shelf.scrollTo({left:boundary(tile)-shelf.clientWidth/2,behavior});}
$$('[data-game]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.game)));
$$('[data-step]').forEach(b=>b.addEventListener('click',()=>{const i=navigationGames.findIndex(g=>g.id===$('[data-game][aria-current="true"]')?.dataset.game);go(navigationGames[Math.max(0,Math.min(navigationGames.length-1,i+Number(b.dataset.step)))].id);}));
let drag=null,suppressClick=false;
shelf.addEventListener('pointerdown',e=>{if(portrait.matches||selected||e.button!==0||e.pointerType==='touch')return;suppressClick=false;drag={id:e.pointerId,x:e.clientX,start:shelf.scrollLeft,moved:false};});
shelf.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>7&&!drag.moved){drag.moved=true;shelf.setPointerCapture(e.pointerId);shelf.classList.add('dragging');}if(drag.moved){e.preventDefault();shelf.scrollLeft=drag.start-dx;}});
function endDrag(e){if(!drag||drag.id!==e.pointerId)return;suppressClick=drag.moved;if(shelf.hasPointerCapture(e.pointerId))shelf.releasePointerCapture(e.pointerId);drag=null;shelf.classList.remove('dragging');}
window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);
shelf.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
shelf.addEventListener('dragstart',e=>e.preventDefault());
shelf.addEventListener('keydown',e=>{if(!portrait.matches && ['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();$(`[data-step="${e.key==='ArrowRight'?1:-1}"]`).click();}});
for(let i=0;i<16;i++){const p=document.createElement('span');p.className='petal';p.textContent=i%3?'✿':'✧';p.style.cssText=`--x:${i*6.7}%;--size:${14+i%4*6}px;--duration:${20+i%5*3}s;--delay:${-i*2.4}s`;$('#petals').append(p);}
function setMotion(paused){document.documentElement.classList.toggle('paused',paused);$('#motion').setAttribute('aria-pressed',String(paused));$('#motion').setAttribute('aria-label',paused?'アニメーションを動かす':'アニメーションを止める');$('#motion').textContent=paused?'動き ▶':'動き ❚❚';if(paused)finishIntro();}
setMotion(storage.get('mico-motion')==='paused');$('#motion').addEventListener('click',()=>{const paused=!document.documentElement.classList.contains('paused');setMotion(paused);storage.set('mico-motion',paused?'paused':'playing');});
document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('backgrounded',document.hidden));
reduced.addEventListener('change',()=>{if(reduced.matches)finishIntro();});
$$('.footer-cat').forEach(button=>button.addEventListener('click',()=>{
  const image=$('img',button);image.getAnimations().forEach(a=>a.cancel());
  if(motionDuration())image.animate([
    {transform:'translateY(0) scale(1,1)'},{transform:'translateY(3px) scale(1.13,.83)',offset:.1},
    {transform:'translateY(-27px) scale(.94,1.07) rotate(-7deg)',offset:.28},
    {transform:'translateY(0) scale(1.1,.88)',offset:.45},
    {transform:'translateY(-17px) scale(.97,1.04) rotate(5deg)',offset:.64},
    {transform:'translateY(0) scale(1.06,.94)',offset:.82},{transform:'none'}
  ],{duration:850,easing:'ease-in-out'});
  if(portrait.matches)(selected?host:window).scrollTo({top:0,behavior:motionDuration()?'smooth':'instant'});
}));
$('#privacy-link').addEventListener('click',()=>$('#privacy').showModal());
document.querySelectorAll('a[href="https://forms.gle/YzqbX4imrMaXjn2p9"]').forEach(a=>a.addEventListener('click',()=>track('contact_click')));
initAnalytics();

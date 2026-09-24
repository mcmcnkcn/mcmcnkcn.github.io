const button=document.querySelector('#motion');
// Split the actual drawing into strips; each layer owns a different displacement.
const digits=document.querySelector('.digits');
for(const [i,[top,bottom,shift]] of [[9,78,22],[27,57,-36],[47,39,48],[65,20,-28],[83,8,17]].entries()){
  const strip=document.createElement('span');strip.className='digit-strip';strip.textContent='404';
  strip.style.cssText=`--top:${top}%;--bottom:${bottom}%;--shift:${shift}px;--lag:${i*23}ms`;
  digits.append(strip);
}
const sky=document.querySelector('.sky');
for(const [top,bottom,shift] of [[19,78,35],[46,51,-48]]){
  const fragment=sky.cloneNode(true);fragment.classList.add('sky-fragment');
  fragment.style.cssText=`--top:${top}%;--bottom:${bottom}%;--shift:${shift}px`;
  sky.after(fragment);
}
function setPaused(paused){
  document.documentElement.classList.toggle('paused',paused);
  button.setAttribute('aria-pressed',String(paused));
  button.textContent=paused?'動きを再開':'動きを止める';
}
try{setPaused(localStorage.getItem('mico-motion')==='paused');}catch{}
button.hidden=false;
button.addEventListener('click',()=>{
  const paused=!document.documentElement.classList.contains('paused');setPaused(paused);
  try{localStorage.setItem('mico-motion',paused?'paused':'playing');}catch{}
});
document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('backgrounded',document.hidden));

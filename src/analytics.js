// Basic opt-in: no Google script or requests until consent, on the public host only.
export const measurementId='G-Q4Q5TFM9LW';
const key='mico-analytics-v1';
const production=location.origin==='https://mcmcnkcn.github.io';
let consent=null,started=false,lastPage=null;
try{consent=localStorage.getItem(key);}catch{}
const permitted=()=>production&&consent==='granted';
function cleanURL(value){try{const url=new URL(value);return url.origin+url.pathname;}catch{return '';}}
function start(){
  if(!permitted()||started)return;
  started=true;
  window['ga-disable-'+measurementId]=false;
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments);};
  window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  window.gtag('js',new Date());
  window.gtag('config',measurementId,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_prefix:'mico',page_location:cleanURL(location.href),page_referrer:cleanURL(document.referrer)});
  const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+measurementId;document.head.append(script);
}
export function pageView(){
  if(!permitted()||!started||lastPage===location.pathname)return;
  window.gtag('event','page_view',{page_title:document.title,page_location:cleanURL(location.href),page_referrer:lastPage?location.origin+lastPage:cleanURL(document.referrer)});
  lastPage=location.pathname;
}
export function track(name,id){
  if(!permitted()||!started)return;
  window.gtag('event',name,{...(id?{game_id:id}:{}),page_location:cleanURL(location.href)});
}
function clearCookies(){
  // Only this site's prefixed cookies; do not delete the game's analytics cookies.
  for(const pair of document.cookie.split(';')){
    const name=pair.trim().split('=')[0];if(!name.startsWith('mico_ga'))continue;
    for(const domain of ['',location.hostname,'.'+location.hostname])document.cookie=name+'=; Max-Age=0; Path=/'+(domain?'; Domain='+domain:'');
  }
}
export function initAnalytics(){
  const notice=document.querySelector('#analytics-notice'),policy=document.querySelector('#privacy');
  const status=document.querySelector('#analytics-status');
  function update(){
    status.textContent=(consent==='granted'?'許可しています':consent==='denied'?'許可していません':'未選択です')+(production?'':' (このプレビューでは送信しません)');
    if(consent===null&&!policy.open){if(!notice.matches(':popover-open'))notice.showPopover();}
    else notice.hidePopover();
  }
  function choose(value){
    consent=value;try{localStorage.setItem(key,value);}catch{}
    if(value==='granted'){start();pageView();}
    else{window['ga-disable-'+measurementId]=true;clearCookies();}
    update();
    // Unload all tag listeners after withdrawal, not just our own event calls.
    if(value==='denied'&&started)location.reload();
  }
  document.querySelectorAll('[data-analytics-choice]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.analyticsChoice)));
  document.querySelector('#analytics-info').addEventListener('click',()=>{notice.hidePopover();policy.showModal();});
  policy.addEventListener('close',update);
  document.querySelector('#privacy-link').addEventListener('click',()=>notice.hidePopover());
  window.addEventListener('storage',event=>{if(event.key===key){if(started&&event.newValue!=='granted'){window['ga-disable-'+measurementId]=true;location.reload();return;}consent=event.newValue;start();pageView();update();}});
  start();pageView();update();
}

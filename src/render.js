import {cardSurface,platforms} from './showcase.js';
function previewMarkup(g){return `<div class="preview-copy">${g.id==='tower'?'<img class="preview-icon" src="/assets/tower-icon.png" alt="キャットタワーはどこまでも">':''}<span class="coming-soon"><small>✦</small> Coming Soon <small>✦</small></span></div>`;}
export function details(g,mochiLanding=''){return `<section class="details" hidden><div class="detail-play"><a class="play" href="${g.url}" target="_blank" rel="noopener noreferrer" aria-label="${g.name}を遊ぶ(別タブ)"><span class="play-label"><span aria-hidden="true">▶</span> PLAY</span><img class="play-qr" src="/assets/play-${g.id}-qr.png" alt="${g.name}を開くQRコード" width="116" height="116"></a><p class="detail-note">ゲームを別のタブで開きます。</p></div><h2>${g.name}</h2><p class="lead">${g.lead}</p><img class="detail-cat" src="/assets/${g.cat}" alt=""><p>${g.description}</p><p>${g.extra}</p><div class="detail-facts">${g.facts.map(x=>`<span>${x}</span>`).join('')}</div>${g.id==='mochi'?mochiLanding:''}</section>`;}
export function renderTile(g,i,art,landing,expanded=false){
  const tag=g.preview?'div':'a';
  let html=`<article class="tile ${g.preview?'preview':''} ${expanded?'expanded settled visible':''}" data-id="${g.id}" style="--entry-delay:${i*.16}s"><${tag} class="hero" ${g.preview?'':`href="${g.path}" aria-label="${g.name}の紹介を開く" aria-expanded="${expanded}" aria-haspopup="dialog"`}>${cardSurface(g.id,i%2===1)}${g.preview?previewMarkup(g):art[g.id].replace('<svg ','<svg class="poster" ')+platforms(['Web','PWA'])+'<span class="open-label">くわしく見る ＋</span>'}</${tag}>${g.preview?'':details(g,landing)}</article>`;
  if(expanded)html=html.replace('class="details" hidden','class="details"').replace('<h2>','<h2 id="detail-title">');
  return html.replaceAll('./assets/','/assets/');
}
export const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

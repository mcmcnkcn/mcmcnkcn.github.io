// Shared pencil edge: the same geometry is used for cards and their expansion.
export function contour(mobile=false,mirror=false){
  const corners=[[35,30],[705,285],[705,mobile?760:724],[35,mobile?1015:724]];
  return corners.flatMap((a,edge)=>{const b=corners[(edge+1)%4],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),count=Math.ceil(length/8);return Array.from({length:count},(_,i)=>{const t=i/count,j=i?Math.sin(i*2.3+edge)*2.6+Math.sin(i*.71)*1.8:0;let x=a[0]+dx*t-dy/length*j,y=a[1]+dy*t+dx/length*j;return [mirror?740-x:x,y];});});
}
export const pathData=points=>'M'+points.map(p=>p.map(n=>Math.round(n*100)/100).join(',')).join('L')+'Z';
export function cardSurface(id,mirror){return `<svg class="card-surface" viewBox="0 0 740 760" aria-hidden="true" data-mirror="${mirror}"><defs><pattern id="grain-${id}" width="740" height="760" patternUnits="userSpaceOnUse"><image href="./assets/paint.webp" width="740" height="760" preserveAspectRatio="xMidYMid slice" opacity=".13"/></pattern></defs><path class="card-focus" d="${pathData(contour(false,mirror))}"/><path class="card-outline" d="${pathData(contour(false,mirror))}"/><path class="card-grain" fill="url(#grain-${id})" d="${pathData(contour(false,mirror))}"/></svg>`;}
const icons={
  Web:'<rect x="3" y="4" width="26" height="20" rx="5"/><path d="M3 10h26M12 28h8M16 24v4"/><circle cx="7" cy="7" r=".6"/>',
  PWA:'<rect x="7" y="2" width="18" height="28" rx="5"/><path d="M12 6h8M16 11v10m-4-4 4 4 4-4M14 26h4"/>',
  Switch:'<rect x="2" y="5" width="28" height="22" rx="8"/><path d="M10 5v22M22 5v22M5 12h3M6.5 10.5v3"/><circle cx="25.5" cy="19" r="1"/>',
  iOS:'<rect x="8" y="2" width="16" height="28" rx="5"/><path d="M13 6h6M14 26h4"/><circle cx="16" cy="16" r="4"/>',
  Android:'<path d="m9 7-3-4m17 4 3-4M5 17a11 11 0 0 1 22 0v8H5ZM10 25v4m12-4v4M2 17v6m28-6v6"/><circle cx="11" cy="13" r="1"/><circle cx="21" cy="13" r="1"/>'
};
export function platforms(names){return `<div class="platforms" aria-label="対応環境">${names.map(name=>`<span><svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>${name}</span>`).join('')}</div>`;}

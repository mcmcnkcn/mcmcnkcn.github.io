import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {games,site,pageMeta} from '../src/games.js';
import {renderTile,escapeHTML as esc} from '../src/render.js';

const root=fileURLToPath(new URL('../',import.meta.url)),out=join(root,'dist');
const read=path=>readFile(join(root,path),'utf8');
const template=await read('src/template.html');
const art=JSON.parse(await read('assets/postcard.json'));
const landing=await read('assets/mochi-landing.html');
const logo=(await read('assets/circle-logo.svg')).replace(/<\?xml[^>]*\?>/,'').replace('id="petals"','id="logo-petals"');
// Extract only the mascot, preserving its authored parent transform.
const mascotStart=logo.indexOf('<g id="mascot"');
if(mascotStart<0)throw Error('Logo mascot is missing');
let depth=0,mascot='';
for(const match of logo.slice(mascotStart).matchAll(/<\/?g\b[^>]*>/g)){
  depth+=match[0].startsWith('</')?-1:1;
  if(depth===0){mascot=logo.slice(mascotStart,mascotStart+match.index+match[0].length);break;}
}
if(!mascot)throw Error('Logo mascot is unbalanced');
await writeFile(join(root,'assets/miconeco.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="805 -60 2440 2440"><g transform="matrix(3 0 0 3 -344.5 -263.1)">${mascot}</g></svg>`);
// dist is disposable; do not publish old captures or files from a prior build.
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const file of ['assets','style.css','app.js','analytics.js','games.js','showcase.js','logo-intro.js','logo-morph.js','404.html','404.css','404.js']){
  await cp(join(root,file==='assets'?file:'src/'+file),join(out,file),{recursive:true});
}
for(const game of [null,...games.filter(g=>!g.preview)]){
  const meta=pageMeta(game),path=game?.path||'/';
  const tags=`<title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}">
  <link rel="canonical" href="${meta.url}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ja_JP">
  <meta property="og:site_name" content="${esc(site.name)}">
  <meta property="og:title" content="${esc(meta.title)}">
  <meta property="og:description" content="${esc(meta.description)}">
  <meta property="og:url" content="${meta.url}">
  <meta property="og:image" content="${meta.image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(meta.title)}">
  <meta name="twitter:card" content="summary_large_image">`;
  const replacements={
    META:tags,LOGO:logo,
    GAMES:games.map((g,i)=>g===game?`<div class="ssg-slot" data-slot="${g.id}"></div>`:renderTile(g,i,art,landing)).join('\n'),
    DETAIL:game?renderTile(game,games.indexOf(game),art,landing,true):'',
    DETAIL_OPEN:game?'open data-static-detail':'',
    PAGE:game?.id||'home'
  };
  let html=template.replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{
    if(!(key in replacements))throw Error('Unknown template slot: '+key);
    return replacements[key];
  }).replaceAll('./assets/','/assets/');
  const dir=join(out,path);await mkdir(dir,{recursive:true});
  await writeFile(join(dir,'index.html'),html);
}
// Keep the separately updated game build inside the published SSG output.
await cp(join(root,'games/mcmcnkcn/play'),join(out,'games/mcmcnkcn/play'),{recursive:true});
await writeFile(join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[null,...games.filter(g=>!g.preview)].map(g=>`<url><loc>${pageMeta(g).url}</loc></url>`).join('')}</urlset>\n`);
await writeFile(join(out,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`);
await writeFile(join(out,'.nojekyll'),'');
console.log('Built 3 static pages in '+out);

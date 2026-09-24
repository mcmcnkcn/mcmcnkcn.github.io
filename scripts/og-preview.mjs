// Temporary capture pages. After capture, delete dist/__og (not the PNG assets).
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {games} from '../src/games.js';
import {escapeHTML as esc,renderTile} from '../src/render.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const art=JSON.parse(await readFile(root+'assets/postcard.json','utf8'));
art.logo=(await readFile(root+'assets/circle-logo.svg','utf8')).replace(/<\?xml[^>]*\?>/,'');
await mkdir(root+'dist/__og',{recursive:true});
for(const game of [null,...games.filter(g=>!g.preview)]){
  const id=game?.id||'site';
  if(game){
    // Reuse the expanded page's artwork and styling, without the shelf's sloping frame.
    const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><title>${esc(game.name)} OGP</title><style>
      html,body{width:1200px;height:630px;overflow:hidden}body{background:${game.id==='mochi'?'#edf6e9':'#fff7d9'};background-image:linear-gradient(#fffdf5bb,#fffdf5bb),url('/assets/paint.webp');background-size:1500px;color:#355368}
      *,*::before,*::after{animation:none!important;transition:none!important}
      .tile.expanded{position:absolute;left:0;top:-12px;width:720px;min-height:0;padding:0;margin:0}
      .expanded .hero{width:650px;margin:0 auto;pointer-events:none}.details,.platforms{display:none!important}
      .signature{position:absolute;right:36px;top:110px;width:410px;text-align:center}.signature svg{width:100%;height:auto}.signature p{font:22px Rounded;margin:28px 0 0}
    </style>${renderTile(game,games.indexOf(game),art,'',true)}<aside class="signature">${art.logo}<p>ブラウザで無料で遊べます</p></aside></html>`;
    await writeFile(root+`dist/__og/${id}.html`,html.replaceAll('./assets/','/assets/'));
    continue;
  }
  const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><title>OG preview</title><style>
    html,body{width:1200px;height:630px;overflow:hidden}body{background:#b7e1f7;color:#355368}
    .sheet{position:absolute;inset:20px;border-radius:80px;background:linear-gradient(#fffdf5c9,#fffdf5c9),url('/assets/paint.webp') center/1600px;display:flex;align-items:center;overflow:hidden}
    .sheet{justify-content:center}.copy{text-align:center}.logo{width:610px;height:440px;margin:0 auto 20px}.logo svg{display:block;width:100%;height:100%}.url{display:inline-block;background:#ffe29a;padding:10px 28px;border-radius:24px;font:28px Rounded;letter-spacing:.035em}
    </style><div class="sheet"><div class="copy"><div class="logo">${art.logo}</div><span class="url">mcmcnkcn.github.io</span></div></div></html>`;
  await writeFile(root+`dist/__og/${id}.html`,html.replaceAll('./assets/','/assets/'));
}

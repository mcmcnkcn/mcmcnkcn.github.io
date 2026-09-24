import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {games,pageMeta} from '../src/games.js';
const root=fileURLToPath(new URL('../',import.meta.url));
execFileSync(process.execPath,[root+'scripts/build.mjs']);
test('published game uses its new path and valid service-worker hashes',async()=>{
  const base='/games/mcmcnkcn/play/';
  const html=await readFile(root+'dist'+base+'index.html','utf8');
  assert.ok(html.includes(`<base href="${base}">`));
  const manifest=JSON.parse(await readFile(root+'dist'+base+'ngsw.json','utf8'));
  assert.equal(manifest.index,base+'index.html');
  for(const [path,hash] of Object.entries(manifest.hashTable)){
    assert.ok(path.startsWith(base));
    assert.equal(createHash('sha1').update(await readFile(root+'dist'+path)).digest('hex'),hash,path);
  }
  await assert.rejects(access(root+'dist/demo'));
  await assert.rejects(access(root+'dist/__og'));
});
for(const game of [null,...games.filter(g=>!g.preview)])test(`static HTML: ${game?.path||'/'}`,async()=>{
  const html=await readFile(root+'dist'+(game?.path||'/')+'index.html','utf8'),meta=pageMeta(game);
  assert.ok(html.includes(`<title>${meta.title}</title>`));
  assert.ok(html.includes(`rel="canonical" href="${meta.url}"`));
  assert.ok(html.includes(`property="og:image" content="${meta.image}"`));
  assert.ok(!html.includes('noindex'));
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(html));
  if(game){
    assert.ok(html.includes('open data-static-detail'));
    assert.ok(html.includes(`<h2 id="detail-title">${game.name}</h2>`));
    assert.ok(html.includes(game.description));
    assert.ok(html.includes(`href="${game.url}"`));
    assert.ok(!html.includes('体験版'));
  }else for(const g of games.filter(g=>!g.preview))assert.ok(html.includes(`href="${g.path}"`));
  for(const [,url] of html.matchAll(/(?:src|href)="(\/assets\/[^"#]+)"/g))await access(root+'dist'+url);
  await access(root+'dist'+new URL(meta.image).pathname);
});
test('sitemap covers exactly the public introduction routes',async()=>{
  const xml=await readFile(root+'dist/sitemap.xml','utf8');
  assert.equal((xml.match(/<loc>/g)||[]).length,3);
  for(const g of [null,...games.filter(g=>!g.preview)])assert.ok(xml.includes(pageMeta(g).url));
});
test('404 has an ordinary home link and root-relative resources, without redirects',async()=>{
  const html=await readFile(root+'dist/404.html','utf8');
  assert.ok(html.includes('name="robots" content="noindex"'));
  assert.ok(html.includes('href="/"'));
  assert.ok(!/http-equiv="refresh"|\/demo\//i.test(html));
  for(const [,url] of html.matchAll(/(?:src|href)="(\/[^"#]+)"/g))await access(root+'dist'+url);
});

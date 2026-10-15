import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../src/analytics.js',import.meta.url),'utf8').replaceAll('export ','');
function setup({saved=null,blocked=false,origin='https://mcmcnkcn.github.io'}={}){
  const scripts=[],listeners={},buttons={},status={textContent:''},writes=[];
  let reloads=0;
  const location={origin,hostname:new URL(origin).hostname,pathname:'/',href:origin+'/',reload(){reloads++;}};
  const document={title:'Circle',referrer:'',cookie:'',head:{append(script){scripts.push(script);}},createElement(){return {};},
    querySelector(selector){assert.equal(selector,'#analytics-status');return status;},
    querySelectorAll(){return ['granted','denied'].map(value=>({dataset:{analyticsChoice:value},addEventListener(_,fn){buttons[value]=fn;}}));}};
  const window={addEventListener(name,fn){listeners[name]=fn;}};
  const localStorage={getItem(){if(blocked)throw Error('blocked');return saved;},setItem(k,v){writes.push([k,v]);if(blocked)throw Error('blocked');saved=v;}};
  runInNewContext(source+'\ninitAnalytics();',{window,document,location,localStorage,URL});
  return {window,scripts,buttons,status,writes,listeners,reloads:()=>reloads};
}
test('first visit starts analytics without a prompt or writing explicit consent',()=>{
  const app=setup();
  assert.equal(app.scripts.length,1);
  assert.equal(app.writes.length,0);
  assert.match(app.status.textContent,/ON/);
  assert.equal(app.window.dataLayer.filter(args=>args[0]==='event'&&args[1]==='page_view').length,1);
});
test('stored refusal does not load analytics, and settings can enable it',()=>{
  const app=setup({saved:'denied'});
  assert.equal(app.scripts.length,0);
  assert.match(app.status.textContent,/OFF/);
  app.buttons.granted();
  assert.equal(app.scripts.length,1);
  assert.equal(app.writes[0][1],'granted');
});
test('opting out stops tracking, saves refusal and reloads to unload tag listeners',()=>{
  const app=setup();
  app.buttons.denied();
  assert.equal(app.window['ga-disable-G-Q4Q5TFM9LW'],true);
  assert.equal(app.writes[0][1],'denied');
  assert.equal(app.reloads(),1);
});
test('refusal in another tab disables tracking',()=>{
  const app=setup();
  app.listeners.storage({key:'mico-analytics-v1',newValue:'denied'});
  assert.equal(app.window['ga-disable-G-Q4Q5TFM9LW'],true);
  assert.equal(app.reloads(),1);
});
test('unreadable preferences and previews do not load analytics',()=>{
  assert.equal(setup({blocked:true}).scripts.length,0);
  assert.equal(setup({origin:'http://localhost:3000'}).scripts.length,0);
});

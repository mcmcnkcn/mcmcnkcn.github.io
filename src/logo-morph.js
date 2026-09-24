// Normalize only commands present in these original paths. Unsupported commands fail loudly.
export function absolutePath(d){
  const tokens=d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g);
  let i=0,cmd,x=0,y=0,sx=0,sy=0,control=null;const out=[];
  while(i<tokens.length){
    if(/^[a-zA-Z]$/.test(tokens[i]))cmd=tokens[i++];
    const type=cmd.toUpperCase(),relative=cmd!==type;
    if(type==='Z'){out.push(['Z']);x=sx;y=sy;control=null;cmd=null;continue}
    const count={M:2,L:2,C:6,S:4}[type];
    if(!count)throw Error('Unsupported SVG command: '+cmd);
    const values=tokens.slice(i,i+count).map(Number);i+=count;
    if(values.length!==count||values.some(v=>!Number.isFinite(v)))throw Error('Invalid SVG coordinates');
    for(let j=0;j<count;j+=2){values[j]+=relative?x:0;values[j+1]+=relative?y:0}
    if(type==='S')values.unshift(control?2*x-control[0]:x,control?2*y-control[1]:y);
    out.push([type==='S'?'C':type,...values]);
    x=values.at(-2);y=values.at(-1);
    control=type==='C'||type==='S'?values.slice(-4,-2):null;
    if(type==='M'){sx=x;sy=y;cmd=relative?'l':'L'}
  }
  return out;
}
const clamp=x=>Math.max(0,Math.min(1,x));
function pulse(t,start,duration){const u=(t-start)/duration;return u<=0||u>=1?0:Math.sin(Math.PI*u)**2}
function oscillate(t,start,duration){const u=(t-start)/duration;return u<=0||u>=1?0:Math.sin(u*Math.PI*5)*(1-u)**2*Math.min(1,u*12)}
export function installMorph(root, originalRender){
  const elements=[root.querySelector('#mascot-base > path'),...root.querySelectorAll('#ornament-left-streamers > path,#ornament-right-streamers > path')];
  const paths=elements.map(el=>{const d=el.getAttribute('d');return{el,d,segments:absolutePath(d),box:el.getBBox()}});
  return t=>{
    originalRender(t);
    paths.forEach(({el,d,segments,box},i)=>{
      const cheek=-.6*pulse(t,.66,.34)+pulse(t,.96,.35)-.4*pulse(t,1.28,.31)+.17*pulse(t,1.59,.32);
      const wave=oscillate(t,.8+(i%4)*.055,1.65);
      const strength=i===0?cheek:wave;
      if(Math.abs(strength)<1e-9){el.setAttribute('d',d);return}
      const deform=(x,y)=>{
        if(i===0){
          // Local cheek bulge: ears and forehead are completely unaffected.
          const w=clamp((y-345)/210),side=(x-785)/290;
          return[x+side*52*w*strength,y+18*w*strength];
        }
        // Pin each paper segment's upper edge; displacement grows quadratically toward its tip.
        const u=clamp((y-box.y)/box.height),direction=i<5?1:-1;
        return[x+direction*42*u*u*strength,y+10*u*u*strength];
      };
      el.setAttribute('d',segments.map(([cmd,...coords])=>{
        const values=[];for(let j=0;j<coords.length;j+=2)values.push(...deform(coords[j],coords[j+1]));
        return cmd+' '+values.map(v=>v.toFixed(4)).join(' ');
      }).join(' '));
    });
  };
}

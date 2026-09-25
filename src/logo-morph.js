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

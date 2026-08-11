export function palette(t){
  const stops=[[248,214,188],[235,191,164],[208,159,133],[161,113,91],[109,72,58]];
  const p=Math.max(0,Math.min(1,t/100))*(stops.length-1),i=Math.floor(p),f=p-i;
  const a=stops[i],b=stops[Math.min(i+1,stops.length-1)],m=k=>Math.round(a[k]+(b[k]-a[k])*f);
  const r=m(0),g=m(1),bl=m(2);
  return {
    skin:`rgb(${r},${g},${bl})`,
    shadow:`rgb(${Math.round(r*.78)},${Math.round(g*.72)},${Math.round(bl*.70)})`,
    light:`rgb(${Math.min(255,Math.round(r*1.05+8))},${Math.min(255,Math.round(g*1.04+6))},${Math.min(255,Math.round(bl*1.02+4))})`,
    outline:`rgb(${Math.round(r*.42)},${Math.round(g*.31)},${Math.round(bl*.28)})`,
    hair:'#2d1d18',hair2:'#4a2b22',eye:'#2b2523',cloth:'#a79a8b',clothShadow:'#817467'
  };
}

export function stamp(buffer,mask,cx,top,{scaleRow=()=>1,shade='skin',stretch=0}={}){
  const h=mask.length,w=mask[0].length,mid=(w-1)/2;
  const rows=[];
  for(let y=0;y<h;y++){
    rows.push(y);
    if(stretch>0 && y>h*.35 && y<h*.9){
      const step=Math.max(1,Math.floor((h*.55)/(stretch+1)));
      if(y%step===0) rows.push(y);
    }
  }
  rows.forEach((srcY,outY)=>{
    const s=scaleRow(srcY/(h-1));
    for(let x=0;x<w;x++) if(mask[srcY][x]!==' '&&mask[srcY][x]!=='.'){
      const px=Math.round(cx+(x-mid)*s),py=top+outY;
      buffer.set(`${px},${py}`,shade);
    }
  });
}

export function pixel(buffer,x,y,shade='skin'){buffer.set(`${x},${y}`,shade);}

export function draw(ctx,buffer,pal,unit=2){
  const keys=new Set(buffer.keys());
  for(const [key,shade] of buffer){
    const [x,y]=key.split(',').map(Number);
    const edge=[`${x-1},${y}`,`${x+1},${y}`,`${x},${y-1}`,`${x},${y+1}`].some(k=>!keys.has(k));
    let c=pal[shade]||pal.skin;
    if(edge && ['skin','shadow','light'].includes(shade)) c=pal.outline;
    ctx.fillStyle=c;ctx.fillRect(x*unit,y*unit,unit,unit);
  }
}

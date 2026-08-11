import {buildLayers} from './layerBuilder.js';

let layersPromise;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

function zoneScale(t,state){
  const sh=(state.shoulders-100)/100;
  const wa=(state.waist-100)/100;
  const hi=(state.hips-100)/100;
  if(t<.22) return 1;
  if(t<.38){const u=(t-.22)/.16;return 1+sh*.22*Math.sin(Math.PI*clamp(u,0,1));}
  if(t<.56){const u=(t-.38)/.18;return 1+wa*.20*Math.sin(Math.PI*clamp(u,0,1));}
  if(t<.74){const u=(t-.56)/.18;return 1+hi*.24*Math.sin(Math.PI*clamp(u,0,1));}
  if(t<.90){const u=(t-.74)/.16;return 1+hi*.07*(1-clamp(u,0,1));}
  return 1;
}

function yMap(t,state){
  const delta=state.height-168;
  const bodyExtra=delta*.14;
  const legExtra=delta*.70;
  if(t<.58) return t*(1+bodyExtra/360);
  const upper=.58*(1+bodyExtra/360);
  return upper+(t-.58)*(1+(bodyExtra+legExtra)/360);
}

function drawWarped(ctx,layer,canvas,state,mode='body'){
  const baseH=360, baseW=129;
  const centerX=Math.round(canvas.width/2);
  const top=Math.round((canvas.height-baseH)/2);
  for(let sy=0;sy<layer.height;sy++){
    const t=sy/(layer.height-1);
    const mapped=yMap(t,state);
    const mapped2=yMap((sy+1)/layer.height,state);
    const dy=top+Math.floor(mapped*baseH);
    const nextDy=top+Math.floor(mapped2*baseH);
    const dh=Math.max(1,nextDy-dy);
    let localScale=zoneScale(t,state);
    if(mode==='face' || mode==='hair') localScale=1;
    if(mode==='underwearTop') localScale=t<.47?zoneScale(t,state):1;
    if(mode==='underwearBottom') localScale=t>.46&&t<.66?zoneScale(t,state):1;
    const rowW=Math.max(1,Math.round(baseW*localScale));
    const dx=Math.round(centerX-rowW/2);
    ctx.drawImage(layer,0,sy,layer.width,1,dx,dy,rowW,dh);
  }
}

export async function drawLayeredCharacter(ctx,canvas,state,debug={}){
  if(!layersPromise) layersPromise=buildLayers();
  const L=await layersPromise;
  ctx.imageSmoothingEnabled=false;

  const visible={
    hair:debug.hair!==false,
    underwear:debug.underwear!==false,
    face:debug.face!==false,
    shading:debug.shading!==false
  };

  if(visible.hair) drawWarped(ctx,L.hairBack,canvas,state,'hair');
  drawWarped(ctx,L.bodyBase,canvas,state,'body');
  if(visible.shading) drawWarped(ctx,L.bodyShading,canvas,state,'body');
  if(visible.face) drawWarped(ctx,L.face,canvas,state,'face');
  if(visible.underwear){
    drawWarped(ctx,L.underwearTop,canvas,state,'underwearTop');
    drawWarped(ctx,L.underwearBottom,canvas,state,'underwearBottom');
  }
  if(visible.hair) drawWarped(ctx,L.hairFront,canvas,state,'hair');
}

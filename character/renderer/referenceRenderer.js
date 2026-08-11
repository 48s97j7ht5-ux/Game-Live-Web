import {REFERENCE_SPRITE} from '../data/referenceSprite.js';

let spritePromise;
function loadSprite(){
  if(!spritePromise){
    spritePromise=new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=reject;
      img.src=REFERENCE_SPRITE;
    });
  }
  return spritePromise;
}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;

function bandScale(t,state){
  const sh=(state.shoulders-100)/100;
  const wa=(state.waist-100)/100;
  const hi=(state.hips-100)/100;

  // Head/hair: keep almost intact.
  if(t<0.22) return 1;

  // Shoulder/chest band.
  if(t<0.38){
    const u=(t-0.22)/0.16;
    const shoulderWeight=Math.sin(Math.PI*clamp(u,0,1));
    return 1+sh*0.32*shoulderWeight;
  }

  // Ribcage into waist.
  if(t<0.56){
    const u=(t-0.38)/0.18;
    return 1+wa*0.30*Math.sin(Math.PI*clamp(u,0,1));
  }

  // Pelvis and upper thighs.
  if(t<0.74){
    const u=(t-0.56)/0.18;
    return 1+hi*0.34*Math.sin(Math.PI*clamp(u,0,1));
  }

  // Lower legs only inherit a little from hip width.
  if(t<0.90){
    const u=(t-0.74)/0.16;
    return 1+hi*0.10*(1-clamp(u,0,1));
  }

  // Feet should stay stable.
  return 1;
}

export async function drawReference(ctx,canvas,state){
  const img=await loadSprite();
  ctx.imageSmoothingEnabled=false;

  const hScale=clamp(1+(state.height-168)/175,0.92,1.10);
  const targetH=Math.round(360*hScale);
  const baseW=129;
  const top=Math.round((canvas.height-targetH)/2);
  const centerX=Math.round(canvas.width/2);

  // Draw one source row at a time so each anatomical band can deform locally
  // while preserving the traced reference artwork and pixel texture.
  for(let sy=0;sy<img.height;sy++){
    const t=sy/(img.height-1);
    const localScale=bandScale(t,state);
    const rowW=Math.max(1,Math.round(baseW*localScale));
    const dy=top+Math.floor((sy/img.height)*targetH);
    const nextDy=top+Math.floor(((sy+1)/img.height)*targetH);
    const dh=Math.max(1,nextDy-dy);
    const dx=Math.round(centerX-rowW/2);
    ctx.drawImage(img,0,sy,img.width,1,dx,dy,rowW,dh);
  }
}

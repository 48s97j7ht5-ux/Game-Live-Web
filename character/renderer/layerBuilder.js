import {REFERENCE_SPRITE} from '../data/referenceSprite.js';

let sourcePromise;
export function loadReference(){
  if(!sourcePromise){
    sourcePromise=new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=reject;
      img.src=REFERENCE_SPRITE;
    });
  }
  return sourcePromise;
}

const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const lum=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
const sat=(r,g,b)=>{const mx=Math.max(r,g,b),mn=Math.min(r,g,b);return mx===0?0:(mx-mn)/mx;};

// v0.8 is a transitional extractor: the old reference is decomposed at runtime
// into independent canvases. This gives us the correct renderer architecture now,
// while authored body-only sprites can replace the extracted canvases later.
export async function buildLayers(){
  const img=await loadReference();
  const w=img.width,h=img.height;
  const src=makeCanvas(w,h),sctx=src.getContext('2d',{willReadFrequently:true});
  sctx.imageSmoothingEnabled=false;sctx.drawImage(img,0,0);
  const data=sctx.getImageData(0,0,w,h);

  const names=['bodyBase','bodyShading','face','hairBack','hairFront','underwearTop','underwearBottom'];
  const layers=Object.fromEntries(names.map(n=>[n,makeCanvas(w,h)]));
  const out=Object.fromEntries(names.map(n=>[n,layers[n].getContext('2d').createImageData(w,h)]));

  function put(name,i,r,g,b,a=255){const d=out[name].data;d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=a;}
  const skin=[224,150,95], skinShadow=[193,113,76], skinLight=[241,179,126];

  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const i=(y*w+x)*4, r=data.data[i],g=data.data[i+1],b=data.data[i+2],a=data.data[i+3];
    if(a<10) continue;
    const t=y/(h-1), L=lum(r,g,b), S=sat(r,g,b);
    const nearCenter=Math.abs(x-w/2)<w*.30;
    const hair=t<.31 && (L<105 || (r>g && r>b && L<135));
    const faceFeature=t>.09&&t<.24&&nearCenter&&L<95;
    const bra=t>.30&&t<.43&&nearCenter&&L>105&&S<.42;
    const panties=t>.50&&t<.62&&nearCenter&&L>100&&S<.45;

    if(hair){
      put(t<.19?'hairBack':'hairFront',i,r,g,b,a);
      continue;
    }
    if(faceFeature){put('face',i,r,g,b,a);continue;}
    if(bra){put('underwearTop',i,r,g,b,a); const c=(L<145?skinShadow:L>190?skinLight:skin);put('bodyBase',i,...c,a);continue;}
    if(panties){put('underwearBottom',i,r,g,b,a); const c=(L<145?skinShadow:L>190?skinLight:skin);put('bodyBase',i,...c,a);continue;}

    // Keep contour + base color in body; darker interior pixels become shading layer.
    if(L<125 && t>.24){put('bodyShading',i,r,g,b,a);}
    put('bodyBase',i,r,g,b,a);
  }

  // Reconstruct a clean bald scalp behind removed hair. Pixel blocks, not vector smoothing.
  const body=out.bodyBase.data;
  const cx=Math.round(w/2), cy=Math.round(h*.145), rx=Math.round(w*.145), ry=Math.round(h*.105);
  for(let y=cy-ry;y<=cy+ry;y++) for(let x=cx-rx;x<=cx+rx;x++){
    const nx=(x-cx)/rx, ny=(y-cy)/ry;
    if(nx*nx+ny*ny<=1){
      const i=(y*w+x)*4;
      if(body[i+3]===0){const edge=nx*nx+ny*ny>.78;const c=edge?skinShadow:skin;body[i]=c[0];body[i+1]=c[1];body[i+2]=c[2];body[i+3]=255;}
    }
  }

  for(const n of names) layers[n].getContext('2d').putImageData(out[n],0,0);
  return layers;
}

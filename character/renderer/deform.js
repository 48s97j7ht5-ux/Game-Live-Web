export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const mix=(a,b,t)=>a+(b-a)*t;

export function profileScale(part,t,state){
  const sh=(state.shoulders-100)/100;
  const wa=(state.waist-100)/100;
  const hi=(state.hips-100)/100;
  if(part==='torsoUpper') return t<.55 ? 1+sh*.52*(1-t/.55) : 1+sh*.08;
  if(part==='torsoMid') return 1+wa*(.44-.18*Math.abs(t-.55));
  if(part==='pelvisCore') return 1+hi*(.50-.18*t);
  if(part==='thigh') return 1+hi*(.28-.12*t);
  if(part==='upperArm') return 1+sh*.10;
  return 1;
}

export function verticalExtra(part,state){
  const h=(state.height-168)/22;
  if(part==='lowerLeg') return Math.round(h*6);
  if(part==='thigh') return Math.round(h*3);
  if(part==='torsoMid') return Math.round(h*2);
  return 0;
}

import * as THREE from 'three';
import {createSkeletonMechanicsV16} from './skeleton-mechanics-v16.js';
export const MECHANICS_VERSION='1.9.0';
const rad=THREE.MathUtils.degToRad;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
export function createSkeletonMechanicsV19(api){
 const base=createSkeletonMechanicsV16(api);
 const oldSetLegPose=base.setLegPose.bind(base);
 base.setLegPose=(side,v={})=>{
   const p=base.legs[side];if(!p)throw new Error('side must be L or R');
   p.subtalarInversion=clamp(v.subtalarInversion??v.ankleInversion??p.subtalarInversion??0,-20,20);
   p.subtalarRotation=clamp(v.subtalarRotation??p.subtalarRotation??0,-15,15);
   const result=oldSetLegPose(side,{...v,ankleInversion:0});
   const subtalar=api.getJoint(`subtalar_${side}`);if(!subtalar)throw new Error(`Mechanics v1.9 requires subtalar_${side}`);
   const sign=side==='L'?-1:1;
   const df=clamp(p.ankleFlexion,-50,25),dfNorm=smooth((df+50)/75);
   // modest physiologic coupling: more eversion/abduction toward dorsiflexion, more inversion/adduction toward plantarflexion.
   const coupledInv=THREE.MathUtils.lerp(5,-4,dfNorm);
   const coupledRot=THREE.MathUtils.lerp(4,-3,dfNorm);
   const inv=p.subtalarInversion+coupledInv,rot=p.subtalarRotation+coupledRot;
   subtalar.rotation.set(rad(df*.08),rad(sign*rot),rad(sign*-inv));
   api.jointRoot.updateMatrixWorld(true);
   return {...result,subtalarInversion:p.subtalarInversion,subtalarRotation:p.subtalarRotation,coupledSubtalarInversion:coupledInv,coupledSubtalarRotation:coupledRot};
 };
 const oldReset=base.reset.bind(base);
 base.reset=()=>{oldReset();for(const side of ['L','R']){const p=base.legs[side];p.subtalarInversion=0;p.subtalarRotation=0;const st=api.getJoint(`subtalar_${side}`);if(st)st.quaternion.identity()}api.jointRoot.updateMatrixWorld(true)};
 base.mechanicsVersion=MECHANICS_VERSION;
 return base;
}

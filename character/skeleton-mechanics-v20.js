import * as THREE from 'three';
import {createSkeletonMechanicsV19} from './skeleton-mechanics-v19.js';

export const MECHANICS_VERSION='2.0.0';
const rad=THREE.MathUtils.degToRad;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};

/**
 * Mechanics v2.0 — foot/ankle refinement.
 * Keeps v1.9 talocrural + subtalar split, but replaces the simple linear
 * coupling with phase-aware hindfoot coupling. No changes to Skeleton v1.3.
 */
export function createSkeletonMechanicsV20(api){
  const base=createSkeletonMechanicsV19(api);
  const oldSetLegPose=base.setLegPose.bind(base);

  base.setLegPose=(side,v={})=>{
    const p=base.legs[side];
    if(!p) throw new Error('side must be L or R');

    // Explicit hindfoot controls remain available to the future physics layer.
    p.subtalarInversion=clamp(v.subtalarInversion??v.ankleInversion??p.subtalarInversion??0,-20,20);
    p.subtalarRotation=clamp(v.subtalarRotation??p.subtalarRotation??0,-15,15);

    // Let v1.9 solve the rest of the leg first, then refine the subtalar axis.
    const result=oldSetLegPose(side,{...v,ankleInversion:0,subtalarInversion:p.subtalarInversion,subtalarRotation:p.subtalarRotation});
    const subtalar=api.getJoint(`subtalar_${side}`);
    if(!subtalar) throw new Error(`Mechanics v2.0 requires subtalar_${side}`);

    const sign=side==='L'?-1:1;
    const df=clamp(p.ankleFlexion,-50,25); // plantarflexion negative, dorsiflexion positive

    // Neutral zone around 0°: hindfoot coupling is intentionally small.
    const dorsi=smooth(Math.max(0,df)/25);
    const plantar=smooth(Math.max(0,-df)/50);

    // During dorsiflexion the hindfoot trends toward eversion + abduction;
    // during plantarflexion it trends toward inversion + adduction.
    const coupledInv=(-4.5*dorsi)+(5.5*plantar);
    const coupledRot=(-3.5*dorsi)+(4.5*plantar);

    // Subtalar joint is oblique, not three independent orthogonal hinges.
    // Small sagittal component keeps calcaneal motion from reading as a flat roll.
    const inv=clamp(p.subtalarInversion+coupledInv,-22,22);
    const rot=clamp(p.subtalarRotation+coupledRot,-17,17);
    const pitch=clamp(df*0.045 + Math.abs(inv)*0.08,-4,4);

    subtalar.rotation.set(
      rad(pitch),
      rad(sign*rot),
      rad(sign*-inv)
    );

    // A tiny compliant hindfoot translation: calcaneus/talus relationship is not
    // a perfect pin joint. Kept deliberately sub-centimetric for stability.
    subtalar.position.z=(subtalar.userData.restZ??subtalar.position.z) + 0.0025*dorsi - 0.0015*plantar;
    if(subtalar.userData.restZ===undefined) subtalar.userData.restZ=subtalar.position.z - 0.0025*dorsi + 0.0015*plantar;

    api.jointRoot.updateMatrixWorld(true);
    return {
      ...result,
      subtalarInversion:p.subtalarInversion,
      subtalarRotation:p.subtalarRotation,
      coupledSubtalarInversion:coupledInv,
      coupledSubtalarRotation:coupledRot,
      subtalarPitch:pitch
    };
  };

  const oldReset=base.reset.bind(base);
  base.reset=()=>{
    oldReset();
    for(const side of ['L','R']){
      const st=api.getJoint(`subtalar_${side}`);
      if(st){
        st.quaternion.identity();
        if(st.userData.restZ!==undefined) st.position.z=st.userData.restZ;
      }
    }
    api.jointRoot.updateMatrixWorld(true);
  };

  base.mechanicsVersion=MECHANICS_VERSION;
  return base;
}

import * as THREE from 'three';

/** Mechanics v1 for Skeleton Contract v1. */
export const MECHANICS_VERSION='1.0.0';
export const REQUIRED_CONTRACT_VERSION=1;

const LIMITS=Object.freeze({
 hip:{flexion:[-25,125],abduction:[-30,50],rotation:[-45,45]},
 knee:{flexion:[0,145]},
 ankle:{flexion:[-50,25],inversion:[-35,20]},
});
const clamp=(v,[a,b])=>Math.max(a,Math.min(b,Number(v)||0));

export class SkeletonMechanicsV1{
 constructor(api){
  if(!api||api.contractVersion!==REQUIRED_CONTRACT_VERSION)throw new Error(`Mechanics v1 requires skeleton contract ${REQUIRED_CONTRACT_VERSION}`);
  this.api=api;
  this.pose={L:{hipFlexion:0,hipAbduction:0,hipRotation:0,kneeFlexion:0,ankleFlexion:0,ankleInversion:0},R:{hipFlexion:0,hipAbduction:0,hipRotation:0,kneeFlexion:0,ankleFlexion:0,ankleInversion:0}};
 }
 setLegPose(side,values={}){
  if(side!=='L'&&side!=='R')throw new Error('side must be L or R');
  const p=this.pose[side];
  p.hipFlexion=clamp(values.hipFlexion??p.hipFlexion,LIMITS.hip.flexion);
  p.hipAbduction=clamp(values.hipAbduction??p.hipAbduction,LIMITS.hip.abduction);
  p.hipRotation=clamp(values.hipRotation??p.hipRotation,LIMITS.hip.rotation);
  p.kneeFlexion=clamp(values.kneeFlexion??p.kneeFlexion,LIMITS.knee.flexion);
  p.ankleFlexion=clamp(values.ankleFlexion??p.ankleFlexion,LIMITS.ankle.flexion);
  p.ankleInversion=clamp(values.ankleInversion??p.ankleInversion,LIMITS.ankle.inversion);
  this._applyLeg(side,p);return {...p};
 }
 _applyLeg(side,p){
  const hip=this.api.getJoint(`hip_${side}`),knee=this.api.getJoint(`knee_${side}`),ankle=this.api.getJoint(`ankle_${side}`);
  if(!hip||!knee||!ankle)throw new Error(`missing leg joints ${side}`);
  hip.rotation.set(THREE.MathUtils.degToRad(-p.hipFlexion),THREE.MathUtils.degToRad(p.hipRotation),THREE.MathUtils.degToRad(side==='L'?p.hipAbduction:-p.hipAbduction));
  knee.rotation.set(THREE.MathUtils.degToRad(p.kneeFlexion),0,0);
  ankle.rotation.set(THREE.MathUtils.degToRad(-p.ankleFlexion),0,THREE.MathUtils.degToRad(side==='L'?p.ankleInversion:-p.ankleInversion));
  this.api.jointRoot.updateMatrixWorld(true);
 }
 reset(){this.api.resetPose();for(const s of ['L','R'])for(const k of Object.keys(this.pose[s]))this.pose[s][k]=0;}
 getJointWorld(name){const j=this.api.getJoint(name);if(!j)throw new Error(`unknown joint ${name}`);return j.getWorldPosition(new THREE.Vector3());}
}

export function createSkeletonMechanicsV1(api){return new SkeletonMechanicsV1(api);}

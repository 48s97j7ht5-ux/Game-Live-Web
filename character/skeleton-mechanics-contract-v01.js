import * as THREE from 'three';

/** Mechanics v1 for Skeleton Contract v1. */
export const MECHANICS_VERSION='1.4.0';
export const REQUIRED_CONTRACT_VERSION=1;

const LIMITS=Object.freeze({
 hip:{flexion:[-25,125],abduction:[-30,50],rotation:[-45,45]},
 knee:{flexion:[0,145]},ankle:{flexion:[-50,25],inversion:[-35,20]},
 shoulder:{flexion:[-40,180],abduction:[-40,180],rotation:[-90,90]},
 elbow:{flexion:[0,150]},wrist:{flexion:[-80,80],deviation:[-30,30]},
 lumbar:{flexion:[-30,55],side:[-25,25],rotation:[-10,10]},
 thoracic:{flexion:[-20,35],side:[-25,25],rotation:[-35,35]},
 cervical:{flexion:[-35,45],side:[-35,35],rotation:[-55,55]},
 head:{flexion:[-20,25],rotation:[-8,8]}
});
const clamp=(v,[a,b])=>Math.max(a,Math.min(b,Number(v)||0)),rad=THREE.MathUtils.degToRad;
const LUMBAR=['spine_L5','spine_L4','spine_L3','spine_L2','spine_L1'];
const THORACIC=['spine_T12','spine_T11','spine_T10','spine_T9','spine_T8','spine_T7','spine_T6','spine_T5','spine_T4','spine_T3','spine_T2','spine_T1'];
const CERVICAL=['neck_C7','neck_C6','neck_C5','neck_C4','neck_C3','neck_C2'];
const W_LUMBAR_FLEX=[.18,.20,.22,.21,.19],W_LUMBAR_SIDE=[.16,.19,.22,.22,.21],W_LUMBAR_ROT=[.12,.17,.22,.24,.25];
const W_THOR_FLEX=[.12,.12,.11,.10,.09,.08,.08,.07,.07,.06,.05,.05],W_THOR_SIDE=[.10,.10,.10,.09,.09,.09,.08,.08,.08,.07,.06,.06],W_THOR_ROT=[.07,.08,.09,.10,.10,.10,.10,.09,.08,.07,.06,.06];
const W_CERV_FLEX=[.12,.16,.21,.22,.18,.11],W_CERV_SIDE=[.13,.17,.20,.20,.17,.13],W_CERV_ROT=[.05,.05,.06,.06,.06,.07];

export class SkeletonMechanicsV1{
 constructor(api){
  if(!api||api.contractVersion!==REQUIRED_CONTRACT_VERSION)throw new Error(`Mechanics v1 requires skeleton contract ${REQUIRED_CONTRACT_VERSION}`);
  this.api=api;
  this.legs={L:{hipFlexion:0,hipAbduction:0,hipRotation:0,kneeFlexion:0,ankleFlexion:0,ankleInversion:0},R:{hipFlexion:0,hipAbduction:0,hipRotation:0,kneeFlexion:0,ankleFlexion:0,ankleInversion:0}};
  this.arms={L:{shoulderFlexion:0,shoulderAbduction:0,shoulderRotation:0,elbowFlexion:0,wristFlexion:0,wristDeviation:0},R:{shoulderFlexion:0,shoulderAbduction:0,shoulderRotation:0,elbowFlexion:0,wristFlexion:0,wristDeviation:0}};
  this.torso={lumbarFlexion:0,lumbarSide:0,lumbarRotation:0,thoracicFlexion:0,thoracicSide:0,thoracicRotation:0,neckFlexion:0,neckSide:0,neckRotation:0,headFlexion:0,headRotation:0};
 }
 setLegPose(side,values={}){if(side!=='L'&&side!=='R')throw new Error('side must be L or R');const p=this.legs[side];p.hipFlexion=clamp(values.hipFlexion??p.hipFlexion,LIMITS.hip.flexion);p.hipAbduction=clamp(values.hipAbduction??p.hipAbduction,LIMITS.hip.abduction);p.hipRotation=clamp(values.hipRotation??p.hipRotation,LIMITS.hip.rotation);p.kneeFlexion=clamp(values.kneeFlexion??p.kneeFlexion,LIMITS.knee.flexion);p.ankleFlexion=clamp(values.ankleFlexion??p.ankleFlexion,LIMITS.ankle.flexion);p.ankleInversion=clamp(values.ankleInversion??p.ankleInversion,LIMITS.ankle.inversion);this._applyLeg(side,p);return {...p}}
 _applyLeg(side,p){const hip=this.api.getJoint(`hip_${side}`),knee=this.api.getJoint(`knee_${side}`),ankle=this.api.getJoint(`ankle_${side}`);if(!hip||!knee||!ankle)throw new Error(`missing leg joints ${side}`);hip.rotation.set(rad(-p.hipFlexion),rad(p.hipRotation),rad(side==='L'?p.hipAbduction:-p.hipAbduction));knee.rotation.set(rad(p.kneeFlexion),0,0);ankle.rotation.set(rad(-p.ankleFlexion),0,rad(side==='L'?p.ankleInversion:-p.ankleInversion));this.api.jointRoot.updateMatrixWorld(true)}
 setArmPose(side,values={}){if(side!=='L'&&side!=='R')throw new Error('side must be L or R');const p=this.arms[side];p.shoulderFlexion=clamp(values.shoulderFlexion??p.shoulderFlexion,LIMITS.shoulder.flexion);p.shoulderAbduction=clamp(values.shoulderAbduction??p.shoulderAbduction,LIMITS.shoulder.abduction);p.shoulderRotation=clamp(values.shoulderRotation??p.shoulderRotation,LIMITS.shoulder.rotation);p.elbowFlexion=clamp(values.elbowFlexion??p.elbowFlexion,LIMITS.elbow.flexion);p.wristFlexion=clamp(values.wristFlexion??p.wristFlexion,LIMITS.wrist.flexion);p.wristDeviation=clamp(values.wristDeviation??p.wristDeviation,LIMITS.wrist.deviation);this._applyArm(side,p);return {...p}}
 _applyArm(side,p){
  const sc=this.api.getJoint(`sc_${side}`),ac=this.api.getJoint(`ac_${side}`),scap=this.api.getJoint(`scapula_${side}`),shoulder=this.api.getJoint(`shoulder_${side}`),elbow=this.api.getJoint(`elbow_${side}`),wrist=this.api.getJoint(`wrist_${side}`);
  if(!sc||!ac||!scap||!shoulder||!elbow||!wrist)throw new Error(`missing shoulder-complex joints ${side}`);
  const sign=side==='L'?-1:1;
  const activeFlex=Math.max(0,p.shoulderFlexion),activeAbd=Math.max(0,p.shoulderAbduction);
  const elevation=Math.min(180,Math.hypot(activeFlex,activeAbd));
  // Scapular setting phase first, then a progressive scapulothoracic contribution.
  // This approaches the classic ~2:1 GH:scapular rhythm without pretending it is constant.
  const scapUp=Math.min(58,Math.max(0,elevation-30)*.37);
  const ghScale=elevation>.001?(elevation-scapUp)/elevation:1;
  const clavicleUp=scapUp*.25,acUp=scapUp*.35,stUp=scapUp*.40;
  const flexShare=elevation>.001?activeFlex/elevation:0;
  sc.rotation.set(0,0,rad(sign*clavicleUp));
  ac.rotation.set(0,0,rad(sign*acUp));
  // Scapulothoracic pseudo-joint: upward rotation plus modest posterior tilt/external rotation.
  scap.rotation.set(rad(-scapUp*.16*flexShare),rad(sign*scapUp*.10*flexShare),rad(sign*stUp));
  shoulder.rotation.set(rad(-p.shoulderFlexion*ghScale),rad(p.shoulderRotation),rad(sign*p.shoulderAbduction*ghScale));
  elbow.rotation.set(rad(-p.elbowFlexion),0,0);
  wrist.rotation.set(rad(-p.wristFlexion),0,rad(side==='L'?-p.wristDeviation:p.wristDeviation));
  this.api.jointRoot.updateMatrixWorld(true);
 }
 setTorsoPose(values={}){const p=this.torso;for(const [k,lim] of [['lumbarFlexion',LIMITS.lumbar.flexion],['lumbarSide',LIMITS.lumbar.side],['lumbarRotation',LIMITS.lumbar.rotation],['thoracicFlexion',LIMITS.thoracic.flexion],['thoracicSide',LIMITS.thoracic.side],['thoracicRotation',LIMITS.thoracic.rotation],['neckFlexion',LIMITS.cervical.flexion],['neckSide',LIMITS.cervical.side],['neckRotation',LIMITS.cervical.rotation],['headFlexion',LIMITS.head.flexion],['headRotation',LIMITS.head.rotation]])p[k]=clamp(values[k]??p[k],lim);this._applyTorso(p);return {...p}}
 _applyTorso(p){
  for(let i=0;i<LUMBAR.length;i++){const j=this.api.getJoint(LUMBAR[i]);if(!j)throw new Error(`missing spine joint ${LUMBAR[i]}`);j.rotation.set(rad(-p.lumbarFlexion*W_LUMBAR_FLEX[i]),rad(p.lumbarRotation*W_LUMBAR_ROT[i]),rad(-p.lumbarSide*W_LUMBAR_SIDE[i]));}
  for(let i=0;i<THORACIC.length;i++){const j=this.api.getJoint(THORACIC[i]);if(!j)throw new Error(`missing spine joint ${THORACIC[i]}`);j.rotation.set(rad(-p.thoracicFlexion*W_THOR_FLEX[i]),rad(p.thoracicRotation*W_THOR_ROT[i]),rad(-p.thoracicSide*W_THOR_SIDE[i]));}
  for(let i=0;i<CERVICAL.length;i++){const j=this.api.getJoint(CERVICAL[i]);if(!j)throw new Error(`missing spine joint ${CERVICAL[i]}`);j.rotation.set(rad(-p.neckFlexion*W_CERV_FLEX[i]),rad(p.neckRotation*W_CERV_ROT[i]),rad(-p.neckSide*W_CERV_SIDE[i]));}
  const c1=this.api.getJoint('neck_C1'),head=this.api.getJoint('head');if(!c1||!head)throw new Error('missing upper cervical/head joints');
  c1.rotation.set(rad(-p.neckFlexion*.04),rad(p.neckRotation*.65),rad(-p.neckSide*.04));
  head.rotation.set(rad(-p.headFlexion),rad(p.headRotation),0);
  this.api.jointRoot.updateMatrixWorld(true);
 }
 reset(){this.api.resetPose();for(const s of ['L','R']){for(const k of Object.keys(this.legs[s]))this.legs[s][k]=0;for(const k of Object.keys(this.arms[s]))this.arms[s][k]=0}for(const k of Object.keys(this.torso))this.torso[k]=0}
 getJointWorld(name){const j=this.api.getJoint(name);if(!j)throw new Error(`unknown joint ${name}`);return j.getWorldPosition(new THREE.Vector3())}
}
export function createSkeletonMechanicsV1(api){return new SkeletonMechanicsV1(api)}
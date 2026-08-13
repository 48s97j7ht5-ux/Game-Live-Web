import * as THREE from 'three';
import {createSkeletonMechanicsV20} from './skeleton-mechanics-v20.js';

export const MECHANICS_VERSION='2.1.0';
export const REQUIRED_SKELETON_VERSION='1.6';
const rad=THREE.MathUtils.degToRad;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const copy=o=>JSON.parse(JSON.stringify(o));

/**
 * Conservative active ROM for an ordinary healthy adult.
 * Limits intentionally sit below passive/athletic extremes.
 * Signed conventions:
 *  - flexion is positive; extension is negative
 *  - abduction is positive; adduction is negative
 *  - axial rotation is positive external/supination, negative internal/pronation
 *  - ankle flexion is positive dorsiflexion, negative plantarflexion
 */
export const ORDINARY_ADULT_ROM=Object.freeze({
 shoulder:Object.freeze({flexion:[-35,160],abduction:[-25,150],rotation:[-65,75]}),
 elbow:Object.freeze({flexion:[0,145]}),
 forearm:Object.freeze({rotation:[-75,85]}),
 wrist:Object.freeze({flexion:[-60,70],deviation:[-20,30]}),
 fingers:Object.freeze({curl:[0,100],spread:[0,18],thumbOpposition:[0,45],thumbCurl:[0,70]}),
 hip:Object.freeze({flexion:[-18,120],abduction:[-20,40],rotation:[-35,45]}),
 knee:Object.freeze({flexion:[0,138]}),
 ankle:Object.freeze({flexion:[-50,20]}),
 subtalar:Object.freeze({inversion:[-10,25],rotation:[-10,10]}),
 toes:Object.freeze({flexion:[-45,35]}),
 pelvis:Object.freeze({tilt:[-10,15],side:[-8,8],rotation:[-10,10]}),
 lumbar:Object.freeze({flexion:[-15,30],side:[-20,20],rotation:[-8,8]}),
 thoracic:Object.freeze({flexion:[-15,30],side:[-20,20],rotation:[-30,30]}),
 neck:Object.freeze({flexion:[-45,45],side:[-35,35],rotation:[-65,65]}),
 head:Object.freeze({flexion:[-15,15],rotation:[-10,10]}),
 jaw:Object.freeze({open:[0,35],protrusion:[-2,6],lateral:[-6,6]})
});

function bounded(value,range){return clamp(value,range[0],range[1])}
function ellipsePair(a,b,limitA,limitB){
 const q=(a/limitA)**2+(b/limitB)**2;
 if(q<=1)return[a,b,false];
 const k=1/Math.sqrt(q);return[a*k,b*k,true];
}
function zeroArm(){return{shoulderFlexion:0,shoulderAbduction:0,shoulderRotation:0,elbowFlexion:0,forearmRotation:0,wristFlexion:0,wristDeviation:0,fingerCurl:0,fingerSpread:0,thumbOpposition:0,thumbCurl:0}}
function zeroLeg(){return{hipFlexion:0,hipAbduction:0,hipRotation:0,kneeFlexion:0,ankleFlexion:0,subtalarInversion:0,subtalarRotation:0,toeFlexion:0}}
function zeroTorso(){return{pelvisTilt:0,pelvisSide:0,pelvisRotation:0,lumbarFlexion:0,lumbarSide:0,lumbarRotation:0,thoracicFlexion:0,thoracicSide:0,thoracicRotation:0,neckFlexion:0,neckSide:0,neckRotation:0,headFlexion:0,headRotation:0}}
function zeroJaw(){return{open:0,protrusion:0,lateral:0}}

export class SkeletonMechanicsV21{
 constructor(api){
  if(!api||api.skeletonVersion!==REQUIRED_SKELETON_VERSION)throw new Error(`Mechanics v2.1 requires Skeleton v${REQUIRED_SKELETON_VERSION}`);
  this.api=api;this.legacy=createSkeletonMechanicsV20(api);
  this.arms={L:zeroArm(),R:zeroArm()};this.legs={L:zeroLeg(),R:zeroLeg()};this.torso=zeroTorso();this.jaw=zeroJaw();
  this.mechanicsVersion=MECHANICS_VERSION;this.limits=ORDINARY_ADULT_ROM;this.lastConstraints=[];
  this.restRootPosition=api.jointRoot.position.clone();this.restJawPosition=api.getJoint('jaw')?.position.clone()??new THREE.Vector3();
 }
 _constraint(name,requested,applied){if(Math.abs(requested-applied)>.0001)this.lastConstraints.push({name,requested,applied})}
 setArmPose(side,v={}){
  const p=this.arms[side];if(!p)throw new Error('side must be L or R');this.lastConstraints=[];
  const req={...p,...v};
  p.shoulderFlexion=bounded(req.shoulderFlexion,ORDINARY_ADULT_ROM.shoulder.flexion);
  p.shoulderAbduction=bounded(req.shoulderAbduction,ORDINARY_ADULT_ROM.shoulder.abduction);
  // A vector envelope prevents 160° flexion and 150° abduction being stacked into an impossible diagonal elevation.
  if(p.shoulderFlexion>0&&p.shoulderAbduction>0){const pair=ellipsePair(p.shoulderFlexion,p.shoulderAbduction,160,150);p.shoulderFlexion=pair[0];p.shoulderAbduction=pair[1]}
  const elevation=Math.hypot(Math.max(0,p.shoulderFlexion),Math.max(0,p.shoulderAbduction)),ep=smooth(elevation/160);
  const rotationMin=-65+10*ep,rotationMax=60+15*ep;
  p.shoulderRotation=clamp(req.shoulderRotation,rotationMin,rotationMax);
  p.elbowFlexion=bounded(req.elbowFlexion,ORDINARY_ADULT_ROM.elbow.flexion);
  p.forearmRotation=bounded(req.forearmRotation,ORDINARY_ADULT_ROM.forearm.rotation);
  p.wristFlexion=bounded(req.wristFlexion,ORDINARY_ADULT_ROM.wrist.flexion);
  p.wristDeviation=bounded(req.wristDeviation,ORDINARY_ADULT_ROM.wrist.deviation);
  const wfLim=p.wristFlexion>=0?70:60,wdLim=p.wristDeviation>=0?30:20,wp=ellipsePair(p.wristFlexion,p.wristDeviation,wfLim,wdLim);p.wristFlexion=wp[0];p.wristDeviation=wp[1];
  p.fingerCurl=bounded(req.fingerCurl,ORDINARY_ADULT_ROM.fingers.curl);
  p.fingerSpread=bounded(req.fingerSpread,ORDINARY_ADULT_ROM.fingers.spread)*(1-.75*smooth(p.fingerCurl/100));
  p.thumbOpposition=bounded(req.thumbOpposition,ORDINARY_ADULT_ROM.fingers.thumbOpposition);
  p.thumbCurl=bounded(req.thumbCurl,ORDINARY_ADULT_ROM.fingers.thumbCurl);
  for(const k of Object.keys(p))this._constraint(`arm.${side}.${k}`,Number(req[k])||0,p[k]);
  this.legacy.setArmPose(side,{shoulderFlexion:p.shoulderFlexion,shoulderAbduction:p.shoulderAbduction,shoulderRotation:p.shoulderRotation,elbowFlexion:p.elbowFlexion,wristFlexion:p.wristFlexion,wristDeviation:p.wristDeviation});
  this._applyForearmAndHand(side,p);this.api.jointRoot.updateMatrixWorld(true);return{...p,constraints:copy(this.lastConstraints)}
 }
 _applyForearmAndHand(side,p){
  const sign=side==='L'?-1:1,fore=this.api.getJoint(`forearm_rotation_${side}`);if(!fore)throw new Error(`missing forearm_rotation_${side}`);
  fore.rotation.y=rad(sign*p.forearmRotation);
  const spreadPattern=[0,1,.35,-.35,-1];
  for(let f=1;f<5;f++){
   const mcp=this.api.getJoint(`finger_mcp_${side}_${f}`),pip=this.api.getJoint(`finger_pip_${side}_${f}`),dip=this.api.getJoint(`finger_dip_${side}_${f}`);
   if(!mcp||!pip||!dip)throw new Error(`missing finger chain ${side}/${f}`);
   mcp.rotation.set(rad(-p.fingerCurl*.70),0,rad(sign*spreadPattern[f]*p.fingerSpread));
   pip.rotation.x=rad(-p.fingerCurl);dip.rotation.x=rad(-p.fingerCurl*.72);
  }
  const cmc=this.api.getJoint(`thumb_cmc_${side}`),mcp=this.api.getJoint(`thumb_mcp_${side}`),ip=this.api.getJoint(`thumb_ip_${side}`);
  cmc.rotation.set(rad(-p.thumbCurl*.20),rad(sign*p.thumbOpposition),rad(-sign*p.thumbOpposition*.45));
  mcp.rotation.x=rad(-p.thumbCurl*.65);ip.rotation.x=rad(-p.thumbCurl*.80);
 }
 setLegPose(side,v={}){
  const p=this.legs[side];if(!p)throw new Error('side must be L or R');this.lastConstraints=[];
  const req={...p,...v};
  p.kneeFlexion=bounded(req.kneeFlexion,ORDINARY_ADULT_ROM.knee.flexion);
  const kneeRelease=smooth(p.kneeFlexion/90),hipFlexMax=90+30*kneeRelease;
  p.hipFlexion=clamp(req.hipFlexion,-18,hipFlexMax);
  const deep=smooth((Math.max(0,p.hipFlexion)-75)/45),abdMax=40-10*deep;
  p.hipAbduction=clamp(req.hipAbduction,-20,abdMax);
  const rotMin=-35+12*deep,rotMax=45-15*deep;
  p.hipRotation=clamp(req.hipRotation,rotMin,rotMax);
  const dorsiMax=13+7*kneeRelease;
  p.ankleFlexion=clamp(req.ankleFlexion,-50,dorsiMax);
  p.subtalarInversion=bounded(req.subtalarInversion,ORDINARY_ADULT_ROM.subtalar.inversion);
  p.subtalarRotation=bounded(req.subtalarRotation,ORDINARY_ADULT_ROM.subtalar.rotation);
  // Combined inversion/axial motion follows an oblique subtalar envelope.
  const invLim=p.subtalarInversion>=0?25:10,st=ellipsePair(p.subtalarInversion,p.subtalarRotation,invLim,10);p.subtalarInversion=st[0];p.subtalarRotation=st[1];
  p.toeFlexion=bounded(req.toeFlexion,ORDINARY_ADULT_ROM.toes.flexion);
  if(p.ankleFlexion<-35&&p.toeFlexion<0)p.toeFlexion=Math.max(p.toeFlexion,-25);
  for(const k of Object.keys(p))this._constraint(`leg.${side}.${k}`,Number(req[k])||0,p[k]);
  this.legacy.setLegPose(side,{hipFlexion:p.hipFlexion,hipAbduction:p.hipAbduction,hipRotation:p.hipRotation,kneeFlexion:p.kneeFlexion,ankleFlexion:p.ankleFlexion,subtalarInversion:p.subtalarInversion,subtalarRotation:p.subtalarRotation});
  this._applyToes(side,p.toeFlexion);this.api.jointRoot.updateMatrixWorld(true);return{...p,constraints:copy(this.lastConstraints)}
 }
 _applyToes(side,angle){
  for(let i=0;i<5;i++){
   const mtp=this.api.getJoint(`toe_mtp_${side}_${i}`);if(!mtp)throw new Error(`missing toe_mtp_${side}_${i}`);
   mtp.rotation.x=rad(angle*(i===0?.78:.68));
   if(i===0){this.api.getJoint(`toe_ip_${side}_0`).rotation.x=rad(Math.max(0,angle)*.55)}
   else{this.api.getJoint(`toe_pip_${side}_${i}`).rotation.x=rad(Math.max(0,angle)*.65);this.api.getJoint(`toe_dip_${side}_${i}`).rotation.x=rad(Math.max(0,angle)*.35)}
  }
 }
 setTorsoPose(v={}){
  const p=this.torso,req={...p,...v};this.lastConstraints=[];
  p.pelvisTilt=bounded(req.pelvisTilt,ORDINARY_ADULT_ROM.pelvis.tilt);p.pelvisSide=bounded(req.pelvisSide,ORDINARY_ADULT_ROM.pelvis.side);p.pelvisRotation=bounded(req.pelvisRotation,ORDINARY_ADULT_ROM.pelvis.rotation);
  p.lumbarFlexion=bounded(req.lumbarFlexion,ORDINARY_ADULT_ROM.lumbar.flexion);p.lumbarSide=bounded(req.lumbarSide,ORDINARY_ADULT_ROM.lumbar.side);p.lumbarRotation=bounded(req.lumbarRotation,ORDINARY_ADULT_ROM.lumbar.rotation);
  p.thoracicFlexion=bounded(req.thoracicFlexion,ORDINARY_ADULT_ROM.thoracic.flexion);p.thoracicSide=bounded(req.thoracicSide,ORDINARY_ADULT_ROM.thoracic.side);p.thoracicRotation=bounded(req.thoracicRotation,ORDINARY_ADULT_ROM.thoracic.rotation);
  p.neckFlexion=bounded(req.neckFlexion,ORDINARY_ADULT_ROM.neck.flexion);p.neckSide=bounded(req.neckSide,ORDINARY_ADULT_ROM.neck.side);p.neckRotation=bounded(req.neckRotation,ORDINARY_ADULT_ROM.neck.rotation);
  p.headFlexion=bounded(req.headFlexion,ORDINARY_ADULT_ROM.head.flexion);p.headRotation=bounded(req.headRotation,ORDINARY_ADULT_ROM.head.rotation);
  // Large spinal movements share a common capsuloligamentous envelope.
  let q=(Math.max(0,p.lumbarFlexion)/30)**2+(Math.abs(p.lumbarSide)/20)**2+(Math.abs(p.lumbarRotation)/8)**2;if(q>1){const k=1/Math.sqrt(q);p.lumbarFlexion*=k;p.lumbarSide*=k;p.lumbarRotation*=k}
  q=(Math.max(0,p.thoracicFlexion)/30)**2+(Math.abs(p.thoracicSide)/20)**2+(Math.abs(p.thoracicRotation)/30)**2;if(q>1){const k=1/Math.sqrt(q);p.thoracicFlexion*=k;p.thoracicSide*=k;p.thoracicRotation*=k}
  q=(Math.abs(p.neckFlexion)/45)**2+(Math.abs(p.neckSide)/35)**2+(Math.abs(p.neckRotation)/65)**2;if(q>1){const k=1/Math.sqrt(q);p.neckFlexion*=k;p.neckSide*=k;p.neckRotation*=k}
  for(const k of Object.keys(p))this._constraint(`torso.${k}`,Number(req[k])||0,p[k]);
  // v2.0 used the opposite sagittal sign; negate only flexion here.
  this.legacy.setTorsoPose({lumbarFlexion:-p.lumbarFlexion,lumbarSide:p.lumbarSide,lumbarRotation:p.lumbarRotation,thoracicFlexion:-p.thoracicFlexion,thoracicSide:p.thoracicSide,thoracicRotation:p.thoracicRotation,neckFlexion:-p.neckFlexion,neckSide:p.neckSide,neckRotation:p.neckRotation,headFlexion:-p.headFlexion,headRotation:p.headRotation});
  const pelvis=this.api.getJoint('pelvis_center');pelvis.rotation.set(rad(p.pelvisTilt),rad(p.pelvisRotation),rad(-p.pelvisSide));
  this.api.jointRoot.updateMatrixWorld(true);return{...p,constraints:copy(this.lastConstraints)}
 }
 setJawPose(v={}){
  const p=this.jaw,req={...p,...v};this.lastConstraints=[];
  p.open=bounded(req.open,ORDINARY_ADULT_ROM.jaw.open);p.protrusion=bounded(req.protrusion,ORDINARY_ADULT_ROM.jaw.protrusion);p.lateral=bounded(req.lateral,ORDINARY_ADULT_ROM.jaw.lateral);
  const jaw=this.api.getJoint('jaw');if(!jaw)throw new Error('missing jaw joint');
  jaw.rotation.set(rad(p.open),rad(p.lateral*.45),rad(p.lateral*.20));jaw.position.copy(this.restJawPosition).add(new THREE.Vector3(p.lateral/1000,0,p.protrusion/1000));
  for(const k of Object.keys(p))this._constraint(`jaw.${k}`,Number(req[k])||0,p[k]);
  this.api.jointRoot.updateMatrixWorld(true);return{...p,constraints:copy(this.lastConstraints)}
 }
 setBodyPose(v={}){
  if(v.torso)this.setTorsoPose(v.torso);if(v.L||v.arms?.L)this.setArmPose('L',v.L??v.arms.L);if(v.R||v.arms?.R)this.setArmPose('R',v.R??v.arms.R);
  if(v.legs?.L)this.setLegPose('L',v.legs.L);if(v.legs?.R)this.setLegPose('R',v.legs.R);if(v.jaw)this.setJawPose(v.jaw);
  if(v.ground)this.groundToFloor();return this.getState();
 }
 groundToFloor(){
  this.api.jointRoot.updateMatrixWorld(true);let minY=Infinity;
  for(const side of ['L','R'])for(const n of [`heel_${side}`,...Array.from({length:5},(_,i)=>`tip_${side}_${i}`)]){const o=this.api.jointRoot.getObjectByName(n);if(o)minY=Math.min(minY,o.getWorldPosition(new THREE.Vector3()).y)}
  if(Number.isFinite(minY))this.api.jointRoot.position.y-=minY-.016;this.api.jointRoot.updateMatrixWorld(true);return minY;
 }
 getState(){return{mechanicsVersion:MECHANICS_VERSION,arms:copy(this.arms),legs:copy(this.legs),torso:copy(this.torso),jaw:copy(this.jaw),constraints:copy(this.lastConstraints)}}
 getRangeOfMotion(){return ORDINARY_ADULT_ROM}
 reset(){
  this.legacy.reset();this.arms={L:zeroArm(),R:zeroArm()};this.legs={L:zeroLeg(),R:zeroLeg()};this.torso=zeroTorso();this.jaw=zeroJaw();this.lastConstraints=[];this.api.jointRoot.position.copy(this.restRootPosition);
  const jaw=this.api.getJoint('jaw');if(jaw)jaw.position.copy(this.restJawPosition);
  this.api.jointRoot.updateMatrixWorld(true);
 }
 getJointWorld(name){const j=this.api.getJoint(name);if(!j)throw new Error(`unknown joint ${name}`);return j.getWorldPosition(new THREE.Vector3())}
}

export function createSkeletonMechanicsV21(api){return new SkeletonMechanicsV21(api)}

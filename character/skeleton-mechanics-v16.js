import * as THREE from 'three';

/** Mechanics v1.6 for Skeleton v1.4 development line.
 * Shoulder model: SC + AC coupled motion, scapula constrained to a calibrated thoracic ellipsoid,
 * GH motion solved as the remaining humeral elevation.
 */
export const MECHANICS_VERSION='1.6.0';
export const REQUIRED_CONTRACT_VERSION=1;

const rad=THREE.MathUtils.degToRad;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};

function worldPoint(o){return o.getWorldPosition(new THREE.Vector3())}
function landmark(scap,name){const o=scap.getObjectByName(name);return o?worldPoint(o):null}
function average(points){const v=new THREE.Vector3();for(const p of points)v.add(p);return v.multiplyScalar(1/points.length)}

function initShoulder(api,side){
 const scap=api.getJoint(`scapula_${side}`),sc=api.getJoint(`sc_${side}`),ac=api.getJoint(`ac_${side}`),gh=api.getJoint(`shoulder_${side}`);
 if(!scap||!sc||!ac||!gh)throw new Error(`v1.6 missing shoulder complex ${side}`);
 if(scap.userData.stModel)return scap.userData.stModel;
 api.jointRoot.updateMatrixWorld(true);
 const pts=[landmark(scap,`scMed${side}`),landmark(scap,`scInf${side}`),landmark(scap,`scAc${side}`),landmark(scap,`scGlen${side}`)].filter(Boolean);
 const pivot=average(pts);
 const t3=worldPoint(api.getJoint('spine_T3')),t7=worldPoint(api.getJoint('spine_T7'));
 const centerY=(t3.y+t7.y)*.5+.015,centerZ=(t3.z+t7.z)*.5+.018;
 const sideSign=side==='L'?-1:1;
 const rx=Math.max(.17,Math.abs(pivot.x)*1.13),rz=.135;
 const nx=clamp(Math.abs(pivot.x)/rx,0,.985);
 const restSurfaceZ=centerZ-rz*Math.sqrt(Math.max(.001,1-nx*nx));
 const zBias=pivot.z-restSurfaceZ;
 const pivotLocal=scap.worldToLocal(pivot.clone());
 const model={
  sideSign,pivotLocal,restPivotWorld:pivot.clone(),restPosition:scap.position.clone(),restQuaternion:scap.quaternion.clone(),
  thorax:{centerY,centerZ,rx,rz,zBias},
  restGH:worldPoint(gh)
 };
 scap.userData.stModel=model;return model;
}

function thoraxSurface(model,x,y){
 const {centerZ,rx,rz,zBias}=model.thorax;
 const nx=clamp(Math.abs(x)/rx,0,.985);
 const z=centerZ-rz*Math.sqrt(Math.max(.001,1-nx*nx))+zBias;
 return new THREE.Vector3(x,y,z);
}

function surfaceNormal(model,p){
 const {centerZ,rx,rz,zBias}=model.thorax;
 const cz=centerZ+zBias;
 return new THREE.Vector3(p.x/(rx*rx),0,(p.z-cz)/(rz*rz)).normalize();
}

function setScapulaWorldPose(scap,model,desiredPivotWorld,worldQuat){
 const parent=scap.parent; parent.updateMatrixWorld(true);
 const invParent=parent.matrixWorld.clone().invert();
 const parentQuat=parent.getWorldQuaternion(new THREE.Quaternion());
 const localQuat=parentQuat.clone().invert().multiply(worldQuat);
 scap.quaternion.copy(localQuat);
 scap.updateMatrixWorld(true);
 const rotatedPivot=model.pivotLocal.clone().applyQuaternion(scap.quaternion);
 const desiredLocal=desiredPivotWorld.clone().applyMatrix4(invParent);
 scap.position.copy(desiredLocal).sub(rotatedPivot);
 scap.updateMatrixWorld(true);
}

function solveScapula(api,side,elevation,planeShare){
 const scap=api.getJoint(`scapula_${side}`),model=initShoulder(api,side),sign=model.sideSign;
 const p=smooth((elevation-20)/160);
 // Healthy elevation: upward rotation dominates; flexion adds more posterior tilt/external rotation.
 const upward=(52+4*(1-planeShare))*p;
 const posterior=(18+5*planeShare)*p;
 const external=(10+7*planeShare)*p;
 // Scapular centroid glides superiorly and slightly laterally, but remains on thoracic surface.
 const y=model.restPivotWorld.y+.020*p;
 const x=model.restPivotWorld.x+sign*.014*p;
 const pivot=thoraxSurface(model,x,y);
 const n=surfaceNormal(model,pivot);
 // Build a tangent frame on the thorax, then apply anatomical rotations in that frame.
 const up=new THREE.Vector3(0,1,0);
 const tangentX=new THREE.Vector3().crossVectors(up,n).normalize();
 if(sign<0)tangentX.negate();
 const tangentY=new THREE.Vector3().crossVectors(n,tangentX).normalize();
 const basis=new THREE.Matrix4().makeBasis(tangentX,tangentY,n);
 const qBase=new THREE.Quaternion().setFromRotationMatrix(basis);
 const qUp=new THREE.Quaternion().setFromAxisAngle(n,rad(sign*upward));
 const qTilt=new THREE.Quaternion().setFromAxisAngle(tangentX,rad(-posterior));
 const qER=new THREE.Quaternion().setFromAxisAngle(tangentY,rad(sign*external));
 const q=qBase.clone().multiply(qUp).multiply(qTilt).multiply(qER);
 // Preserve the rest orientation offset relative to our surface frame.
 if(!model.restOffset){
  const restBasisQ=qBase.clone();
  model.restOffset=restBasisQ.invert().multiply(scap.getWorldQuaternion(new THREE.Quaternion()));
 }
 q.multiply(model.restOffset);
 setScapulaWorldPose(scap,model,pivot,q);
 return {upward,posterior,external,pivot};
}

export class SkeletonMechanicsV16{
 constructor(api){
  if(!api||api.contractVersion!==REQUIRED_CONTRACT_VERSION)throw new Error('Mechanics v1.6 requires Skeleton Contract v1');
  this.api=api;
  this.arms={L:{shoulderFlexion:0,shoulderAbduction:0,shoulderRotation:0,elbowFlexion:0,wristFlexion:0,wristDeviation:0},R:{shoulderFlexion:0,shoulderAbduction:0,shoulderRotation:0,elbowFlexion:0,wristFlexion:0,wristDeviation:0}};
  this.legs={L:{hipFlexion:0,kneeFlexion:0,ankleFlexion:0},R:{hipFlexion:0,kneeFlexion:0,ankleFlexion:0}};
  for(const s of ['L','R'])initShoulder(api,s);
 }
 setArmPose(side,v={}){
  const p=this.arms[side];if(!p)throw new Error('side must be L or R');
  p.shoulderFlexion=clamp(v.shoulderFlexion??p.shoulderFlexion,-40,180);p.shoulderAbduction=clamp(v.shoulderAbduction??p.shoulderAbduction,-40,180);p.shoulderRotation=clamp(v.shoulderRotation??p.shoulderRotation,-90,90);p.elbowFlexion=clamp(v.elbowFlexion??p.elbowFlexion,0,150);p.wristFlexion=clamp(v.wristFlexion??p.wristFlexion,-80,80);p.wristDeviation=clamp(v.wristDeviation??p.wristDeviation,-30,30);
  this._applyArm(side,p);return {...p};
 }
 _applyArm(side,p){
  const sign=side==='L'?-1:1,sc=this.api.getJoint(`sc_${side}`),ac=this.api.getJoint(`ac_${side}`),shoulder=this.api.getJoint(`shoulder_${side}`),elbow=this.api.getJoint(`elbow_${side}`),wrist=this.api.getJoint(`wrist_${side}`);
  const f=Math.max(0,p.shoulderFlexion),a=Math.max(0,p.shoulderAbduction),e=Math.min(180,Math.hypot(f,a)),flexShare=e>.001?f/e:0;
  const progress=smooth((e-15)/165);
  // SC: small elevation + posterior rotation/retraction. AC: additional upward rotation. Keep both modest.
  sc.rotation.set(rad(-2*progress),rad(sign*4*progress),rad(sign*7*progress));
  ac.rotation.set(rad(-2*progress),rad(sign*3*progress),rad(sign*6*progress));
  this.api.jointRoot.updateMatrixWorld(true);
  const scap=solveScapula(this.api,side,e,flexShare);
  // Remaining elevation belongs to GH; capped below the full global arm elevation.
  const scapContribution=scap.upward;
  const ghScale=e>.001?clamp((e-scapContribution)/e,.55,1):1;
  shoulder.rotation.set(rad(-p.shoulderFlexion*ghScale),rad(p.shoulderRotation),rad(sign*p.shoulderAbduction*ghScale));
  elbow.rotation.set(rad(-p.elbowFlexion),0,0);wrist.rotation.set(rad(-p.wristFlexion),0,rad(side==='L'?-p.wristDeviation:p.wristDeviation));
  this.api.jointRoot.updateMatrixWorld(true);
 }
 setLegPose(side,v={}){const hip=this.api.getJoint(`hip_${side}`),knee=this.api.getJoint(`knee_${side}`),ankle=this.api.getJoint(`ankle_${side}`);const p=this.legs[side];p.hipFlexion=clamp(v.hipFlexion??p.hipFlexion,-25,125);p.kneeFlexion=clamp(v.kneeFlexion??p.kneeFlexion,0,145);p.ankleFlexion=clamp(v.ankleFlexion??p.ankleFlexion,-50,25);hip.rotation.set(rad(-p.hipFlexion),0,0);knee.rotation.set(rad(p.kneeFlexion),0,0);ankle.rotation.set(rad(-p.ankleFlexion),0,0);this.api.jointRoot.updateMatrixWorld(true);return {...p}}
 reset(){this.api.resetPose();for(const side of ['L','R']){for(const k in this.arms[side])this.arms[side][k]=0;for(const k in this.legs[side])this.legs[side][k]=0;const scap=this.api.getJoint(`scapula_${side}`),m=scap?.userData.stModel;if(m){scap.position.copy(m.restPosition);scap.quaternion.copy(m.restQuaternion)}}this.api.jointRoot.updateMatrixWorld(true)}
 getJointWorld(name){const j=this.api.getJoint(name);if(!j)throw new Error(`unknown joint ${name}`);return worldPoint(j)}
}
export function createSkeletonMechanicsV16(api){return new SkeletonMechanicsV16(api)}

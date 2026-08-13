import * as THREE from 'three';
import {createSkeletonMechanicsV22} from './skeleton-mechanics-v22.js';

/**
 * Mechanics v2.3 — coordinated upper-limb kinematics.
 *
 * The UI still exposes familiar forward/side sliders, but they are interpreted
 * as components of one humerothoracic elevation vector. The scapuloclavicular
 * solver remains responsible for the girdle; this layer gives the humerus one
 * swing plus one axial twist, then lets the elbow and radioulnar joint inherit
 * that frame as independent mechanisms.
 */
export const MECHANICS_VERSION='2.3.0';

const rad=THREE.MathUtils.degToRad;
const deg=THREE.MathUtils.radToDeg;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};

function initArmModel(api,side){
 const shoulder=api.getJoint(`shoulder_${side}`),elbow=api.getJoint(`elbow_${side}`),thorax=api.getJoint('spine_T3');
 if(!shoulder||!elbow||!thorax)throw new Error(`Mechanics v2.3 missing arm chain ${side}`);
 if(shoulder.userData.coordinatedArmModel)return shoulder.userData.coordinatedArmModel;
 const model={
  sideSign:side==='L'?-1:1,
  shoulder,elbow,thorax,
  restShoulderQuaternion:shoulder.quaternion.clone(),
  restHumerusDirection:elbow.position.clone().normalize(),
  last:null
 };
 shoulder.userData.coordinatedArmModel=model;return model;
}

function requestedDirection(model,pose){
 const flex=pose.shoulderFlexion,abd=pose.shoulderAbduction,elevation=Math.hypot(flex,abd);
 if(elevation<.0001)return{elevation:0,plane:0,direction:null};
 const theta=rad(Math.min(elevation,179.9)),forwardShare=flex/elevation,lateralShare=abd/elevation;
 // Thorax coordinates: +Z anterior, ±X lateral, -Y down in neutral.
 const direction=new THREE.Vector3(
  model.sideSign*Math.sin(theta)*lateralShare,
  -Math.cos(theta),
  Math.sin(theta)*forwardShare
 ).normalize();
 return{elevation,plane:deg(Math.atan2(flex,abd)),direction};
}

function automaticExternalRotation(pose,elevation){
 const positiveFlex=Math.max(0,pose.shoulderFlexion),positiveAbd=Math.max(0,pose.shoulderAbduction),positiveElevation=Math.hypot(positiveFlex,positiveAbd);
 if(positiveElevation<.0001)return 0;
 const frontalShare=positiveAbd/positiveElevation;
 // An ordinary arm needs more clearance in frontal abduction than in flexion.
 // The coupling starts gently after the initial setting phase and saturates
 // below an athletic/end-range external rotation.
 return (12+24*frontalShare)*smooth((elevation-35)/110);
}

function solveArm(api,side,pose){
 const model=initArmModel(api,side),{shoulder,elbow,thorax}=model,request=requestedDirection(model,pose);
 if(request.elevation<.0001){
 shoulder.quaternion.copy(model.restShoulderQuaternion);api.jointRoot.updateMatrixWorld(true);
  const actual=elbow.getWorldPosition(new THREE.Vector3()).sub(shoulder.getWorldPosition(new THREE.Vector3())).normalize();
  const result={elevation:0,plane:0,glenohumeralSwing:0,automaticExternalRotation:0,appliedAxialRotation:pose.shoulderRotation,axialInternalLimit:-65,directionError:0,direction:[actual.x,actual.y,actual.z]};model.last=result;return result;
 }
 api.jointRoot.updateMatrixWorld(true);
 const thoraxWorld=thorax.getWorldQuaternion(new THREE.Quaternion()),targetWorld=request.direction.clone().applyQuaternion(thoraxWorld).normalize();
 const parentWorld=shoulder.parent.getWorldQuaternion(new THREE.Quaternion()),targetParent=targetWorld.clone().applyQuaternion(parentWorld.clone().invert()).normalize();
 const swing=new THREE.Quaternion().setFromUnitVectors(model.restHumerusDirection,targetParent);
 const autoExternal=automaticExternalRotation(pose,request.elevation),highElevation=smooth((request.elevation-70)/90);
 const internalLimit=THREE.MathUtils.lerp(-65,-20,highElevation),appliedAxial=clamp(pose.shoulderRotation+autoExternal,internalLimit,75);
 // Twist around the already elevated humeral shaft. The sign is mirrored so
 // positive values mean anatomical external rotation on both sides.
 const twist=new THREE.Quaternion().setFromAxisAngle(targetParent,rad(-model.sideSign*appliedAxial));
 shoulder.quaternion.copy(twist.multiply(swing));api.jointRoot.updateMatrixWorld(true);
 const shoulderWorld=shoulder.getWorldPosition(new THREE.Vector3()),elbowWorld=elbow.getWorldPosition(new THREE.Vector3()),actualDirection=elbowWorld.sub(shoulderWorld).normalize();
 const result={
  elevation:request.elevation,
  plane:request.plane,
  glenohumeralSwing:deg(Math.acos(clamp(model.restHumerusDirection.dot(targetParent),-1,1))),
  automaticExternalRotation:autoExternal,
  appliedAxialRotation:appliedAxial,
  axialInternalLimit:internalLimit,
  directionError:deg(actualDirection.angleTo(targetWorld)),
  direction:[actualDirection.x,actualDirection.y,actualDirection.z]
 };
 model.last=result;return result;
}

export function createSkeletonMechanicsV23(api){
 const mechanics=createSkeletonMechanicsV22(api);
 for(const side of ['L','R'])initArmModel(api,side);
 const oldSetArmPose=mechanics.setArmPose.bind(mechanics),oldState=mechanics.getState.bind(mechanics),oldReset=mechanics.reset.bind(mechanics);
 mechanics.setArmPose=(side,v={})=>{
  const constrained=oldSetArmPose(side,v),diagnostics=solveArm(api,side,mechanics.arms[side]);
  return{...constrained,shoulderElevation:diagnostics.elevation,shoulderPlane:diagnostics.plane,automaticShoulderRotation:diagnostics.automaticExternalRotation,appliedShoulderRotation:diagnostics.appliedAxialRotation,shoulderDirectionError:diagnostics.directionError};
 };
 mechanics.getShoulderDiagnostics=side=>{
  const model=initArmModel(api,side);return model.last?{...model.last,direction:[...model.last.direction]}:null;
 };
 mechanics.getState=()=>({...oldState(),mechanicsVersion:MECHANICS_VERSION,shoulderDiagnostics:{L:mechanics.getShoulderDiagnostics('L'),R:mechanics.getShoulderDiagnostics('R')}});
 mechanics.reset=()=>{oldReset();for(const side of ['L','R']){const model=initArmModel(api,side);model.shoulder.quaternion.copy(model.restShoulderQuaternion);model.last=null}api.jointRoot.updateMatrixWorld(true)};
 mechanics.mechanicsVersion=MECHANICS_VERSION;return mechanics;
}

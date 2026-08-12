import * as THREE from 'three';
import { scaledAnthropometry } from './anthropometry-v01.js';

/**
 * Skeleton v1.3 — mechanics-ready contract layer.
 *
 * Geometry remains based on v1.2 for now. Mechanics talks only to contract v1.
 * Future geometry versions may change visuals while preserving this contract.
 */
let capturedScene=null;
const originalSceneAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){if(!capturedScene)capturedScene=this;return originalSceneAdd.apply(this,objects);};
await import('./skeleton-v12.js?v=20260812-1720');
THREE.Scene.prototype.add=originalSceneAdd;

const scene=capturedScene;
if(!scene)throw new Error('Skeleton v1.3: base scene not captured');
const root=scene.getObjectByName('rig_root');
if(!root)throw new Error('Skeleton v1.3: rig_root not found');
root.userData.rigVersion='1.3';scene.userData.rigVersion='1.3';

const CONTRACT_VERSION=1;
const jointLayer=new THREE.Group();jointLayer.name='skeleton_contract_v1';jointLayer.visible=false;root.add(jointLayer);
const joints=new Map();
let currentStature=1.75;

const JOINT_NAMES=Object.freeze([
 'pelvis_center','spine_S1','spine_L1','spine_T12','spine_T1',
 'shoulder_L','elbow_L','wrist_L','shoulder_R','elbow_R','wrist_R',
 'hip_L','knee_L','ankle_L','hip_R','knee_R','ankle_R'
]);
const SEGMENT_DEFS=Object.freeze({
 spine_sacrum_lumbar:['pelvis_center','spine_L1'],spine_lumbar_thoracic:['spine_L1','spine_T12'],spine_thoracic_upper:['spine_T12','spine_T1'],
 upperarm_L:['shoulder_L','elbow_L'],forearm_L:['elbow_L','wrist_L'],upperarm_R:['shoulder_R','elbow_R'],forearm_R:['elbow_R','wrist_R'],
 thigh_L:['hip_L','knee_L'],shin_L:['knee_L','ankle_L'],thigh_R:['hip_R','knee_R'],shin_R:['knee_R','ankle_R']
});
const PARENT=Object.freeze({
 pelvis_center:null,spine_S1:'pelvis_center',spine_L1:'spine_S1',spine_T12:'spine_L1',spine_T1:'spine_T12',
 shoulder_L:'spine_T1',elbow_L:'shoulder_L',wrist_L:'elbow_L',shoulder_R:'spine_T1',elbow_R:'shoulder_R',wrist_R:'elbow_R',
 hip_L:'pelvis_center',knee_L:'hip_L',ankle_L:'knee_L',hip_R:'pelvis_center',knee_R:'hip_R',ankle_R:'knee_R'
});

function makeHierarchy(){
 jointLayer.clear();joints.clear();
 for(const name of JOINT_NAMES){const n=new THREE.Group();n.name=`joint_${name}`;n.userData.semanticName=name;n.userData.kind='skeleton-joint';joints.set(name,n);}
 for(const name of JOINT_NAMES){const parentName=PARENT[name];(parentName?joints.get(parentName):jointLayer).add(joints.get(name));}
}
makeHierarchy();

function sourceWorld(name){const s=root.getObjectByName(name);return s?s.getWorldPosition(new THREE.Vector3()):null;}
function anthropometricRest(stature){
 const A=scaledAnthropometry(stature),k=stature/1.75;
 const ankle=A.ankleJointHeight,knee=ankle+A.tibia,hip=knee+A.femur;
 const s1=hip+.125*k,l1=s1+.18*k,t12=l1+.022*k,t1=t12+.30*k,shoulderY=t12+(t1-t12)*(10/12)+.01*k,elbowY=shoulderY-A.humerus,wristY=elbowY-A.radius;
 return {
  pelvis_center:new THREE.Vector3(0,hip+.05*k,0),spine_S1:new THREE.Vector3(0,s1,-.010*k),spine_L1:new THREE.Vector3(0,l1,-.005*k),spine_T12:new THREE.Vector3(0,t12,-.005*k),spine_T1:new THREE.Vector3(0,t1,-.020*k),
  shoulder_L:new THREE.Vector3(-A.shoulderJointHalfWidth,shoulderY,0),elbow_L:new THREE.Vector3(-(A.shoulderJointHalfWidth+.025*k),elbowY,.004*k),wrist_L:new THREE.Vector3(-(A.shoulderJointHalfWidth+.035*k),wristY,.010*k),
  shoulder_R:new THREE.Vector3(A.shoulderJointHalfWidth,shoulderY,0),elbow_R:new THREE.Vector3(A.shoulderJointHalfWidth+.025*k,elbowY,.004*k),wrist_R:new THREE.Vector3(A.shoulderJointHalfWidth+.035*k,wristY,.010*k),
  hip_L:new THREE.Vector3(-A.hipCenterHalfWidth,hip,A.hipCenterDepth||.014),knee_L:new THREE.Vector3(-A.hipCenterHalfWidth*.72,knee,-.020*k),ankle_L:new THREE.Vector3(-A.hipCenterHalfWidth*.86,ankle,-.048*k),
  hip_R:new THREE.Vector3(A.hipCenterHalfWidth,hip,A.hipCenterDepth||.014),knee_R:new THREE.Vector3(A.hipCenterHalfWidth*.72,knee,-.020*k),ankle_R:new THREE.Vector3(A.hipCenterHalfWidth*.86,ankle,-.048*k)
 };
}
function setNodeWorld(node,world){
 jointLayer.updateMatrixWorld(true);
 const parent=node.parent;
 parent.updateMatrixWorld(true);
 node.position.copy(parent.worldToLocal(world.clone()));node.quaternion.identity();node.scale.set(1,1,1);node.updateMatrix();node.updateMatrixWorld(true);
}
function rebuildRestPose({stature=currentStature,preferSource=false}={}){
 currentStature=Number(stature)||1.75;
 const generated=anthropometricRest(currentStature);
 for(const name of JOINT_NAMES){
  jointLayer.updateMatrixWorld(true);
  let world=null;if(preferSource&&Math.abs(currentStature-1.75)<1e-6)world=sourceWorld(name);if(!world)world=generated[name];if(!world)throw new Error(`Skeleton v1.3: no rest position for ${name}`);
  setNodeWorld(joints.get(name),world);
 }
 jointLayer.updateMatrixWorld(true);return getRestMetrics();
}
function getJoint(name){return joints.get(name)||null;}
function getSegment(name){const d=SEGMENT_DEFS[name];if(!d)return null;const a=getJoint(d[0]),b=getJoint(d[1]);if(!a||!b)return null;const start=a.getWorldPosition(new THREE.Vector3()),end=b.getWorldPosition(new THREE.Vector3());return{name,a:d[0],b:d[1],start,end,length:start.distanceTo(end)};}
function getRestMetrics(){const out={stature:currentStature,segments:{}};for(const n of Object.keys(SEGMENT_DEFS))out.segments[n]=getSegment(n)?.length??null;return out;}
function resetPose(){for(const n of joints.values())n.quaternion.identity();jointLayer.updateMatrixWorld(true);}

rebuildRestPose({stature:1.75,preferSource:true});
const api=Object.freeze({contractVersion:CONTRACT_VERSION,skeletonVersion:'1.3',jointNames:JOINT_NAMES,segmentNames:Object.freeze(Object.keys(SEGMENT_DEFS)),jointRoot:jointLayer,getJoint,getSegment,getRestMetrics,rebuildRestPose,resetPose});
root.userData.skeletonAPI=api;scene.userData.skeletonContractVersion=CONTRACT_VERSION;scene.userData.skeletonVersion='1.3';
const title=document.querySelector('.info .title');if(title)title.textContent='Skeleton v1.3';
const sub=document.querySelector('.info .sub');if(sub)sub.innerHTML='mechanics-ready contract v1 · hierarchical joints<br>геометрия v1.2 · рост 1750 мм';
const metrics=document.getElementById('metrics');if(metrics)metrics.insertAdjacentHTML('beforeend','<div class="row"><span>Contract</span><span>v1 · hierarchical joints</span></div><div class="row"><span>Rest pose</span><span>rebuildable by stature</span></div>');
export {api as skeletonAPI};

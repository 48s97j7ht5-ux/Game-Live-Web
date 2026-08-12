import * as THREE from 'three';
import { scaledAnthropometry } from './anthropometry-v01.js';

/**
 * Skeleton v1.3 — mechanics-ready contract layer.
 *
 * Geometry remains based on v1.2 for now. Mechanics talks only to contract v1.
 * Skeleton v1.3 itself owns the version-specific binding from contract joints to
 * its visual geometry. Future geometry versions can replace that binding while
 * keeping contractVersion 1 and Mechanics v1 unchanged.
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
 const parent=node.parent;parent.updateMatrixWorld(true);
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
 jointLayer.updateMatrixWorld(true);
 captureVisualRest();
 return getRestMetrics();
}
function getJoint(name){return joints.get(name)||null;}
function getSegment(name){const d=SEGMENT_DEFS[name];if(!d)return null;const a=getJoint(d[0]),b=getJoint(d[1]);if(!a||!b)return null;const start=a.getWorldPosition(new THREE.Vector3()),end=b.getWorldPosition(new THREE.Vector3());return{name,a:d[0],b:d[1],start,end,length:start.distanceTo(end)};}
function getRestMetrics(){const out={stature:currentStature,segments:{}};for(const n of Object.keys(SEGMENT_DEFS))out.segments[n]=getSegment(n)?.length??null;return out;}
function resetPose(){for(const n of joints.values())n.quaternion.identity();jointLayer.updateMatrixWorld(true);}

// ---------------------------------------------------------------------------
// v1.3 VISUAL ADAPTER
// Version-specific on purpose. Mechanics must never depend on this implementation.
// It binds the current v1.2-derived left-leg meshes to Contract v1 joints.
// A future Skeleton 1.4 may replace this entire section while keeping the same API.
// ---------------------------------------------------------------------------
const visualRestWorld=new Map();
const driverRestWorld=new Map();
let visualBindings=[];

function captureVisualRest(){
 root.updateMatrixWorld(true);jointLayer.updateMatrixWorld(true);
 visualRestWorld.clear();driverRestWorld.clear();visualBindings=[];
 root.traverse(o=>{if(o.isMesh)visualRestWorld.set(o.uuid,o.matrixWorld.clone());});
 for(const name of ['hip_L','knee_L','ankle_L'])driverRestWorld.set(name,getJoint(name).matrixWorld.clone());
 buildLeftLegVisualBindings();
}

function buildLeftLegVisualBindings(){
 const hip=getJoint('hip_L').getWorldPosition(new THREE.Vector3());
 const knee=getJoint('knee_L').getWorldPosition(new THREE.Vector3());
 const ankle=getJoint('ankle_L').getWorldPosition(new THREE.Vector3());
 const thighLen=hip.distanceTo(knee),shinLen=knee.distanceTo(ankle);
 const maxWidth=Math.max(thighLen,shinLen)*.34;

 root.traverse(o=>{
  if(!o.isMesh)return;
  const p=o.getWorldPosition(new THREE.Vector3());
  if(p.x>=0)return;
  if(Math.abs(p.x-hip.x)>maxWidth)return;
  if(p.y>hip.y+thighLen*.08)return;

  let driver=null;
  if(p.y>=knee.y-shinLen*.045)driver='hip_L';
  else if(p.y>=ankle.y-shinLen*.07)driver='knee_L';
  else if(p.y>=-0.02)driver='ankle_L';
  if(driver)visualBindings.push({object:o,driver});
 });
}

function syncVisualPose(){
 root.updateMatrixWorld(true);jointLayer.updateMatrixWorld(true);
 const delta=new THREE.Matrix4(),targetWorld=new THREE.Matrix4(),parentInv=new THREE.Matrix4();
 const pos=new THREE.Vector3(),quat=new THREE.Quaternion(),scale=new THREE.Vector3();
 for(const {object,driver} of visualBindings){
  const restObject=visualRestWorld.get(object.uuid),restDriver=driverRestWorld.get(driver),joint=getJoint(driver);
  if(!restObject||!restDriver||!joint)continue;
  delta.copy(joint.matrixWorld).multiply(new THREE.Matrix4().copy(restDriver).invert());
  targetWorld.copy(delta).multiply(restObject);
  parentInv.copy(object.parent.matrixWorld).invert();
  targetWorld.premultiply(parentInv).decompose(pos,quat,scale);
  object.position.copy(pos);object.quaternion.copy(quat);object.scale.copy(scale);object.updateMatrix();
 }
 root.updateMatrixWorld(true);
 return getVisualBindingInfo();
}

function resetVisualPose(){
 root.updateMatrixWorld(true);
 const local=new THREE.Matrix4(),parentInv=new THREE.Matrix4();
 for(const {object} of visualBindings){
  const rest=visualRestWorld.get(object.uuid);if(!rest)continue;
  parentInv.copy(object.parent.matrixWorld).invert();local.copy(parentInv).multiply(rest);
  local.decompose(object.position,object.quaternion,object.scale);object.updateMatrix();
 }
 root.updateMatrixWorld(true);
}

function getVisualBindingInfo(){
 const counts={hip:0,knee:0,ankle:0};
 for(const b of visualBindings){if(b.driver==='hip_L')counts.hip++;else if(b.driver==='knee_L')counts.knee++;else if(b.driver==='ankle_L')counts.ankle++;}
 return {total:visualBindings.length,...counts};
}

// Initial migration: preserve current 1.2 landmark locations at 175 cm.
rebuildRestPose({stature:1.75,preferSource:true});

const api=Object.freeze({
 contractVersion:CONTRACT_VERSION,skeletonVersion:'1.3',jointNames:JOINT_NAMES,segmentNames:Object.freeze(Object.keys(SEGMENT_DEFS)),jointRoot:jointLayer,
 getJoint,getSegment,getRestMetrics,rebuildRestPose,resetPose,
 syncVisualPose,resetVisualPose,getVisualBindingInfo
});
root.userData.skeletonAPI=api;scene.userData.skeletonContractVersion=CONTRACT_VERSION;scene.userData.skeletonVersion='1.3';
const title=document.querySelector('.info .title');if(title)title.textContent='Skeleton v1.3';
const sub=document.querySelector('.info .sub');if(sub)sub.innerHTML='mechanics-ready contract v1 · hierarchical joints<br>геометрия v1.2 · рост 1750 мм';
const metrics=document.getElementById('metrics');if(metrics)metrics.insertAdjacentHTML('beforeend','<div class="row"><span>Contract</span><span>v1 · hierarchical joints</span></div><div class="row"><span>Visual pose</span><span>owned by skeleton v1.3</span></div>');
export {api as skeletonAPI};

import * as THREE from 'three';
import { scaledAnthropometry } from './anthropometry-v01.js';

/**
 * Skeleton v1.3 — mechanics-ready contract layer.
 * Mechanics talks only to Contract v1 joints. Visual bones are owned by the
 * skeleton and are rebuilt from explicit startJoint/endJoint pairs.
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
 for(const name of JOINT_NAMES){const p=PARENT[name];(p?joints.get(p):jointLayer).add(joints.get(name));}
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
 jointLayer.updateMatrixWorld(true);node.parent.updateMatrixWorld(true);
 node.position.copy(node.parent.worldToLocal(world.clone()));node.quaternion.identity();node.scale.set(1,1,1);node.updateMatrix();node.updateMatrixWorld(true);
}
function rebuildRestPose({stature=currentStature,preferSource=false}={}){
 currentStature=Number(stature)||1.75;const generated=anthropometricRest(currentStature);
 for(const name of JOINT_NAMES){
  jointLayer.updateMatrixWorld(true);let world=null;
  if(preferSource&&Math.abs(currentStature-1.75)<1e-6)world=sourceWorld(name);
  if(!world)world=generated[name];if(!world)throw new Error(`Skeleton v1.3: no rest position for ${name}`);
  setNodeWorld(joints.get(name),world);
 }
 jointLayer.updateMatrixWorld(true);syncVisualPose();return getRestMetrics();
}
function getJoint(name){return joints.get(name)||null;}
function getSegment(name){const d=SEGMENT_DEFS[name];if(!d)return null;const a=getJoint(d[0]),b=getJoint(d[1]);if(!a||!b)return null;const start=a.getWorldPosition(new THREE.Vector3()),end=b.getWorldPosition(new THREE.Vector3());return{name,a:d[0],b:d[1],start,end,length:start.distanceTo(end)};}
function getRestMetrics(){const out={stature:currentStature,segments:{}};for(const n of Object.keys(SEGMENT_DEFS))out.segments[n]=getSegment(n)?.length??null;return out;}
function resetPose(){for(const n of joints.values())n.quaternion.identity();jointLayer.updateMatrixWorld(true);}

// ---------------------------------------------------------------------------
// v1.3 EXPLICIT VISUAL SEGMENTS
// No spatial-area binding. Every driven bone has named endpoints.
// Future skeleton versions can change shapes while preserving these joint names.
// ---------------------------------------------------------------------------
const drivenVisuals=new THREE.Group();drivenVisuals.name='driven_visual_segments_v13';root.add(drivenVisuals);
const sampleBone=[];root.traverse(o=>{if(o.isMesh&&o.geometry?.type==='CylinderGeometry')sampleBone.push(o);});
const boneMaterial=(sampleBone[0]?.material?.clone?.())||new THREE.MeshStandardMaterial({color:0xd7dbe7});

const VISUAL_SEGMENTS=Object.freeze({
 femur_L:{startJoint:'hip_L',endJoint:'knee_L',radius:.016,offset:new THREE.Vector3(0,0,0)},
 tibia_L:{startJoint:'knee_L',endJoint:'ankle_L',radius:.014,offset:new THREE.Vector3(.007,0,0)},
 fibula_L:{startJoint:'knee_L',endJoint:'ankle_L',radius:.007,offset:new THREE.Vector3(-.020,0,-.004)}
});
const visualMeshes=new Map();
for(const [name,def] of Object.entries(VISUAL_SEGMENTS)){
 const m=new THREE.Mesh(new THREE.CylinderGeometry(def.radius,def.radius,1,10),boneMaterial);
 m.name=name;m.userData.startJoint=def.startJoint;m.userData.endJoint=def.endJoint;m.userData.kind='driven-bone';drivenVisuals.add(m);visualMeshes.set(name,m);
}

function getSourceObject(...names){for(const n of names){const o=root.getObjectByName(n);if(o)return o;}return null;}
function cylinderWorldLength(o){const s=o.getWorldScale(new THREE.Vector3());return (o.geometry?.parameters?.height||1)*Math.abs(s.y);}
function hideLegacyCylinderBetween(aNames,bNames){
 const a=getSourceObject(...aNames),b=getSourceObject(...bNames);if(!a||!b)return 0;
 const A=a.getWorldPosition(new THREE.Vector3()),B=b.getWorldPosition(new THREE.Vector3()),mid=A.clone().add(B).multiplyScalar(.5),len=A.distanceTo(B);
 let hidden=0;
 root.traverse(o=>{
  if(!o.isMesh||o.parent===drivenVisuals||o.geometry?.type!=='CylinderGeometry'||!o.visible)return;
  const p=o.getWorldPosition(new THREE.Vector3());
  if(p.distanceTo(mid)<.018&&Math.abs(cylinderWorldLength(o)-len)<.025){o.visible=false;hidden++;}
 });
 return hidden;
}
function hideLegacyLeftLegShafts(){
 let n=0;
 n+=hideLegacyCylinderBetween(['hip_L','hipL'],['fNeckL']);
 n+=hideLegacyCylinderBetween(['fNeckL'],['fShaftTopL']);
 n+=hideLegacyCylinderBetween(['fShaftTopL'],['fCondMedL']);
 n+=hideLegacyCylinderBetween(['fShaftTopL'],['fCondLatL']);
 n+=hideLegacyCylinderBetween(['tPlatMedL'],['tShaftTopL']);
 n+=hideLegacyCylinderBetween(['tPlatLatL'],['tShaftTopL']);
 n+=hideLegacyCylinderBetween(['tShaftTopL'],['ankle_L','anL']);
 n+=hideLegacyCylinderBetween(['fibHeadL'],['fibAnL']);
 return n;
}
const hiddenLegacyLeftLeg=hideLegacyLeftLegShafts();

function placeDrivenBone(mesh,start,end,localOffset){
 const v=end.clone().sub(start),len=v.length();if(len<1e-6)return;
 const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize());
 const offset=localOffset.clone().applyQuaternion(q);
 const worldMid=start.clone().add(end).multiplyScalar(.5).add(offset);
 root.updateMatrixWorld(true);
 mesh.position.copy(root.worldToLocal(worldMid));mesh.scale.set(1,len,1);mesh.quaternion.copy(root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));mesh.updateMatrix();
}
function syncVisualPose(){
 jointLayer.updateMatrixWorld(true);root.updateMatrixWorld(true);
 for(const [name,def] of Object.entries(VISUAL_SEGMENTS)){
  const a=getJoint(def.startJoint),b=getJoint(def.endJoint),mesh=visualMeshes.get(name);if(!a||!b||!mesh)continue;
  placeDrivenBone(mesh,a.getWorldPosition(new THREE.Vector3()),b.getWorldPosition(new THREE.Vector3()),def.offset);
 }
 root.updateMatrixWorld(true);return getVisualBindingInfo();
}
function resetVisualPose(){syncVisualPose();}
function getVisualBindingInfo(){return{total:visualMeshes.size,segments:[...visualMeshes.keys()],hiddenLegacy:hiddenLegacyLeftLeg};}

rebuildRestPose({stature:1.75,preferSource:true});

const api=Object.freeze({
 contractVersion:CONTRACT_VERSION,skeletonVersion:'1.3',jointNames:JOINT_NAMES,segmentNames:Object.freeze(Object.keys(SEGMENT_DEFS)),jointRoot:jointLayer,
 getJoint,getSegment,getRestMetrics,rebuildRestPose,resetPose,syncVisualPose,resetVisualPose,getVisualBindingInfo
});
root.userData.skeletonAPI=api;scene.userData.skeletonContractVersion=CONTRACT_VERSION;scene.userData.skeletonVersion='1.3';
const title=document.querySelector('.info .title');if(title)title.textContent='Skeleton v1.3';
const sub=document.querySelector('.info .sub');if(sub)sub.innerHTML='mechanics-ready contract v1 · joint-to-joint bones<br>геометрия v1.2 · рост 1750 мм';
const metrics=document.getElementById('metrics');if(metrics)metrics.insertAdjacentHTML('beforeend',`<div class="row"><span>Contract</span><span>v1 · hierarchical joints</span></div><div class="row"><span>Driven bones</span><span>3 explicit · hidden old ${hiddenLegacyLeftLeg}</span></div>`);
export {api as skeletonAPI};

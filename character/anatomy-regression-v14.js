import {skeletonAPI as api} from './skeleton-v14.js';
import {createSkeletonMechanicsV16} from './skeleton-mechanics-v16.js';
const mechanics=createSkeletonMechanicsV16(api),badge=document.getElementById('badge');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const poses={
 rest:()=>{},
 // shoulder preservation
 flex_90:()=>mechanics.setArmPose('L',{shoulderFlexion:90}),
 flex_180:()=>mechanics.setArmPose('L',{shoulderFlexion:180}),
 abd_90:()=>mechanics.setArmPose('L',{shoulderAbduction:90}),
 abd_180:()=>mechanics.setArmPose('L',{shoulderAbduction:180}),
 // cervical spine
 neck_flex_25:()=>mechanics.setTorsoPose({neckFlexion:25}),
 neck_flex_50:()=>mechanics.setTorsoPose({neckFlexion:50}),
 neck_ext_20:()=>mechanics.setTorsoPose({neckFlexion:-20}),
 neck_ext_45:()=>mechanics.setTorsoPose({neckFlexion:-45}),
 neck_rot_35:()=>mechanics.setTorsoPose({neckRotation:35}),
 neck_rot_70:()=>mechanics.setTorsoPose({neckRotation:70}),
 neck_side_20:()=>mechanics.setTorsoPose({neckSide:20}),
 neck_side_35:()=>mechanics.setTorsoPose({neckSide:35}),
 head_nod_20:()=>mechanics.setTorsoPose({headFlexion:20}),
 neck_combo:()=>mechanics.setTorsoPose({neckFlexion:18,neckRotation:45,neckSide:12}),
 // thoracic / lumbar
 thor_flex_25:()=>mechanics.setTorsoPose({thoracicFlexion:25}),
 thor_ext_15:()=>mechanics.setTorsoPose({thoracicFlexion:-15}),
 thor_rot_30:()=>mechanics.setTorsoPose({thoracicRotation:30}),
 thor_side_20:()=>mechanics.setTorsoPose({thoracicSide:20}),
 lumbar_flex_40:()=>mechanics.setTorsoPose({lumbarFlexion:40}),
 lumbar_ext_25:()=>mechanics.setTorsoPose({lumbarFlexion:-25}),
 lumbar_side_20:()=>mechanics.setTorsoPose({lumbarSide:20}),
 lumbar_rot_10:()=>mechanics.setTorsoPose({lumbarRotation:10}),
 spine_combo:()=>mechanics.setTorsoPose({lumbarFlexion:18,lumbarSide:8,thoracicFlexion:12,thoracicRotation:22,neckRotation:-25})
};
const names=[
 'spine_S1','spine_L5','spine_L4','spine_L3','spine_L2','spine_L1',
 'spine_T12','spine_T9','spine_T7','spine_T5','spine_T3','spine_T1',
 'neck_C7','neck_C6','neck_C5','neck_C4','neck_C3','neck_C2','neck_C1','head',
 'sc_L','ac_L','shoulder_L','elbow_L','wrist_L'
];
function jointState(name){const j=api.getJoint(name);if(!j)return null;const p=mechanics.getJointWorld(name),q=j.getWorldQuaternion(new THREE.Quaternion()),e=new THREE.Euler().setFromQuaternion(q,'XYZ');return {p:[p.x,p.y,p.z],r:[e.x,e.y,e.z]};}
function diag(name){const joints={};for(const n of names){const j=api.getJoint(n);if(!j)continue;const p=mechanics.getJointWorld(n),q=j.getWorldQuaternion(new THREE.Quaternion()),e=new THREE.Euler().setFromQuaternion(q,'XYZ');joints[n]={p:[p.x,p.y,p.z],r:[e.x,e.y,e.z]};}return{name,skeletonVersion:api.skeletonVersion,joints,segments:{upperarm:api.getSegment('upperarm_L')?.length,forearm:api.getSegment('forearm_L')?.length,clavicle:api.getSegment('clavicle_L')?.length,lumbar:api.getSegment('lumbar')?.length,thoracic:api.getSegment('thoracic')?.length,cervical:api.getSegment('cervical')?.length}};}
window.anatomyV14={poses:Object.keys(poses),async setPose(name){if(!poses[name])throw new Error('unknown pose '+name);mechanics.reset();poses[name]();api.jointRoot.updateMatrixWorld(true);badge.textContent='v1.4 anatomy · '+name;await sleep(180);return diag(name)},diagnostics:()=>diag('current')};
window.__ANATOMY_V14_READY__=true;badge.textContent='v1.4 anatomy · ready';

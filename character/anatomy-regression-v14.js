import {skeletonAPI as api} from './skeleton-v14.js';
import {createSkeletonMechanicsV16} from './skeleton-mechanics-v16.js';
const mechanics=createSkeletonMechanicsV16(api),badge=document.getElementById('badge');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const poses={
 rest:()=>{},
 flex_45:()=>mechanics.setArmPose('L',{shoulderFlexion:45}),
 flex_90:()=>mechanics.setArmPose('L',{shoulderFlexion:90}),
 flex_135:()=>mechanics.setArmPose('L',{shoulderFlexion:135}),
 flex_180:()=>mechanics.setArmPose('L',{shoulderFlexion:180}),
 abd_45:()=>mechanics.setArmPose('L',{shoulderAbduction:45}),
 abd_90:()=>mechanics.setArmPose('L',{shoulderAbduction:90}),
 abd_135:()=>mechanics.setArmPose('L',{shoulderAbduction:135}),
 abd_180:()=>mechanics.setArmPose('L',{shoulderAbduction:180})
};
const names=['sc_L','ac_L','scapula_L','shoulder_L','elbow_L','wrist_L'];
function diag(name){const joints={};for(const n of names){const p=mechanics.getJointWorld(n);joints[n]=[p.x,p.y,p.z]}return{name,skeletonVersion:api.skeletonVersion,joints,upperarm:api.getSegment('upperarm_L')?.length,forearm:api.getSegment('forearm_L')?.length,clavicle:api.getSegment('clavicle_L')?.length};}
window.anatomyV14={poses:Object.keys(poses),async setPose(name){mechanics.reset();poses[name]();api.jointRoot.updateMatrixWorld(true);badge.textContent='v1.4 shoulder · '+name;await sleep(160);return diag(name)},diagnostics:()=>diag('current')};
window.__ANATOMY_V14_READY__=true;badge.textContent='v1.4 shoulder · ready';

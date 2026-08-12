import {createSkeletonMechanicsV1} from './skeleton-mechanics-contract-v01.js';
const mod=await import('./skeleton-v13.js');
const api=mod.skeletonAPI,mechanics=createSkeletonMechanicsV1(api);
const badge=document.getElementById('testBadge');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const poseMap={
 rest:()=>{},
 shoulder_flex_45:()=>mechanics.setArmPose('L',{shoulderFlexion:45}),shoulder_flex_90:()=>mechanics.setArmPose('L',{shoulderFlexion:90}),shoulder_flex_135:()=>mechanics.setArmPose('L',{shoulderFlexion:135}),shoulder_flex_180:()=>mechanics.setArmPose('L',{shoulderFlexion:180}),
 shoulder_abd_45:()=>mechanics.setArmPose('L',{shoulderAbduction:45}),shoulder_abd_90:()=>mechanics.setArmPose('L',{shoulderAbduction:90}),shoulder_abd_135:()=>mechanics.setArmPose('L',{shoulderAbduction:135}),shoulder_abd_180:()=>mechanics.setArmPose('L',{shoulderAbduction:180}),
 elbow_45:()=>mechanics.setArmPose('L',{elbowFlexion:45}),elbow_90:()=>mechanics.setArmPose('L',{elbowFlexion:90}),elbow_135:()=>mechanics.setArmPose('L',{elbowFlexion:135}),
 hip_flex_45:()=>mechanics.setLegPose('L',{hipFlexion:45}),hip_flex_90:()=>mechanics.setLegPose('L',{hipFlexion:90}),hip_flex_125:()=>mechanics.setLegPose('L',{hipFlexion:125}),
 knee_45:()=>mechanics.setLegPose('L',{kneeFlexion:45}),knee_90:()=>mechanics.setLegPose('L',{kneeFlexion:90}),knee_135:()=>mechanics.setLegPose('L',{kneeFlexion:135}),
 ankle_dorsi_25:()=>mechanics.setLegPose('L',{ankleFlexion:25}),ankle_plantar_50:()=>mechanics.setLegPose('L',{ankleFlexion:-50}),
 lumbar_flex_30:()=>mechanics.setTorsoPose({lumbarFlexion:30}),lumbar_ext_30:()=>mechanics.setTorsoPose({lumbarFlexion:-30}),thoracic_flex_30:()=>mechanics.setTorsoPose({thoracicFlexion:30}),thoracic_rot_35:()=>mechanics.setTorsoPose({thoracicRotation:35}),neck_flex_45:()=>mechanics.setTorsoPose({neckFlexion:45}),neck_rot_55:()=>mechanics.setTorsoPose({neckRotation:55}),
 combined_crouch:()=>{mechanics.setLegPose('L',{hipFlexion:70,kneeFlexion:100,ankleFlexion:15});mechanics.setLegPose('R',{hipFlexion:70,kneeFlexion:100,ankleFlexion:15});mechanics.setTorsoPose({lumbarFlexion:18,thoracicFlexion:10})},
 combined_reach:()=>{mechanics.setArmPose('L',{shoulderFlexion:150,elbowFlexion:20});mechanics.setArmPose('R',{shoulderFlexion:150,elbowFlexion:20});mechanics.setTorsoPose({thoracicFlexion:-8,neckFlexion:-8})}
};
const important=['sc_L','ac_L','shoulder_L','elbow_L','wrist_L','hip_L','knee_L','ankle_L','spine_S1','spine_T12','spine_T1','neck_C1','head'];
function diagnostics(name){const joints={};for(const n of important){try{const p=mechanics.getJointWorld(n);joints[n]=[p.x,p.y,p.z]}catch{}}const segments={};for(const n of api.segmentNames){const s=api.getSegment(n);if(s)segments[n]=s.length}return{name,mechanicsVersion:mechanics.constructor.name,skeletonVersion:api.skeletonVersion,joints,segments};}
window.anatomyTest={poses:Object.keys(poseMap),async setPose(name){if(!poseMap[name])throw new Error('unknown pose '+name);mechanics.reset();poseMap[name]();api.jointRoot.updateMatrixWorld(true);badge.textContent='anatomy regression · '+name;await sleep(180);return diagnostics(name)},diagnostics:()=>diagnostics('current'),reset:()=>mechanics.reset()};
window.__ANATOMY_READY__=true;badge.textContent='anatomy regression · ready';
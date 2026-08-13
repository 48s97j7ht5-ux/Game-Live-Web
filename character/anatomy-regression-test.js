import {createSkeletonMechanicsV20} from './skeleton-mechanics-v20.js';
const mod=await import('./skeleton-v15.js?v=20260813-geometry2');
const api=mod.skeletonAPI,mechanics=createSkeletonMechanicsV20(api);
const badge=document.getElementById('testBadge');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function setView(view){
 const camera=window.__SKELETON_CAMERA__;if(!camera)return;
 const p=view==='back'?[0,1.15,-4.7]:view==='side'?[4.7,1.15,0]:view==='front'?[0,1.15,4.7]:[3.2,1.35,3.2];
 camera.position.set(...p);camera.lookAt(0,.9,0);camera.updateProjectionMatrix();
}
const poseMap={
 rest:()=>setView('threequarter'),
 rest_back:()=>setView('back'),
 rest_side:()=>setView('side'),
 shoulder_abd_90_back:()=>{setView('back');mechanics.setArmPose('L',{shoulderAbduction:90})},
 shoulder_abd_180_back:()=>{setView('back');mechanics.setArmPose('L',{shoulderAbduction:180})},
 shoulder_flex_90_side:()=>{setView('side');mechanics.setArmPose('L',{shoulderFlexion:90})},
 shoulder_flex_180_side:()=>{setView('side');mechanics.setArmPose('L',{shoulderFlexion:180})},
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
function diagnostics(name){const joints={};for(const n of important){try{const p=mechanics.getJointWorld(n);joints[n]=[p.x,p.y,p.z]}catch{}}const segments={};for(const n of api.segmentNames){const s=api.getSegment(n);if(s)segments[n]=s.length}return{name,mechanicsVersion:mechanics.mechanicsVersion??mechanics.constructor.name,skeletonVersion:api.skeletonVersion,joints,segments,geometry:api.getGeometryMetrics?.()??null};}
window.anatomyTest={poses:Object.keys(poseMap),async setPose(name){if(!poseMap[name])throw new Error('unknown pose '+name);mechanics.reset();poseMap[name]();api.jointRoot.updateMatrixWorld(true);badge.textContent='anatomy regression · '+name;await sleep(180);return diagnostics(name)},diagnostics:()=>diagnostics('current'),reset:()=>mechanics.reset()};
window.__ANATOMY_READY__=true;badge.textContent='anatomy regression · ready';
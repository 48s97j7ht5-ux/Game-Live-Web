import {createSkeletonMechanicsV21} from './skeleton-mechanics-v21.js?v=20260813-full3';
const mod=await import('./skeleton-v16.js?v=20260813-full3');
const api=mod.skeletonAPI,mechanics=createSkeletonMechanicsV21(api);
const geometryValidation=api.validateGeometry?.();if(geometryValidation&&!geometryValidation.pass)throw new Error('Skeleton v1.6 geometry validation failed: '+JSON.stringify(geometryValidation.checks));
const badge=document.getElementById('testBadge'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
function setView(view){const camera=window.__SKELETON_CAMERA__;if(!camera)return;const p=view==='back'?[0,1.15,-4.7]:view==='side'?[4.7,1.15,0]:view==='front'?[0,1.15,4.7]:[3.2,1.35,3.2];camera.position.set(...p);camera.lookAt(0,.9,0);camera.updateProjectionMatrix()}
function validateLimits(){
 const checks={};
 let r=mechanics.setArmPose('L',{shoulderFlexion:999,shoulderAbduction:999,shoulderRotation:999,elbowFlexion:999,forearmRotation:-999,wristFlexion:999,wristDeviation:999,fingerCurl:999});
 checks.shoulderEnvelope=Math.hypot(Math.max(0,r.shoulderFlexion),Math.max(0,r.shoulderAbduction))<=160.001;checks.armLimits=r.shoulderRotation<=75&&r.elbowFlexion<=145&&r.forearmRotation>=-75&&r.fingerCurl<=100;checks.wristEnvelope=(r.wristFlexion/70)**2+(r.wristDeviation/30)**2<=1.001;
 r=mechanics.setLegPose('L',{kneeFlexion:0,hipFlexion:999,ankleFlexion:999,subtalarInversion:999,subtalarRotation:999});checks.straightKneeCoupling=r.hipFlexion<=90.001&&r.ankleFlexion<=13.001;checks.subtalarEnvelope=(r.subtalarInversion/25)**2+(r.subtalarRotation/10)**2<=1.001;
 r=mechanics.setLegPose('L',{kneeFlexion:138,hipFlexion:999,ankleFlexion:999});checks.flexedKneeRelease=r.hipFlexion<=120.001&&r.ankleFlexion<=20.001;
 mechanics.reset();mechanics.setLegPose('L',{hipAbduction:40});let hip=mechanics.getJointWorld('hip_L'),ankle=mechanics.getJointWorld('ankle_L');checks.abductionDirection=ankle.x<hip.x;
 mechanics.reset();mechanics.setLegPose('L',{kneeFlexion:90});let knee=mechanics.getJointWorld('knee_L');ankle=mechanics.getJointWorld('ankle_L');checks.kneeDirection=ankle.z<knee.z;
 r=mechanics.setTorsoPose({lumbarFlexion:999,lumbarSide:999,lumbarRotation:999,thoracicFlexion:999,thoracicSide:999,thoracicRotation:999,neckFlexion:999,neckSide:999,neckRotation:999});checks.lumbarEnvelope=(Math.max(0,r.lumbarFlexion)/30)**2+(Math.abs(r.lumbarSide)/20)**2+(Math.abs(r.lumbarRotation)/8)**2<=1.001;checks.thoracicEnvelope=(Math.max(0,r.thoracicFlexion)/30)**2+(Math.abs(r.thoracicSide)/20)**2+(Math.abs(r.thoracicRotation)/30)**2<=1.001;checks.neckEnvelope=(Math.abs(r.neckFlexion)/45)**2+(Math.abs(r.neckSide)/35)**2+(Math.abs(r.neckRotation)/65)**2<=1.001;
 r=mechanics.setJawPose({open:999,protrusion:999,lateral:999});checks.jawLimits=r.open===35&&r.protrusion===6&&r.lateral===6;
 mechanics.reset();return{pass:Object.values(checks).every(Boolean),checks};
}
const limitValidation=validateLimits();if(!limitValidation.pass)throw new Error('Mechanics v2.1 limit validation failed: '+JSON.stringify(limitValidation.checks));
const poseMap={
 rest:()=>setView('threequarter'),rest_back:()=>setView('back'),rest_side:()=>setView('side'),
 shoulder_flex_160_side:()=>{setView('side');mechanics.setArmPose('L',{shoulderFlexion:160})},
 shoulder_abd_150_back:()=>{setView('back');mechanics.setArmPose('L',{shoulderAbduction:150})},
 shoulder_diagonal_envelope:()=>{setView('back');mechanics.setArmPose('L',{shoulderFlexion:130,shoulderAbduction:130})},
 shoulder_external_75:()=>{setView('front');mechanics.setArmPose('L',{shoulderAbduction:80,shoulderRotation:75,elbowFlexion:90})},
 shoulder_internal_65:()=>{setView('front');mechanics.setArmPose('L',{shoulderAbduction:70,shoulderRotation:-65,elbowFlexion:90})},
 elbow_145:()=>mechanics.setArmPose('L',{elbowFlexion:145}),
 forearm_pronation_75:()=>{setView('front');mechanics.setArmPose('L',{shoulderFlexion:35,elbowFlexion:90,forearmRotation:-75,fingerSpread:12})},
 forearm_supination_85:()=>{setView('front');mechanics.setArmPose('L',{shoulderFlexion:35,elbowFlexion:90,forearmRotation:85,fingerSpread:12})},
 wrist_flex_70:()=>mechanics.setArmPose('L',{shoulderFlexion:35,elbowFlexion:90,wristFlexion:70,fingerSpread:10}),
 wrist_extension_60:()=>mechanics.setArmPose('L',{shoulderFlexion:35,elbowFlexion:90,wristFlexion:-60,fingerSpread:10}),
 hand_fist:()=>mechanics.setArmPose('L',{shoulderFlexion:45,elbowFlexion:90,fingerCurl:100,thumbOpposition:40,thumbCurl:65}),
 hand_spread:()=>mechanics.setArmPose('L',{shoulderFlexion:45,elbowFlexion:75,fingerSpread:18,thumbOpposition:20}),
 hip_flex_straight_90:()=>{setView('side');mechanics.setLegPose('L',{hipFlexion:120,kneeFlexion:0})},
 hip_flex_bent_120:()=>{setView('side');mechanics.setLegPose('L',{hipFlexion:120,kneeFlexion:120})},
 hip_extension_18:()=>{setView('side');mechanics.setLegPose('L',{hipFlexion:-18})},
 hip_abduction_40:()=>{setView('front');mechanics.setLegPose('L',{hipAbduction:40})},
 hip_adduction_20:()=>{setView('front');mechanics.setLegPose('L',{hipAbduction:-20})},
 hip_external_45:()=>{setView('front');mechanics.setLegPose('L',{hipRotation:45,kneeFlexion:25})},
 hip_internal_35:()=>{setView('front');mechanics.setLegPose('L',{hipRotation:-35,kneeFlexion:25})},
 knee_138:()=>{setView('side');mechanics.setLegPose('L',{kneeFlexion:138})},
 ankle_dorsi_straight_13:()=>{setView('side');mechanics.setLegPose('L',{ankleFlexion:20,kneeFlexion:0})},
 ankle_dorsi_bent_20:()=>{setView('side');mechanics.setLegPose('L',{ankleFlexion:20,kneeFlexion:90})},
 ankle_plantar_50:()=>{setView('side');mechanics.setLegPose('L',{ankleFlexion:-50})},
 subtalar_inversion_25:()=>{setView('front');mechanics.setLegPose('L',{subtalarInversion:25})},
 subtalar_eversion_10:()=>{setView('front');mechanics.setLegPose('L',{subtalarInversion:-10})},
 toes_extension_45:()=>{setView('side');mechanics.setLegPose('L',{toeFlexion:-45})},
 toes_flexion_35:()=>{setView('side');mechanics.setLegPose('L',{toeFlexion:35})},
 lumbar_flex_30:()=>{setView('side');mechanics.setTorsoPose({lumbarFlexion:30})},
 lumbar_ext_15:()=>{setView('side');mechanics.setTorsoPose({lumbarFlexion:-15})},
 thoracic_flex_30:()=>{setView('side');mechanics.setTorsoPose({thoracicFlexion:30})},
 thoracic_rot_30:()=>{setView('front');mechanics.setTorsoPose({thoracicRotation:30})},
 neck_flex_45:()=>{setView('side');mechanics.setTorsoPose({neckFlexion:45})},
 neck_ext_45:()=>{setView('side');mechanics.setTorsoPose({neckFlexion:-45})},
 neck_rot_65:()=>{setView('front');mechanics.setTorsoPose({neckRotation:65})},
 trunk_combined_envelope:()=>{setView('threequarter');mechanics.setTorsoPose({lumbarFlexion:30,lumbarSide:20,lumbarRotation:8,thoracicFlexion:30,thoracicSide:20,thoracicRotation:30,neckFlexion:45,neckSide:35,neckRotation:65})},
 jaw_open_35:()=>{setView('side');mechanics.setJawPose({open:35,protrusion:4})},
 combined_crouch_grounded:()=>{setView('side');mechanics.setLegPose('L',{hipFlexion:70,kneeFlexion:100,ankleFlexion:15});mechanics.setLegPose('R',{hipFlexion:70,kneeFlexion:100,ankleFlexion:15});mechanics.setTorsoPose({pelvisTilt:8,lumbarFlexion:15,thoracicFlexion:8});mechanics.groundToFloor()},
 combined_reach:()=>{mechanics.setArmPose('L',{shoulderFlexion:145,elbowFlexion:15,forearmRotation:20});mechanics.setArmPose('R',{shoulderFlexion:145,elbowFlexion:15,forearmRotation:20});mechanics.setTorsoPose({thoracicFlexion:-8,neckFlexion:-8})}
};
const important=['sc_L','ac_L','shoulder_L','elbow_L','forearm_rotation_L','wrist_L','finger_mcp_L_2','hip_L','knee_L','ankle_L','subtalar_L','toe_mtp_L_0','pelvis_center','spine_S1','spine_T12','spine_T1','neck_C1','head','jaw'];
function diagnostics(name){const joints={};for(const n of important){try{const p=mechanics.getJointWorld(n);joints[n]=[p.x,p.y,p.z]}catch{}}const segments={};for(const n of api.segmentNames){const s=api.getSegment(n);if(s)segments[n]=s.length}return{name,mechanicsVersion:mechanics.mechanicsVersion,skeletonVersion:api.skeletonVersion,joints,segments,state:mechanics.getState(),geometry:api.getGeometryMetrics?.()??null,geometryValidation,limitValidation}}
window.anatomyTest={poses:Object.keys(poseMap),async setPose(name){if(!poseMap[name])throw new Error('unknown pose '+name);mechanics.reset();poseMap[name]();api.jointRoot.updateMatrixWorld(true);badge.textContent='anatomy regression · '+name;await sleep(220);return diagnostics(name)},diagnostics:()=>diagnostics('current'),reset:()=>mechanics.reset()};
window.__ANATOMY_READY__=true;badge.textContent='anatomy regression · ready';

import * as THREE from 'three';
import { createSkeletonMechanicsV1 } from './skeleton-mechanics-contract-v01.js';

let capturedScene=null;
const originalSceneAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){if(!capturedScene)capturedScene=this;return originalSceneAdd.apply(this,objects);};
const mod=await import('./skeleton-v13.js?v=20260812-1658');
THREE.Scene.prototype.add=originalSceneAdd;

const scene=capturedScene;
const api=mod.skeletonAPI;
if(!scene)throw new Error('Contract test: scene not captured');
if(!api||api.contractVersion!==1)throw new Error('Contract test: Skeleton Contract v1 missing');
const mechanics=createSkeletonMechanicsV1(api);
window.skeletonAPI=api;window.skeletonMechanics=mechanics;

const debug=new THREE.Group();debug.name='contract_debug_rig';scene.add(debug);
const matJoint=new THREE.MeshBasicMaterial({color:0x00ff88,depthTest:false});
const matBone=new THREE.MeshBasicMaterial({color:0x00d5ff,depthTest:false,transparent:true,opacity:.9});
const markers={};
for(const name of ['hip_L','knee_L','ankle_L']){const m=new THREE.Mesh(new THREE.SphereGeometry(.025,16,12),matJoint);m.renderOrder=99;debug.add(m);markers[name]=m;}
function makeLink(){const m=new THREE.Mesh(new THREE.CylinderGeometry(.010,.010,1,10),matBone);m.renderOrder=98;debug.add(m);return m;}
const thigh=makeLink(),shin=makeLink();
function placeLink(mesh,a,b){const v=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(1,v.length(),1);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());}
function syncDebug(){const h=mechanics.getJointWorld('hip_L'),k=mechanics.getJointWorld('knee_L'),a=mechanics.getJointWorld('ankle_L');markers.hip_L.position.copy(h);markers.knee_L.position.copy(k);markers.ankle_L.position.copy(a);placeLink(thigh,h,k);placeLink(shin,k,a);}

const fields={hipFlexion:document.getElementById('hipFlexion'),kneeFlexion:document.getElementById('kneeFlexion'),ankleFlexion:document.getElementById('ankleFlexion')};
const outputs={hipFlexion:document.getElementById('hipFlexionValue'),kneeFlexion:document.getElementById('kneeFlexionValue'),ankleFlexion:document.getElementById('ankleFlexionValue')};
const status=document.getElementById('mechanicsStatus');
function read(){return{hipFlexion:+fields.hipFlexion.value,kneeFlexion:+fields.kneeFlexion.value,ankleFlexion:+fields.ankleFlexion.value};}
function show(v){for(const k of Object.keys(outputs))outputs[k].textContent=`${v[k]}°`;}
function apply(){const v=read();mechanics.reset();const out=mechanics.setLegPose('L',v);const visual=api.syncVisualPose();syncDebug();show(out);const m=api.getRestMetrics();status.textContent=`OK · contract ${api.contractVersion} · driven ${visual.total} · old hidden ${visual.hiddenLegacy} · thigh ${(m.segments.thigh_L*1000).toFixed(0)} mm · shin ${(m.segments.shin_L*1000).toFixed(0)} mm`;}
for(const f of Object.values(fields))f.addEventListener('input',()=>{try{apply();}catch(e){status.textContent=`ERROR · ${e.message}`;console.error(e);}});
document.getElementById('resetMechanics').addEventListener('click',()=>{for(const f of Object.values(fields))f.value='0';mechanics.reset();api.syncVisualPose();syncDebug();show({hipFlexion:0,kneeFlexion:0,ankleFlexion:0});status.textContent='Сброшено · explicit joint-to-joint segments';});
show({hipFlexion:0,kneeFlexion:0,ankleFlexion:0});apply();

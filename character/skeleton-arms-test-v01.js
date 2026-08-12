import * as THREE from 'three';
import { createSkeletonMechanicsV1 } from './skeleton-mechanics-contract-v01.js?v=20260812-1958';

let capturedScene=null;
const originalSceneAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){if(!capturedScene)capturedScene=this;return originalSceneAdd.apply(this,objects);};
const mod=await import('./skeleton-v13.js?v=20260812-1835');
THREE.Scene.prototype.add=originalSceneAdd;

const scene=capturedScene,api=mod.skeletonAPI;
if(!scene||!api||api.contractVersion!==1)throw new Error('Arm test: Skeleton Contract v1 missing');
const mechanics=createSkeletonMechanicsV1(api);
window.skeletonAPI=api;window.skeletonMechanics=mechanics;

const debug=new THREE.Group();debug.name='arm_debug_rig';scene.add(debug);
const matJoint=new THREE.MeshBasicMaterial({color:0x00ff88,depthTest:false,transparent:true,opacity:.68});
const matBone=new THREE.MeshBasicMaterial({color:0x00d5ff,depthTest:false,transparent:true,opacity:.42});
const markers={};
for(const name of ['sc_L','ac_L','shoulder_L','elbow_L','wrist_L']){const m=new THREE.Mesh(new THREE.SphereGeometry(.014,14,10),matJoint);m.renderOrder=99;debug.add(m);markers[name]=m;}
function makeLink(){const m=new THREE.Mesh(new THREE.CylinderGeometry(.0035,.0035,1,8),matBone);m.renderOrder=98;debug.add(m);return m;}
const clav=makeLink(),girdle=makeLink(),upper=makeLink(),fore=makeLink();
function placeLink(mesh,a,b){const v=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(1,v.length(),1);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());}
function syncDebug(){
 const sc=mechanics.getJointWorld('sc_L'),ac=mechanics.getJointWorld('ac_L'),s=mechanics.getJointWorld('shoulder_L'),e=mechanics.getJointWorld('elbow_L'),w=mechanics.getJointWorld('wrist_L');
 markers.sc_L.position.copy(sc);markers.ac_L.position.copy(ac);markers.shoulder_L.position.copy(s);markers.elbow_L.position.copy(e);markers.wrist_L.position.copy(w);
 placeLink(clav,sc,ac);placeLink(girdle,ac,s);placeLink(upper,s,e);placeLink(fore,e,w);
}

const fields={shoulderFlexion:document.getElementById('shoulderFlexion'),shoulderAbduction:document.getElementById('shoulderAbduction'),elbowFlexion:document.getElementById('elbowFlexion'),wristFlexion:document.getElementById('wristFlexion')};
const outputs={};for(const k of Object.keys(fields))outputs[k]=document.getElementById(k+'Value');
const status=document.getElementById('mechanicsStatus');
function read(){return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,+v.value]));}
function show(v){for(const k of Object.keys(outputs))outputs[k].textContent=`${v[k]}°`;}
function apply(){const v=read();mechanics.reset();const out=mechanics.setArmPose('L',v);syncDebug();show(out);const m=api.getRestMetrics();status.textContent=`OK · scapula contact-slide · SC→AC→ST→GH · upper ${(m.segments.upperarm_L*1000).toFixed(0)} mm`;}
for(const f of Object.values(fields))f.addEventListener('input',()=>{try{apply();}catch(e){status.textContent=`ERROR · ${e.message}`;console.error(e);}});
document.getElementById('resetMechanics').addEventListener('click',()=>{for(const f of Object.values(fields))f.value='0';apply();});
apply();

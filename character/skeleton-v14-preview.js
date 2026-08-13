import * as THREE from 'three';
import {createSkeletonMechanicsV20} from './skeleton-mechanics-v20.js?v=20260813-scapula1';

let capturedScene=null;
const originalSceneAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){if(!capturedScene)capturedScene=this;return originalSceneAdd.apply(this,objects);};
const mod=await import('./skeleton-v14.js?v=20260813-scapula1');
THREE.Scene.prototype.add=originalSceneAdd;

const scene=capturedScene,api=mod.skeletonAPI;
if(!scene||!api)throw new Error('Skeleton v1.4 preview: API missing');
const mechanics=createSkeletonMechanicsV20(api);
window.skeletonAPI=api;window.skeletonMechanics=mechanics;

const debug=new THREE.Group();debug.name='arm_debug_rig';scene.add(debug);
const matJoint=new THREE.MeshBasicMaterial({color:0x00ff88,depthTest:false,transparent:true,opacity:.72});
const matBone=new THREE.MeshBasicMaterial({color:0x00d5ff,depthTest:false,transparent:true,opacity:.46});
const markers={};
for(const name of ['sc_L','ac_L','shoulder_L','elbow_L','wrist_L']){const m=new THREE.Mesh(new THREE.SphereGeometry(.014,14,10),matJoint);m.renderOrder=99;debug.add(m);markers[name]=m;}
function makeLink(){const m=new THREE.Mesh(new THREE.CylinderGeometry(.0035,.0035,1,8),matBone);m.renderOrder=98;debug.add(m);return m;}
const clav=makeLink(),girdle=makeLink(),upper=makeLink(),fore=makeLink();
function placeLink(mesh,a,b){const v=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(1,v.length(),1);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize());}
function wp(name){const j=api.getJoint(name);return j?j.getWorldPosition(new THREE.Vector3()):new THREE.Vector3();}
function syncDebug(){const sc=wp('sc_L'),ac=wp('ac_L'),s=wp('shoulder_L'),e=wp('elbow_L'),w=wp('wrist_L');markers.sc_L.position.copy(sc);markers.ac_L.position.copy(ac);markers.shoulder_L.position.copy(s);markers.elbow_L.position.copy(e);markers.wrist_L.position.copy(w);placeLink(clav,sc,ac);placeLink(girdle,ac,s);placeLink(upper,s,e);placeLink(fore,e,w);}

const fields={shoulderFlexion:document.getElementById('shoulderFlexion'),shoulderAbduction:document.getElementById('shoulderAbduction'),elbowFlexion:document.getElementById('elbowFlexion'),wristFlexion:document.getElementById('wristFlexion')};
const outputs={};for(const k of Object.keys(fields))outputs[k]=document.getElementById(k+'Value');
const status=document.getElementById('mechanicsStatus');
function read(){return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,+v.value]));}
function show(v){for(const k of Object.keys(outputs))outputs[k].textContent=`${v[k]??read()[k]}°`;}
function apply(){const v=read();mechanics.reset();const out=mechanics.setArmPose('L',v);api.jointRoot.updateMatrixWorld(true);syncDebug();show({...v,...out});status.textContent=`OK · Skeleton ${api.skeletonVersion??'1.4'} · Mechanics ${mechanics.mechanicsVersion??'2.0.0'}`;}
for(const f of Object.values(fields))f.addEventListener('input',()=>{try{apply();}catch(e){status.textContent=`ERROR · ${e.message}`;console.error(e);}});
document.getElementById('resetMechanics').addEventListener('click',()=>{for(const f of Object.values(fields))f.value='0';apply();});
apply();
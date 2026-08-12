import * as THREE from 'three';
import { createSkeletonRig } from './skeleton-rig-v01.js';
import { createSkeletonRigBinding } from './skeleton-rig-binding-v01.js';

let capturedScene=null;
const originalSceneAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){if(!capturedScene)capturedScene=this;return originalSceneAdd.apply(this,objects);};
await import('./skeleton-v12.js?v=20260812-1720');
THREE.Scene.prototype.add=originalSceneAdd;

const scene=capturedScene;
if(!scene) throw new Error('Rig test: Skeleton v1.2 scene not captured');
const sourceRoot=scene.getObjectByName('rig_root');
if(!sourceRoot) throw new Error('Rig test: source rig_root not found');

const rig=createSkeletonRig(sourceRoot);
scene.add(rig.root);
const binding=createSkeletonRigBinding(sourceRoot,rig);
window.skeletonRig=rig;
window.skeletonRigBinding=binding;

const fields={
  hipFlexion:document.getElementById('hipFlexion'),
  kneeFlexion:document.getElementById('kneeFlexion'),
  ankleFlexion:document.getElementById('ankleFlexion'),
};
const outputs={
  hipFlexion:document.getElementById('hipFlexionValue'),
  kneeFlexion:document.getElementById('kneeFlexionValue'),
  ankleFlexion:document.getElementById('ankleFlexionValue'),
};
const status=document.getElementById('mechanicsStatus');
const resetButton=document.getElementById('resetMechanics');

function values(){return{
  hipFlexion:Number(fields.hipFlexion.value),
  kneeFlexion:Number(fields.kneeFlexion.value),
  ankleFlexion:Number(fields.ankleFlexion.value),
};}
function updateOutputs(v){for(const k of Object.keys(outputs))outputs[k].textContent=`${v[k]}°`;}

function apply(){
  const v=values();
  rig.resetRotations();
  rig.setJointRotation('hip_L',{x:-v.hipFlexion});
  rig.setJointRotation('knee_L',{x:v.kneeFlexion});
  rig.setJointRotation('ankle_L',{x:-v.ankleFlexion});
  binding.sync();
  updateOutputs(v);
  const info=binding.getInfo();
  const m=rig.getMetrics().segments;
  status.textContent=`OK · hierarchical rig · bind ${info.bindings} · thigh ${(m.thigh_L*1000).toFixed(0)} mm · shin ${(m.shin_L*1000).toFixed(0)} mm`;
}

for(const field of Object.values(fields))field.addEventListener('input',()=>{
  try{apply();}catch(error){status.textContent=`ERROR · ${error.message}`;console.error(error);}
});

resetButton.addEventListener('click',()=>{
  rig.resetRotations();
  binding.resetVisual();
  for(const field of Object.values(fields))field.value='0';
  updateOutputs({hipFlexion:0,kneeFlexion:0,ankleFlexion:0});
  status.textContent='Сброшено · Skeleton v1.2 не изменён';
});

const title=document.querySelector('.info .title');if(title)title.textContent='Skeleton v1.2 · Hierarchical Rig';
const sub=document.querySelector('.info .sub');if(sub)sub.innerHTML='frozen anatomy + dimension-independent rig<br>тест левой ноги';
updateOutputs({hipFlexion:0,kneeFlexion:0,ankleFlexion:0});
try{apply();}catch(error){status.textContent=`INIT ERROR · ${error.message}`;console.error(error);}

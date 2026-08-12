import * as THREE from 'three';
import { createSkeletonMechanics } from './skeleton-mechanics-v01.js';

// Capture the scene created by the frozen skeleton-v12 module without editing it.
let capturedScene = null;
const originalSceneAdd = THREE.Scene.prototype.add;
THREE.Scene.prototype.add = function (...objects) {
  if (!capturedScene) capturedScene = this;
  return originalSceneAdd.apply(this, objects);
};

await import('./skeleton-v12.js?v=20260812-1720');
THREE.Scene.prototype.add = originalSceneAdd;

const scene = capturedScene;
if (!scene) throw new Error('Mechanics test: skeleton v1.2 scene not captured');
const rigRoot = scene.getObjectByName('rig_root');
if (!rigRoot) throw new Error('Mechanics test: rig_root not found');

const mechanics = createSkeletonMechanics(rigRoot);
window.skeletonMechanics = mechanics;

const fields = {
  hipFlexion: document.getElementById('hipFlexion'),
  kneeFlexion: document.getElementById('kneeFlexion'),
  ankleFlexion: document.getElementById('ankleFlexion'),
};
const outputs = {
  hipFlexion: document.getElementById('hipFlexionValue'),
  kneeFlexion: document.getElementById('kneeFlexionValue'),
  ankleFlexion: document.getElementById('ankleFlexionValue'),
};
const status = document.getElementById('mechanicsStatus');
const resetButton = document.getElementById('resetMechanics');

function currentValues() {
  return {
    hipFlexion: Number(fields.hipFlexion.value),
    kneeFlexion: Number(fields.kneeFlexion.value),
    ankleFlexion: Number(fields.ankleFlexion.value),
  };
}

function updateOutputs(values) {
  for (const key of Object.keys(outputs)) outputs[key].textContent = `${values[key]}°`;
}

function apply() {
  const requested = currentValues();
  const applied = mechanics.setLegPose('L', requested);
  updateOutputs(applied);
  const chain = mechanics.getChainInfo('L');
  status.textContent = `OK · rig ${mechanics.rigVersion} · hip ${chain.hipObjects} · knee ${chain.kneeObjects} · ankle ${chain.ankleObjects}`;
}

for (const field of Object.values(fields)) field.addEventListener('input', apply);

resetButton.addEventListener('click', () => {
  mechanics.resetPose();
  fields.hipFlexion.value = '0';
  fields.kneeFlexion.value = '0';
  fields.ankleFlexion.value = '0';
  updateOutputs({ hipFlexion: 0, kneeFlexion: 0, ankleFlexion: 0 });
  status.textContent = 'Сброшено в исходную позу Skeleton v1.2';
});

updateOutputs({ hipFlexion: 0, kneeFlexion: 0, ankleFlexion: 0 });
apply();

import * as THREE from 'three';
import { scaledAnthropometry } from './anthropometry-v01.js';

/**
 * Skeleton v1.3 — mechanics-ready contract layer.
 *
 * Geometry remains based on v1.2 for now, but mechanics MUST NOT depend on
 * v1.2 mesh names, coordinates, or implementation details anymore.
 *
 * Stable contract introduced here:
 *   root.userData.skeletonAPI.contractVersion === 1
 *   getJoint(name)
 *   getSegment(name)
 *   getRestMetrics()
 *   rebuildRestPose({ stature })
 *
 * Future skeleton geometry versions (1.4, 1.5, ...) may change visual bones,
 * but must preserve contractVersion 1 to stay compatible with mechanics v1.x.
 */

let capturedScene = null;
const originalSceneAdd = THREE.Scene.prototype.add;
THREE.Scene.prototype.add = function (...objects) {
  if (!capturedScene) capturedScene = this;
  return originalSceneAdd.apply(this, objects);
};
await import('./skeleton-v12.js?v=20260812-1720');
THREE.Scene.prototype.add = originalSceneAdd;

const scene = capturedScene;
if (!scene) throw new Error('Skeleton v1.3: base scene not captured');
const root = scene.getObjectByName('rig_root');
if (!root) throw new Error('Skeleton v1.3: rig_root not found');

root.userData.rigVersion = '1.3';
scene.userData.rigVersion = '1.3';

const CONTRACT_VERSION = 1;
const jointLayer = new THREE.Group();
jointLayer.name = 'skeleton_contract_v1';
jointLayer.visible = false;
root.add(jointLayer);

const joints = new Map();
const segments = new Map();
let currentStature = 1.75;

const JOINT_NAMES = Object.freeze([
  'pelvis_center',
  'spine_S1', 'spine_L1', 'spine_T12', 'spine_T1',
  'shoulder_L', 'elbow_L', 'wrist_L',
  'shoulder_R', 'elbow_R', 'wrist_R',
  'hip_L', 'knee_L', 'ankle_L',
  'hip_R', 'knee_R', 'ankle_R',
]);

const SEGMENT_DEFS = Object.freeze({
  spine_sacrum_lumbar: ['pelvis_center', 'spine_L1'],
  spine_lumbar_thoracic: ['spine_L1', 'spine_T12'],
  spine_thoracic_upper: ['spine_T12', 'spine_T1'],
  upperarm_L: ['shoulder_L', 'elbow_L'],
  forearm_L: ['elbow_L', 'wrist_L'],
  upperarm_R: ['shoulder_R', 'elbow_R'],
  forearm_R: ['elbow_R', 'wrist_R'],
  thigh_L: ['hip_L', 'knee_L'],
  shin_L: ['knee_L', 'ankle_L'],
  thigh_R: ['hip_R', 'knee_R'],
  shin_R: ['knee_R', 'ankle_R'],
});

function makeJoint(name) {
  const node = new THREE.Group();
  node.name = `joint_${name}`;
  node.userData.semanticName = name;
  node.userData.kind = 'skeleton-joint';
  jointLayer.add(node);
  joints.set(name, node);
  return node;
}

for (const name of JOINT_NAMES) makeJoint(name);

function setWorldPosition(node, world) {
  root.updateMatrixWorld(true);
  node.position.copy(root.worldToLocal(world.clone()));
  node.quaternion.identity();
  node.scale.set(1, 1, 1);
  node.updateMatrix();
}

function sourceWorld(name) {
  // v1.2 landmark names are used ONLY as migration input while building v1.3.
  // Mechanics never sees these source meshes.
  const source = root.getObjectByName(name);
  return source ? source.getWorldPosition(new THREE.Vector3()) : null;
}

function anthropometricRest(stature) {
  const A = scaledAnthropometry(stature);
  const ankle = A.ankleJointHeight;
  const knee = ankle + A.tibia;
  const hip = knee + A.femur;
  const s1 = hip + .125 * (stature / 1.75);
  const l1 = s1 + .18 * (stature / 1.75);
  const t12 = l1 + .022 * (stature / 1.75);
  const t1 = t12 + .30 * (stature / 1.75);
  const t3T = 10 / 12;
  const shoulderY = t12 + (t1 - t12) * t3T + .01 * (stature / 1.75);
  const elbowY = shoulderY - A.humerus;
  const wristY = elbowY - A.radius;

  return {
    pelvis_center: new THREE.Vector3(0, hip + .05 * (stature / 1.75), 0),
    spine_S1: new THREE.Vector3(0, s1, -.010 * (stature / 1.75)),
    spine_L1: new THREE.Vector3(0, l1, -.005 * (stature / 1.75)),
    spine_T12: new THREE.Vector3(0, t12, -.005 * (stature / 1.75)),
    spine_T1: new THREE.Vector3(0, t1, -.020 * (stature / 1.75)),
    shoulder_L: new THREE.Vector3(-A.shoulderJointHalfWidth, shoulderY, 0),
    elbow_L: new THREE.Vector3(-(A.shoulderJointHalfWidth + .025 * (stature / 1.75)), elbowY, .004 * (stature / 1.75)),
    wrist_L: new THREE.Vector3(-(A.shoulderJointHalfWidth + .035 * (stature / 1.75)), wristY, .010 * (stature / 1.75)),
    shoulder_R: new THREE.Vector3(A.shoulderJointHalfWidth, shoulderY, 0),
    elbow_R: new THREE.Vector3(A.shoulderJointHalfWidth + .025 * (stature / 1.75), elbowY, .004 * (stature / 1.75)),
    wrist_R: new THREE.Vector3(A.shoulderJointHalfWidth + .035 * (stature / 1.75), wristY, .010 * (stature / 1.75)),
    hip_L: new THREE.Vector3(-A.hipCenterHalfWidth, hip, A.hipCenterDepth || .014),
    knee_L: new THREE.Vector3(-A.hipCenterHalfWidth * .72, knee, -.020 * (stature / 1.75)),
    ankle_L: new THREE.Vector3(-A.hipCenterHalfWidth * .86, ankle, -.048 * (stature / 1.75)),
    hip_R: new THREE.Vector3(A.hipCenterHalfWidth, hip, A.hipCenterDepth || .014),
    knee_R: new THREE.Vector3(A.hipCenterHalfWidth * .72, knee, -.020 * (stature / 1.75)),
    ankle_R: new THREE.Vector3(A.hipCenterHalfWidth * .86, ankle, -.048 * (stature / 1.75)),
  };
}

function rebuildRestPose({ stature = currentStature, preferSource = false } = {}) {
  currentStature = Number(stature) || 1.75;
  const generated = anthropometricRest(currentStature);

  for (const name of JOINT_NAMES) {
    let world = null;
    // At 1.75 m we can migrate exact current v1.2 landmark placement once.
    if (preferSource && Math.abs(currentStature - 1.75) < 1e-6) world = sourceWorld(name);
    if (!world) world = generated[name];
    if (!world) throw new Error(`Skeleton v1.3: no rest position for ${name}`);
    setWorldPosition(joints.get(name), world);
  }

  jointLayer.updateMatrixWorld(true);
  return getRestMetrics();
}

function getJoint(name) {
  return joints.get(name) || null;
}

function getSegment(name) {
  const def = SEGMENT_DEFS[name];
  if (!def) return null;
  const a = getJoint(def[0]);
  const b = getJoint(def[1]);
  if (!a || !b) return null;
  return {
    name,
    a: def[0],
    b: def[1],
    start: a.getWorldPosition(new THREE.Vector3()),
    end: b.getWorldPosition(new THREE.Vector3()),
    length: a.getWorldPosition(new THREE.Vector3()).distanceTo(b.getWorldPosition(new THREE.Vector3())),
  };
}

function getRestMetrics() {
  const out = { stature: currentStature, segments: {} };
  for (const name of Object.keys(SEGMENT_DEFS)) out.segments[name] = getSegment(name)?.length ?? null;
  return out;
}

for (const name of Object.keys(SEGMENT_DEFS)) segments.set(name, SEGMENT_DEFS[name]);

// Initial migration: preserve v1.2 landmark placement at 175 cm where available.
rebuildRestPose({ stature: 1.75, preferSource: true });

const api = Object.freeze({
  contractVersion: CONTRACT_VERSION,
  skeletonVersion: '1.3',
  jointNames: JOINT_NAMES,
  segmentNames: Object.freeze(Object.keys(SEGMENT_DEFS)),
  jointRoot: jointLayer,
  getJoint,
  getSegment,
  getRestMetrics,
  rebuildRestPose,
});

root.userData.skeletonAPI = api;
scene.userData.skeletonContractVersion = CONTRACT_VERSION;
scene.userData.skeletonVersion = '1.3';

const title = document.querySelector('.info .title');
if (title) title.textContent = 'Skeleton v1.3';
const sub = document.querySelector('.info .sub');
if (sub) sub.innerHTML = 'mechanics-ready contract v1 · dynamic rest joints<br>геометрия v1.2 · рост 1750 мм';
const metrics = document.getElementById('metrics');
if (metrics) metrics.insertAdjacentHTML('beforeend', '<div class="row"><span>Contract</span><span>v1 · stable joints/segments</span></div><div class="row"><span>Rest pose</span><span>rebuildable by stature</span></div>');

export { api as skeletonAPI };

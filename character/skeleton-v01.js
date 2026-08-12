import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { scaledAnthropometry } from './anthropometry-v01.js';

const container = document.getElementById('app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);

const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.01, 100);
camera.position.set(2.7, 1.55, 4.8);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(0, 0.90, 0);
controls.minDistance = 1.7;
controls.maxDistance = 8;
controls.enablePan = false;

scene.add(new THREE.HemisphereLight(0xdde8ff, 0x1d2330, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(4, 6, 5);
scene.add(key);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(2.25, 64),
  new THREE.MeshStandardMaterial({ color: 0x151923, roughness: 1, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

const grid = new THREE.GridHelper(4, 20, 0x2a3140, 0x1a202b);
grid.position.y = 0.002;
scene.add(grid);

const skeletonRoot = new THREE.Group();
scene.add(skeletonRoot);

const MAT_BONE = new THREE.MeshStandardMaterial({ color: 0xd7dbe7, roughness: .68, metalness: .05 });
const MAT_JOINT = new THREE.MeshStandardMaterial({ color: 0xf0a65b, roughness: .58, metalness: .03 });
const MAT_END = new THREE.MeshStandardMaterial({ color: 0x7cc7ff, roughness: .52, metalness: .04 });
const MAT_CORE = new THREE.MeshStandardMaterial({ color: 0xb8a8ff, roughness: .58, metalness: .03 });
const MAT_FRAME = new THREE.MeshStandardMaterial({ color: 0x8a95ae, roughness: .72, metalness: .02 });

const A = scaledAnthropometry(1.75);
const nodes = {};
const bones = [];

function addNode(name, xyz, radius = 0.025, material = MAT_JOINT) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), material);
  mesh.position.set(...xyz);
  mesh.name = name;
  skeletonRoot.add(mesh);
  nodes[name] = mesh;
}

function addBone(name, aName, bName, radius = 0.014, material = MAT_BONE) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12, 1, false), material);
  mesh.name = name;
  skeletonRoot.add(mesh);
  bones.push({ mesh, aName, bName });
}

function syncBone(b) {
  const a = nodes[b.aName].position;
  const c = nodes[b.bName].position;
  const mid = a.clone().add(c).multiplyScalar(.5);
  const len = a.distanceTo(c);
  b.mesh.position.copy(mid);
  b.mesh.scale.set(1, len, 1);
  b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize());
}

function syncBones() { bones.forEach(syncBone); }

function buildLandmarks() {
  const H = A.stature;
  const ankleY = A.ankleJointHeight;
  const kneeY = ankleY + A.tibia;
  const hipY = kneeY + A.femur;

  const pelvisCenterY = hipY + A.pelvisHeight * 0.35;
  const pelvisTopY = pelvisCenterY + A.pelvisHeight * 0.42;
  const pelvisBottomY = pelvisCenterY - A.pelvisHeight * 0.42;

  const ribBottomY = pelvisTopY + H * 0.075;
  const ribTopY = ribBottomY + A.ribCageHeight;
  const ribMidY = (ribTopY + ribBottomY) * 0.5;

  const neckBaseY = ribTopY + H * 0.018;
  const neckTopY = neckBaseY + A.neckLength;
  const crownY = H;
  const headCenterY = crownY - A.headHeight * 0.50;

  const shoulderY = ribTopY - A.scapulaHeight * 0.16;
  const elbowY = shoulderY - A.humerus;
  const wristY = elbowY - A.radius;
  const handY = wristY - A.hand * 0.48;
  const fingerY = wristY - A.hand;

  const px = A.pelvisWidth * 0.5;
  const pz = A.pelvisDepth * 0.5;
  const rx = A.ribCageWidth * 0.5;
  const rz = A.ribCageDepth * 0.5;
  const ux = A.upperThoraxWidth * 0.5;
  const hipX = A.hipCenterHalfWidth;
  const shoulderX = A.shoulderJointHalfWidth;

  return {
    pelvisCenter: [0, pelvisCenterY, 0],
    pelvisTopL: [-px, pelvisTopY, -pz * .05],
    pelvisTopR: [ px, pelvisTopY, -pz * .05],
    pelvisFrontL: [-px * .78, pelvisCenterY,  pz],
    pelvisFrontR: [ px * .78, pelvisCenterY,  pz],
    pelvisBackL: [-px * .72, pelvisCenterY, -pz],
    pelvisBackR: [ px * .72, pelvisCenterY, -pz],
    pelvisBottomL: [-px * .55, pelvisBottomY, 0],
    pelvisBottomR: [ px * .55, pelvisBottomY, 0],
    sacrum: [0, pelvisCenterY + A.pelvisHeight * .18, -pz * .62],
    hipL: [-hipX, hipY, A.hipCenterDepth],
    hipR: [ hipX, hipY, A.hipCenterDepth],

    lumbarLow: [0, pelvisTopY + H * .035, -0.018],
    lumbarHigh: [0, ribBottomY - H * .025, -0.004],
    thoracicLow: [0, ribBottomY + A.ribCageHeight * .22, 0.012],
    thoracicMid: [0, ribMidY, 0.022],
    thoracicHigh: [0, ribTopY - A.ribCageHeight * .18, 0.012],
    neckBase: [0, neckBaseY, -0.004],
    neckTop: [0, neckTopY, 0],
    head: [0, headCenterY, 0.006],
    crown: [0, crownY, 0.006],

    ribLowL: [-rx * .86, ribBottomY, 0],
    ribLowR: [ rx * .86, ribBottomY, 0],
    ribLowFront: [0, ribBottomY, rz * .78],
    ribLowBack: [0, ribBottomY, -rz * .70],
    ribMidL: [-rx, ribMidY, 0],
    ribMidR: [ rx, ribMidY, 0],
    ribMidFront: [0, ribMidY, rz],
    ribMidBack: [0, ribMidY, -rz * .86],
    ribTopL: [-ux, ribTopY, 0],
    ribTopR: [ ux, ribTopY, 0],
    ribTopFront: [0, ribTopY, rz * .64],
    ribTopBack: [0, ribTopY, -rz * .62],
    sternumTop: [0, ribTopY - A.ribCageHeight * .08, rz * .67],
    sternumBottom: [0, ribBottomY + A.ribCageHeight * .18, rz * .80],

    scapulaMedialL: [-ux * .63, shoulderY - A.scapulaHeight * .28, -A.scapulaDepth],
    scapulaMedialR: [ ux * .63, shoulderY - A.scapulaHeight * .28, -A.scapulaDepth],
    scapulaInferiorL: [-ux * .78, shoulderY - A.scapulaHeight, -A.scapulaDepth * .82],
    scapulaInferiorR: [ ux * .78, shoulderY - A.scapulaHeight, -A.scapulaDepth * .82],
    glenoidL: [-shoulderX, shoulderY, -0.006],
    glenoidR: [ shoulderX, shoulderY, -0.006],
    clavicleMedialL: [-0.018, ribTopY - .008, rz * .48],
    clavicleMedialR: [ 0.018, ribTopY - .008, rz * .48],
    clavicleL: [-A.clavicle * .72, shoulderY + .012, 0.018],
    clavicleR: [ A.clavicle * .72, shoulderY + .012, 0.018],
    shoulderL: [-shoulderX, shoulderY, 0],
    shoulderR: [ shoulderX, shoulderY, 0],

    elbowL: [-shoulderX - .025, elbowY, .008],
    elbowR: [ shoulderX + .025, elbowY, .008],
    wristL: [-shoulderX - .035, wristY, .014],
    wristR: [ shoulderX + .035, wristY, .014],
    handL: [-shoulderX - .037, handY, .018],
    handR: [ shoulderX + .037, handY, .018],
    fingerL: [-shoulderX - .039, fingerY, .020],
    fingerR: [ shoulderX + .039, fingerY, .020],

    kneeL: [-hipX * .90, kneeY, .012],
    kneeR: [ hipX * .90, kneeY, .012],
    ankleL: [-hipX * .86, ankleY, 0],
    ankleR: [ hipX * .86, ankleY, 0],
    heelL: [-hipX * .86, H * .022, -A.foot * .22],
    heelR: [ hipX * .86, H * .022, -A.foot * .22],
    toeL: [-hipX * .86, H * .020, A.foot * .78],
    toeR: [ hipX * .86, H * .020, A.foot * .78],
  };
}

const P = buildLandmarks();

for (const [name, xyz] of Object.entries(P)) {
  let radius = A.stature * .012;
  let material = MAT_JOINT;

  if (/pelvis|sacrum|lumbar|thoracic|neck|head/.test(name)) material = MAT_CORE;
  if (/rib|sternum|scapula|clavicle/.test(name)) material = MAT_FRAME;
  if (/toe|heel|finger|crown/.test(name)) material = MAT_END;

  if (name === 'head') radius = A.headHeight * .42;
  else if (/hip|shoulder|glenoid/.test(name)) radius = A.stature * .018;
  else if (/knee|elbow/.test(name)) radius = A.stature * .016;
  else if (/ankle|wrist/.test(name)) radius = A.stature * .013;
  else if (/pelvisCenter|sacrum/.test(name)) radius = A.stature * .020;
  else if (/rib|scapula|clavicle|sternum/.test(name)) radius = A.stature * .009;
  else if (/toe|heel|finger|crown/.test(name)) radius = A.stature * .010;

  addNode(name, xyz, radius, material);
}

[
  ['pelvisTopL','pelvisFrontL'], ['pelvisFrontL','pelvisBottomL'], ['pelvisBottomL','pelvisBackL'], ['pelvisBackL','pelvisTopL'],
  ['pelvisTopR','pelvisFrontR'], ['pelvisFrontR','pelvisBottomR'], ['pelvisBottomR','pelvisBackR'], ['pelvisBackR','pelvisTopR'],
  ['pelvisTopL','pelvisTopR'], ['pelvisBottomL','pelvisBottomR'], ['pelvisBackL','sacrum'], ['pelvisBackR','sacrum'],
  ['pelvisCenter','hipL'], ['pelvisCenter','hipR']
].forEach((x, i) => addBone('pelvisFrame' + i, x[0], x[1], .011, MAT_FRAME));

[
  ['sacrum','lumbarLow'], ['lumbarLow','lumbarHigh'], ['lumbarHigh','thoracicLow'],
  ['thoracicLow','thoracicMid'], ['thoracicMid','thoracicHigh'], ['thoracicHigh','neckBase'],
  ['neckBase','neckTop'], ['neckTop','head'], ['head','crown']
].forEach((x, i) => addBone('spine' + i, x[0], x[1], i < 6 ? .015 : .012));

for (const level of ['Low', 'Mid', 'Top']) {
  const l = 'rib' + level + 'L';
  const r = 'rib' + level + 'R';
  const f = 'rib' + level + 'Front';
  const b = 'rib' + level + 'Back';
  addBone('rib' + level + 'LF', l, f, .008, MAT_FRAME);
  addBone('rib' + level + 'RF', r, f, .008, MAT_FRAME);
  addBone('rib' + level + 'LB', l, b, .008, MAT_FRAME);
  addBone('rib' + level + 'RB', r, b, .008, MAT_FRAME);
}
addBone('sternum','sternumTop','sternumBottom',.010,MAT_FRAME);
addBone('thoraxFrontTop','sternumTop','ribTopFront',.007,MAT_FRAME);
addBone('thoraxFrontBottom','sternumBottom','ribLowFront',.007,MAT_FRAME);
addBone('thoraxBackLow','thoracicLow','ribLowBack',.007,MAT_FRAME);
addBone('thoraxBackMid','thoracicMid','ribMidBack',.007,MAT_FRAME);
addBone('thoraxBackTop','thoracicHigh','ribTopBack',.007,MAT_FRAME);

for (const s of ['L', 'R']) {
  addBone('clavicleMedial' + s, 'sternumTop', 'clavicleMedial' + s, .010, MAT_FRAME);
  addBone('clavicle' + s, 'clavicleMedial' + s, 'clavicle' + s, .011, MAT_BONE);
  addBone('clavicleDistal' + s, 'clavicle' + s, 'glenoid' + s, .010, MAT_BONE);
  addBone('scapulaUpper' + s, 'scapulaMedial' + s, 'glenoid' + s, .009, MAT_FRAME);
  addBone('scapulaLowerA' + s, 'scapulaMedial' + s, 'scapulaInferior' + s, .009, MAT_FRAME);
  addBone('scapulaLowerB' + s, 'scapulaInferior' + s, 'glenoid' + s, .009, MAT_FRAME);
  addBone('glenoidToShoulder' + s, 'glenoid' + s, 'shoulder' + s, .009, MAT_FRAME);

  addBone('femur' + s, 'hip' + s, 'knee' + s, .020, MAT_BONE);
  addBone('tibia' + s, 'knee' + s, 'ankle' + s, .017, MAT_BONE);
  addBone('foot' + s, 'ankle' + s, 'toe' + s, .016, MAT_BONE);
  addBone('heel' + s, 'ankle' + s, 'heel' + s, .012, MAT_BONE);

  addBone('humerus' + s, 'shoulder' + s, 'elbow' + s, .017, MAT_BONE);
  addBone('radius' + s, 'elbow' + s, 'wrist' + s, .014, MAT_BONE);
  addBone('palm' + s, 'wrist' + s, 'hand' + s, .014, MAT_BONE);
  addBone('handEnd' + s, 'hand' + s, 'finger' + s, .011, MAT_BONE);
}

const base = {};
for (const [name, mesh] of Object.entries(nodes)) base[name] = mesh.position.clone();

function resetPose() {
  for (const [name, p] of Object.entries(base)) nodes[name].position.copy(p);
}

function pose(name) {
  resetPose();

  if (name === 'relaxed') {
    const dx = .018;
    for (const n of ['pelvisCenter','sacrum','pelvisTopL','pelvisTopR','pelvisFrontL','pelvisFrontR','pelvisBackL','pelvisBackR','pelvisBottomL','pelvisBottomR']) {
      nodes[n].position.x += dx;
    }
    nodes.lumbarLow.position.x += dx * .8;
    nodes.lumbarHigh.position.x += dx * .5;
    nodes.thoracicLow.position.x += dx * .25;
    nodes.shoulderL.position.y -= .012;
    nodes.glenoidL.position.y -= .010;
    nodes.scapulaMedialL.position.y -= .008;
    nodes.elbowL.position.z += .050;
    nodes.wristL.position.z += .075;
    nodes.handL.position.z += .080;
    nodes.fingerL.position.z += .085;
    nodes.kneeL.position.x -= .010;
    nodes.ankleL.position.x -= .015;
  }

  if (name === 'step') {
    nodes.hipL.position.z += .030;
    nodes.kneeL.position.z += .120;
    nodes.ankleL.position.z += .190;
    nodes.heelL.position.z += .190;
    nodes.toeL.position.z += .205;

    nodes.hipR.position.z -= .025;
    nodes.kneeR.position.z -= .090;
    nodes.ankleR.position.z -= .135;
    nodes.heelR.position.z -= .135;
    nodes.toeR.position.z -= .115;

    nodes.elbowL.position.z -= .055;
    nodes.wristL.position.z -= .105;
    nodes.handL.position.z -= .120;
    nodes.fingerL.position.z -= .130;
    nodes.elbowR.position.z += .055;
    nodes.wristR.position.z += .105;
    nodes.handR.position.z += .120;
    nodes.fingerR.position.z += .130;
  }

  syncBones();
}

document.querySelectorAll('[data-pose]').forEach(btn => {
  btn.addEventListener('click', () => pose(btn.dataset.pose));
});

syncBones();

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize, { passive: true });

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

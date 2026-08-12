import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);

const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.01, 100);
camera.position.set(2.8, 1.55, 5.0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(0, 0.92, 0);
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

const nodes = {};
const bones = [];

function sphere(name, p, radius = .038, material = MAT_JOINT) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), material);
  mesh.position.copy(p);
  mesh.name = name;
  skeletonRoot.add(mesh);
  nodes[name] = mesh;
  return mesh;
}

function cylinder(name, aName, bName, radius = .018, material = MAT_BONE) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12, 1, false), material);
  mesh.name = name;
  skeletonRoot.add(mesh);
  bones.push({ mesh, aName, bName });
  return mesh;
}

function updateBone(b) {
  const a = nodes[b.aName].position;
  const c = nodes[b.bName].position;
  const mid = a.clone().add(c).multiplyScalar(.5);
  const len = a.distanceTo(c);
  b.mesh.position.copy(mid);
  b.mesh.scale.set(1, len, 1);
  b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize());
}

// Adult baseline rig. One canonical height drives all landmarks.
// These values are deliberately separated from rendering so later body presets can override them.
const BODY = {
  height: 1.75,
  headHeight: 0.225,
  neckLength: 0.105,
  shoulderHalfWidth: 0.205,
  hipHalfWidth: 0.105,
  upperArmLength: 0.315,
  forearmLength: 0.265,
  handLength: 0.185,
  femurLength: 0.445,
  tibiaLength: 0.425,
  footLength: 0.255,
};

function buildLandmarks(b = BODY) {
  const H = b.height;

  const ankleY = 0.075;
  const kneeY = ankleY + b.tibiaLength;
  const hipY = kneeY + b.femurLength;

  const crownY = H;
  const headCenterY = crownY - b.headHeight * 0.5;
  const headBaseY = crownY - b.headHeight;
  const neckTopY = headBaseY - 0.012;
  const neckBaseY = neckTopY - b.neckLength;

  // The spine is sampled along a gentle anatomical S curve in depth.
  const pelvisY = hipY + 0.015;
  const sacrumY = pelvisY + 0.075;
  const lumbarLowY = pelvisY + 0.155;
  const lumbarHighY = pelvisY + 0.255;
  const thoracicLowY = pelvisY + 0.355;
  const thoracicMidY = pelvisY + 0.455;
  const thoracicHighY = neckBaseY - 0.045;

  const shoulderY = neckBaseY - 0.015;
  const elbowY = shoulderY - b.upperArmLength;
  const wristY = elbowY - b.forearmLength;
  const handEndY = wristY - b.handLength;

  return {
    pelvis: [0, pelvisY, -0.012],
    sacrum: [0, sacrumY, -0.020],
    lumbarLow: [0, lumbarLowY, -0.010],
    lumbarHigh: [0, lumbarHighY, 0.006],
    thoracicLow: [0, thoracicLowY, 0.020],
    thoracicMid: [0, thoracicMidY, 0.018],
    thoracicHigh: [0, thoracicHighY, 0.004],
    neckBase: [0, neckBaseY, -0.005],
    neckTop: [0, neckTopY, 0],
    head: [0, headCenterY, 0.005],
    crown: [0, crownY, 0.005],

    hipL: [-b.hipHalfWidth, hipY, 0],
    hipR: [ b.hipHalfWidth, hipY, 0],
    kneeL: [-b.hipHalfWidth * .92, kneeY, 0.012],
    kneeR: [ b.hipHalfWidth * .92, kneeY, 0.012],
    ankleL: [-b.hipHalfWidth * .88, ankleY, 0],
    ankleR: [ b.hipHalfWidth * .88, ankleY, 0],
    heelL: [-b.hipHalfWidth * .88, 0.042, -0.055],
    heelR: [ b.hipHalfWidth * .88, 0.042, -0.055],
    toeL: [-b.hipHalfWidth * .88, 0.035, b.footLength - 0.055],
    toeR: [ b.hipHalfWidth * .88, 0.035, b.footLength - 0.055],

    clavicleL: [-0.075, shoulderY + .015, 0],
    clavicleR: [ 0.075, shoulderY + .015, 0],
    shoulderL: [-b.shoulderHalfWidth, shoulderY, 0],
    shoulderR: [ b.shoulderHalfWidth, shoulderY, 0],
    elbowL: [-b.shoulderHalfWidth - .050, elbowY, 0.010],
    elbowR: [ b.shoulderHalfWidth + .050, elbowY, 0.010],
    wristL: [-b.shoulderHalfWidth - .065, wristY, 0.018],
    wristR: [ b.shoulderHalfWidth + .065, wristY, 0.018],
    handL: [-b.shoulderHalfWidth - .067, wristY - b.handLength * .50, 0.022],
    handR: [ b.shoulderHalfWidth + .067, wristY - b.handLength * .50, 0.022],
    fingerL: [-b.shoulderHalfWidth - .068, handEndY, 0.024],
    fingerR: [ b.shoulderHalfWidth + .068, handEndY, 0.024],
  };
}

const P = buildLandmarks();

for (const [name, v] of Object.entries(P)) {
  const end = /crown|toe|heel|finger/.test(name);
  const core = /pelvis|sacrum|lumbar|thoracic|neckBase|neckTop|head/.test(name);
  const radius = name === 'head' ? BODY.headHeight * .34 : name === 'pelvis' ? .052 : .035;
  sphere(name, new THREE.Vector3(...v), radius, end ? MAT_END : (core ? MAT_CORE : MAT_JOINT));
}

// Axial skeleton
[
  ['pelvis','sacrum'], ['sacrum','lumbarLow'], ['lumbarLow','lumbarHigh'],
  ['lumbarHigh','thoracicLow'], ['thoracicLow','thoracicMid'], ['thoracicMid','thoracicHigh'],
  ['thoracicHigh','neckBase'], ['neckBase','neckTop'], ['neckTop','head'], ['head','crown']
].forEach((x, i) => cylinder('spine' + i, x[0], x[1], i < 7 ? .019 : .015));

// Pelvis
cylinder('pelvisL','pelvis','hipL',.022);
cylinder('pelvisR','pelvis','hipR',.022);

// Legs and feet
for (const s of ['L','R']) {
  cylinder('femur'+s,'hip'+s,'knee'+s,.023);
  cylinder('tibia'+s,'knee'+s,'ankle'+s,.020);
  cylinder('rearFoot'+s,'ankle'+s,'heel'+s,.017);
  cylinder('foot'+s,'ankle'+s,'toe'+s,.020);
}

// Shoulder girdle and arms
cylinder('clavicleCenterL','neckBase','clavicleL',.016);
cylinder('clavicleCenterR','neckBase','clavicleR',.016);
for (const s of ['L','R']) {
  cylinder('clavicle'+s,'clavicle'+s,'shoulder'+s,.017);
  cylinder('humerus'+s,'shoulder'+s,'elbow'+s,.020);
  cylinder('forearm'+s,'elbow'+s,'wrist'+s,.017);
  cylinder('palm'+s,'wrist'+s,'hand'+s,.019);
  cylinder('handEnd'+s,'hand'+s,'finger'+s,.014);
}

function syncBones() { bones.forEach(updateBone); }

const base = {};
for (const [name, mesh] of Object.entries(nodes)) base[name] = mesh.position.clone();

function resetPose() {
  for (const [name, v] of Object.entries(base)) nodes[name].position.copy(v);
}

function pose(name) {
  resetPose();

  if (name === 'relaxed') {
    // Subtle contrapposto, not an anatomical solver yet.
    const shift = 0.025;
    ['pelvis','sacrum','lumbarLow'].forEach(n => nodes[n].position.x += shift);
    nodes.lumbarHigh.position.x += shift * .6;
    nodes.thoracicLow.position.x += shift * .3;
    nodes.shoulderL.position.y -= .018;

    nodes.elbowL.position.add(new THREE.Vector3(.020, -.015, .060));
    nodes.wristL.position.add(new THREE.Vector3(.055, -.010, .090));
    nodes.handL.position.add(new THREE.Vector3(.060, -.008, .095));
    nodes.fingerL.position.add(new THREE.Vector3(.060, -.008, .100));

    nodes.elbowR.position.add(new THREE.Vector3(-.015, 0, -.040));
    nodes.wristR.position.add(new THREE.Vector3(-.035, .005, -.065));
    nodes.handR.position.add(new THREE.Vector3(-.038, .005, -.070));
    nodes.fingerR.position.add(new THREE.Vector3(-.040, .005, -.075));

    nodes.kneeL.position.x -= .012;
    nodes.ankleL.position.x -= .018;
  }

  if (name === 'step') {
    nodes.pelvis.position.z = .010;
    nodes.hipL.position.z = .045;
    nodes.kneeL.position.z = .125;
    nodes.ankleL.position.z = .200;
    nodes.heelL.position.z = .140;
    nodes.toeL.position.z = .340;

    nodes.hipR.position.z = -.035;
    nodes.kneeR.position.z = -.100;
    nodes.ankleR.position.z = -.150;
    nodes.heelR.position.z = -.205;
    nodes.toeR.position.z = .015;

    nodes.elbowL.position.z = -.065;
    nodes.wristL.position.z = -.125;
    nodes.handL.position.z = -.145;
    nodes.fingerL.position.z = -.160;

    nodes.elbowR.position.z = .070;
    nodes.wristR.position.z = .135;
    nodes.handR.position.z = .155;
    nodes.fingerR.position.z = .170;
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

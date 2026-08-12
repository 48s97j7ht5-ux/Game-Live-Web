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

const nodes = {};
const bones = [];

function sphere(name, p, radius = .038, material = MAT_JOINT) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), material);
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

// Canonical adult skeleton. All important dimensions are proportions of height.
// This is a neutral baseline, not a male/female body preset.
const BODY = {
  height: 1.75,
  headsTall: 7.5,
  shoulderWidthRatio: 0.245,
  hipJointWidthRatio: 0.125,
  footLengthRatio: 0.148,
};

function buildLandmarks(b = BODY) {
  const H = b.height;
  const headH = H / b.headsTall;
  const shoulderHalf = H * b.shoulderWidthRatio * 0.5;
  const hipHalf = H * b.hipJointWidthRatio * 0.5;
  const footLength = H * b.footLengthRatio;

  // Vertical anthropometric landmarks. They are kept independent so later presets
  // can alter leg/torso proportions without rewriting the renderer.
  const ankleY = H * 0.045;
  const kneeY = H * 0.285;
  const hipY = H * 0.530;
  const pelvisY = H * 0.542;

  const crownY = H;
  const headCenterY = crownY - headH * 0.50;
  const chinY = crownY - headH;
  const neckTopY = chinY + headH * 0.13;
  const neckBaseY = H * 0.815;
  const shoulderY = H * 0.805;

  const sacrumY = H * 0.585;
  const lumbarLowY = H * 0.630;
  const lumbarHighY = H * 0.680;
  const thoracicLowY = H * 0.725;
  const thoracicMidY = H * 0.765;
  const thoracicHighY = H * 0.800;

  const elbowY = H * 0.620;
  const wristY = H * 0.485;
  const palmCenterY = H * 0.435;
  const fingerY = H * 0.380;

  return {
    pelvis: [0, pelvisY, -0.014],
    sacrum: [0, sacrumY, -0.024],
    lumbarLow: [0, lumbarLowY, -0.016],
    lumbarHigh: [0, lumbarHighY, 0.000],
    thoracicLow: [0, thoracicLowY, 0.018],
    thoracicMid: [0, thoracicMidY, 0.024],
    thoracicHigh: [0, thoracicHighY, 0.012],
    neckBase: [0, neckBaseY, -0.002],
    neckTop: [0, neckTopY, 0.002],
    head: [0, headCenterY, 0.008],
    crown: [0, crownY, 0.008],

    hipL: [-hipHalf, hipY, 0],
    hipR: [ hipHalf, hipY, 0],
    kneeL: [-hipHalf * .88, kneeY, 0.014],
    kneeR: [ hipHalf * .88, kneeY, 0.014],
    ankleL: [-hipHalf * .82, ankleY, 0],
    ankleR: [ hipHalf * .82, ankleY, 0],
    heelL: [-hipHalf * .82, H * .022, -footLength * .22],
    heelR: [ hipHalf * .82, H * .022, -footLength * .22],
    toeL: [-hipHalf * .82, H * .020, footLength * .78],
    toeR: [ hipHalf * .82, H * .020, footLength * .78],

    clavicleL: [-shoulderHalf * .42, shoulderY + H * .010, 0.005],
    clavicleR: [ shoulderHalf * .42, shoulderY + H * .010, 0.005],
    shoulderL: [-shoulderHalf, shoulderY, 0],
    shoulderR: [ shoulderHalf, shoulderY, 0],
    elbowL: [-shoulderHalf - H * .030, elbowY, 0.010],
    elbowR: [ shoulderHalf + H * .030, elbowY, 0.010],
    wristL: [-shoulderHalf - H * .038, wristY, 0.018],
    wristR: [ shoulderHalf + H * .038, wristY, 0.018],
    handL: [-shoulderHalf - H * .040, palmCenterY, 0.022],
    handR: [ shoulderHalf + H * .040, palmCenterY, 0.022],
    fingerL: [-shoulderHalf - H * .041, fingerY, 0.024],
    fingerR: [ shoulderHalf + H * .041, fingerY, 0.024],
  };
}

const P = buildLandmarks();
const HEAD_HEIGHT = BODY.height / BODY.headsTall;

for (const [name, v] of Object.entries(P)) {
  const end = /crown|toe|heel|finger/.test(name);
  const core = /pelvis|sacrum|lumbar|thoracic|neckBase|neckTop|head/.test(name);

  let radius = BODY.height * 0.020;
  if (name === 'head') radius = HEAD_HEIGHT * 0.47;
  if (name === 'pelvis') radius = BODY.height * 0.032;
  if (/shoulder|hip/.test(name)) radius = BODY.height * 0.023;
  if (/knee|elbow/.test(name)) radius = BODY.height * 0.021;
  if (/ankle|wrist|hand/.test(name)) radius = BODY.height * 0.018;
  if (end) radius = BODY.height * 0.016;
  if (name === 'crown') radius = BODY.height * 0.012;

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

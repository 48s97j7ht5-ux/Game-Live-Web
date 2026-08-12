import * as THREE from 'three';

// Skeleton v1.3 internal migration helper.
// Hides only legacy cylinders whose actual WORLD endpoints match an explicit
// named anatomical connection. No spatial-area selection is used.

function find(root, names) {
  for (const name of names) {
    const object = root.getObjectByName(name);
    if (object) return object;
  }
  return null;
}

function worldPoint(object) {
  return object.getWorldPosition(new THREE.Vector3());
}

function cylinderEndpoints(mesh) {
  mesh.updateMatrixWorld(true);
  const height = mesh.geometry?.parameters?.height ?? 1;
  const a = new THREE.Vector3(0, -height * 0.5, 0).applyMatrix4(mesh.matrixWorld);
  const b = new THREE.Vector3(0,  height * 0.5, 0).applyMatrix4(mesh.matrixWorld);
  return [a, b];
}

function pairError(a, b, A, B) {
  const direct = a.distanceTo(A) + b.distanceTo(B);
  const reverse = a.distanceTo(B) + b.distanceTo(A);
  return Math.min(direct, reverse);
}

export function hideLegacyCylinderBetween(root, aNames, bNames, tolerance = 0.012) {
  const aObject = find(root, aNames);
  const bObject = find(root, bNames);
  if (!aObject || !bObject) return 0;

  root.updateMatrixWorld(true);
  const A = worldPoint(aObject);
  const B = worldPoint(bObject);
  let best = null;
  let bestError = Infinity;

  root.traverse(object => {
    if (!object.isMesh || object.geometry?.type !== 'CylinderGeometry' || !object.visible) return;
    if (object.userData?.kind === 'driven-bone') return;
    const [p0, p1] = cylinderEndpoints(object);
    const error = pairError(p0, p1, A, B);
    if (error < bestError) {
      bestError = error;
      best = object;
    }
  });

  if (best && bestError <= tolerance * 2) {
    best.visible = false;
    best.userData.hiddenBySkeletonV13 = true;
    best.userData.legacyEndpoints = `${aObject.name || aNames[0]}->${bObject.name || bNames[0]}`;
    return 1;
  }
  return 0;
}

export function hideLegacyLeftLegShaftsExact(root) {
  const connections = [
    [['hip_L','hipL'], ['fNeckL']],
    [['fNeckL'], ['fShaftTopL']],
    [['fShaftTopL'], ['fCondMedL']],
    [['fShaftTopL'], ['fCondLatL']],
    [['tPlatMedL'], ['tShaftTopL']],
    [['tPlatLatL'], ['tShaftTopL']],
    [['tShaftTopL'], ['ankle_L','anL']],
    [['fibHeadL'], ['fibAnL']],
  ];

  let hidden = 0;
  for (const [a, b] of connections) hidden += hideLegacyCylinderBetween(root, a, b);
  return hidden;
}

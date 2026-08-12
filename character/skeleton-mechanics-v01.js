import * as THREE from 'three';

/**
 * Skeleton mechanics v0.1
 *
 * IMPORTANT:
 * - skeleton-v12.js is treated as a frozen geometry/visual rig.
 * - this module never edits the source geometry definition.
 * - mechanics talks to the rig only through the semantic names published by v1.2.
 *
 * Public contract expected from skeleton-v12.js:
 * rig_root
 * pelvis_center, spine_S1, spine_L1, spine_T12, spine_T1
 * shoulder_L/R, elbow_L/R, wrist_L/R
 * hip_L/R, knee_L/R, ankle_L/R
 */

export const SKELETON_MECHANICS_VERSION = '0.1';
export const TARGET_RIG_VERSION = '1.2';

export const JOINT_LIMITS = Object.freeze({
  shoulder: Object.freeze({ flexion: [-40, 180], abduction: [-30, 180], rotation: [-90, 90] }),
  elbow: Object.freeze({ flexion: [0, 150], rotation: [-80, 80] }),
  wrist: Object.freeze({ flexion: [-80, 70], deviation: [-25, 35] }),
  hip: Object.freeze({ flexion: [-25, 125], abduction: [-30, 50], rotation: [-45, 45] }),
  knee: Object.freeze({ flexion: [0, 145], rotation: [-10, 10] }),
  ankle: Object.freeze({ flexion: [-50, 25], inversion: [-35, 20] }),
  spine: Object.freeze({ flexion: [-35, 55], lateral: [-30, 30], rotation: [-40, 40] }),
});

const REQUIRED_JOINTS = Object.freeze([
  'pelvis_center', 'spine_S1', 'spine_L1', 'spine_T12', 'spine_T1',
  'shoulder_L', 'elbow_L', 'wrist_L',
  'shoulder_R', 'elbow_R', 'wrist_R',
  'hip_L', 'knee_L', 'ankle_L',
  'hip_R', 'knee_R', 'ankle_R',
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const degToRad = THREE.MathUtils.degToRad;

function cloneTransform(object) {
  return {
    position: object.position.clone(),
    quaternion: object.quaternion.clone(),
    scale: object.scale.clone(),
    visible: object.visible,
  };
}

function restoreTransform(object, state) {
  object.position.copy(state.position);
  object.quaternion.copy(state.quaternion);
  object.scale.copy(state.scale);
  object.visible = state.visible;
  object.updateMatrix();
}

function inferJointType(name) {
  if (name.startsWith('shoulder_')) return 'shoulder';
  if (name.startsWith('elbow_')) return 'elbow';
  if (name.startsWith('wrist_')) return 'wrist';
  if (name.startsWith('hip_')) return 'hip';
  if (name.startsWith('knee_')) return 'knee';
  if (name.startsWith('ankle_')) return 'ankle';
  if (name.startsWith('spine_') || name === 'pelvis_center') return 'spine';
  return null;
}

export class SkeletonMechanics {
  constructor(rigRoot) {
    if (!rigRoot?.isGroup) throw new Error('SkeletonMechanics: rig_root Group is required');
    this.root = rigRoot;
    this.rigVersion = String(rigRoot.userData?.rigVersion || 'unknown');
    this.joints = new Map();
    this.rest = new Map();
    this.pose = new Map();
    this.enabled = true;

    this._indexRig();
    this._captureRestPose();
    this.validate();
  }

  _indexRig() {
    for (const name of REQUIRED_JOINTS) {
      const object = this.root.getObjectByName(name);
      if (object) this.joints.set(name, object);
    }
  }

  _captureRestPose() {
    this.root.traverse((object) => {
      this.rest.set(object.uuid, cloneTransform(object));
    });
    for (const name of this.joints.keys()) {
      this.pose.set(name, { x: 0, y: 0, z: 0 });
    }
  }

  validate() {
    const missing = REQUIRED_JOINTS.filter((name) => !this.joints.has(name));
    if (missing.length) {
      throw new Error(`SkeletonMechanics: missing rig joints: ${missing.join(', ')}`);
    }
    return {
      ok: true,
      mechanicsVersion: SKELETON_MECHANICS_VERSION,
      rigVersion: this.rigVersion,
      joints: this.joints.size,
    };
  }

  getJoint(name) {
    return this.joints.get(name) || null;
  }

  getJointPosition(name, world = false) {
    const joint = this.getJoint(name);
    if (!joint) throw new Error(`SkeletonMechanics: unknown joint ${name}`);
    return world ? joint.getWorldPosition(new THREE.Vector3()) : joint.position.clone();
  }

  getPose() {
    const result = {};
    for (const [name, value] of this.pose) result[name] = { ...value };
    return result;
  }

  getLimits(jointName) {
    const type = inferJointType(jointName);
    return type ? JOINT_LIMITS[type] : null;
  }

  clampAngle(jointName, channel, degrees) {
    const limits = this.getLimits(jointName);
    const range = limits?.[channel];
    if (!range) throw new Error(`SkeletonMechanics: unsupported channel ${jointName}.${channel}`);
    return clamp(Number(degrees) || 0, range[0], range[1]);
  }

  /**
   * Stores a constrained logical joint state.
   * v0.1 deliberately does NOT rewrite frozen skeleton geometry here.
   * Visual deformation is applied by dedicated mechanics passes built on top of this state.
   */
  setJointState(jointName, values = {}) {
    if (!this.joints.has(jointName)) throw new Error(`SkeletonMechanics: unknown joint ${jointName}`);
    const type = inferJointType(jointName);
    const limits = JOINT_LIMITS[type] || {};
    const current = this.pose.get(jointName) || {};
    const next = { ...current };

    for (const [channel, value] of Object.entries(values)) {
      if (!limits[channel]) continue;
      next[channel] = this.clampAngle(jointName, channel, value);
    }

    this.pose.set(jointName, next);
    return { ...next };
  }

  /**
   * Low-level pivot helper for future deformation passes.
   * Rotates arbitrary rig objects around a semantic joint without modifying skeleton-v12.js.
   */
  rotateObjectsAroundJoint(jointName, objects, axis, degrees) {
    if (!this.enabled) return;
    const joint = this.getJoint(jointName);
    if (!joint) throw new Error(`SkeletonMechanics: unknown joint ${jointName}`);

    const pivot = joint.position.clone();
    const q = new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), degToRad(degrees));

    for (const object of objects) {
      if (!object || object === joint || !object.parent) continue;
      object.position.sub(pivot).applyQuaternion(q).add(pivot);
      object.quaternion.premultiply(q);
      object.updateMatrix();
    }
  }

  resetPose() {
    this.root.traverse((object) => {
      const state = this.rest.get(object.uuid);
      if (state) restoreTransform(object, state);
    });
    for (const name of this.pose.keys()) this.pose.set(name, { x: 0, y: 0, z: 0 });
    this.root.updateMatrixWorld(true);
  }
}

export function createSkeletonMechanics(rigRoot) {
  return new SkeletonMechanics(rigRoot);
}

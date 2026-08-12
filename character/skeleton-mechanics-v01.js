import * as THREE from 'three';

/**
 * Skeleton mechanics v0.1
 *
 * IMPORTANT:
 * - skeleton-v12.js is treated as a frozen geometry/visual rig.
 * - this module never edits the source geometry definition.
 * - mechanics talks to the rig through the semantic names published by v1.2.
 * - moving parts are selected from the already-built rig at runtime; source geometry stays untouched.
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

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
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

function sideSuffix(side) {
  if (side === 'L' || side === 'R') return side;
  throw new Error(`SkeletonMechanics: side must be L or R, got ${side}`);
}

export class SkeletonMechanics {
  constructor(rigRoot) {
    if (!rigRoot?.isGroup) throw new Error('SkeletonMechanics: rig_root Group is required');
    this.root = rigRoot;
    this.rigVersion = String(rigRoot.userData?.rigVersion || 'unknown');
    this.joints = new Map();
    this.rest = new Map();
    this.pose = new Map();
    this.chains = new Map();
    this.enabled = true;

    this._indexRig();
    this._captureRestPose();
    this.validate();
    this._buildLegChains();
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

  _restPosition(object) {
    return this.rest.get(object.uuid)?.position || object.position;
  }

  _buildLegChains() {
    for (const side of ['L', 'R']) {
      const sign = side === 'L' ? -1 : 1;
      const hip = this.getJoint(`hip_${side}`);
      const knee = this.getJoint(`knee_${side}`);
      const ankle = this.getJoint(`ankle_${side}`);
      const hp = this._restPosition(hip);
      const kp = this._restPosition(knee);
      const ap = this._restPosition(ankle);

      // The v1.2 rig is intentionally flat rather than parented as bones.
      // Mechanics therefore builds a runtime membership map once from the frozen rest pose.
      // Side + anatomical height bands are used only to identify which already-created meshes
      // belong to a leg; semantic joint lookup itself never depends on coordinates.
      const legObjects = [];
      const belowKnee = [];
      const footObjects = [];

      this.root.traverse((object) => {
        if (!object.isMesh || object === hip || object === knee || object === ankle) return;
        const p = this._restPosition(object);
        if (Math.sign(p.x) !== sign) return;

        const lateralDistance = Math.abs(p.x - hp.x);
        const insideLegColumn = lateralDistance < 0.16;
        if (!insideLegColumn) return;

        if (p.y <= hp.y + 0.04) legObjects.push(object);
        if (p.y <= kp.y + 0.018) belowKnee.push(object);
        if (p.y <= ap.y + 0.055) footObjects.push(object);
      });

      // Include semantic distal joints so parent rotations carry the complete chain.
      legObjects.push(knee, ankle);
      belowKnee.push(ankle);

      this.chains.set(`leg_${side}`, {
        side,
        hip,
        knee,
        ankle,
        hipObjects: [...new Set(legObjects)],
        kneeObjects: [...new Set(belowKnee)],
        ankleObjects: [...new Set(footObjects)],
      });
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

  getChainInfo(side) {
    const suffix = sideSuffix(side);
    const chain = this.chains.get(`leg_${suffix}`);
    return {
      side: suffix,
      hipObjects: chain.hipObjects.length,
      kneeObjects: chain.kneeObjects.length,
      ankleObjects: chain.ankleObjects.length,
    };
  }

  clampAngle(jointName, channel, degrees) {
    const limits = this.getLimits(jointName);
    const range = limits?.[channel];
    if (!range) throw new Error(`SkeletonMechanics: unsupported channel ${jointName}.${channel}`);
    return clamp(Number(degrees) || 0, range[0], range[1]);
  }

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
   * Rotates arbitrary flat-rig objects around a semantic joint.
   * The pivot is always read from the currently posed joint, so chained rotations compose.
   */
  rotateObjectsAroundJoint(jointName, objects, axis, degrees) {
    if (!this.enabled || !degrees) return;
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

  /**
   * Rebuilds one leg pose from the frozen rest pose every call.
   * This avoids cumulative numerical drift and makes sliders deterministic.
   *
   * flexion: sagittal plane around X
   * abduction: frontal plane around Z
   * rotation: long-axis turn around Y
   */
  setLegPose(side, values = {}) {
    const suffix = sideSuffix(side);
    const chain = this.chains.get(`leg_${suffix}`);
    if (!chain) throw new Error(`SkeletonMechanics: leg chain ${suffix} not built`);

    const hipFlexion = this.clampAngle(`hip_${suffix}`, 'flexion', values.hipFlexion ?? 0);
    const hipAbduction = this.clampAngle(`hip_${suffix}`, 'abduction', values.hipAbduction ?? 0);
    const hipRotation = this.clampAngle(`hip_${suffix}`, 'rotation', values.hipRotation ?? 0);
    const kneeFlexion = this.clampAngle(`knee_${suffix}`, 'flexion', values.kneeFlexion ?? 0);
    const ankleFlexion = this.clampAngle(`ankle_${suffix}`, 'flexion', values.ankleFlexion ?? 0);
    const ankleInversion = this.clampAngle(`ankle_${suffix}`, 'inversion', values.ankleInversion ?? 0);

    // Deterministic solve: return complete rig to the frozen v1.2 rest pose, then compose.
    const otherPose = this._snapshotLogicalPose();
    this._restoreGeometryOnly();

    // Re-apply the other leg first so changing one side does not erase the opposite side pose.
    const otherSide = suffix === 'L' ? 'R' : 'L';
    const other = otherPose[`leg_${otherSide}`];
    if (other) this._applyLegPose(otherSide, other);

    const requested = { hipFlexion, hipAbduction, hipRotation, kneeFlexion, ankleFlexion, ankleInversion };
    this._applyLegPose(suffix, requested);
    this.pose.set(`hip_${suffix}`, { flexion: hipFlexion, abduction: hipAbduction, rotation: hipRotation });
    this.pose.set(`knee_${suffix}`, { flexion: kneeFlexion, rotation: 0 });
    this.pose.set(`ankle_${suffix}`, { flexion: ankleFlexion, inversion: ankleInversion });
    this.root.updateMatrixWorld(true);
    return { ...requested };
  }

  _applyLegPose(side, values) {
    const chain = this.chains.get(`leg_${side}`);
    const sideSign = side === 'L' ? -1 : 1;

    // Positive hip flexion moves the thigh forward (+Z in this rig).
    this.rotateObjectsAroundJoint(`hip_${side}`, chain.hipObjects, AXIS_X, -values.hipFlexion);
    this.rotateObjectsAroundJoint(`hip_${side}`, chain.hipObjects, AXIS_Z, sideSign * -values.hipAbduction);
    this.rotateObjectsAroundJoint(`hip_${side}`, chain.hipObjects, AXIS_Y, sideSign * values.hipRotation);

    // Positive knee flexion folds the lower leg backward relative to the thigh.
    this.rotateObjectsAroundJoint(`knee_${side}`, chain.kneeObjects, AXIS_X, values.kneeFlexion);

    // Ankle acts only on the foot/distal structures.
    this.rotateObjectsAroundJoint(`ankle_${side}`, chain.ankleObjects, AXIS_X, -values.ankleFlexion);
    this.rotateObjectsAroundJoint(`ankle_${side}`, chain.ankleObjects, AXIS_Z, sideSign * values.ankleInversion);
  }

  _snapshotLogicalPose() {
    const out = {};
    for (const side of ['L', 'R']) {
      const hip = this.pose.get(`hip_${side}`) || {};
      const knee = this.pose.get(`knee_${side}`) || {};
      const ankle = this.pose.get(`ankle_${side}`) || {};
      out[`leg_${side}`] = {
        hipFlexion: hip.flexion || 0,
        hipAbduction: hip.abduction || 0,
        hipRotation: hip.rotation || 0,
        kneeFlexion: knee.flexion || 0,
        ankleFlexion: ankle.flexion || 0,
        ankleInversion: ankle.inversion || 0,
      };
    }
    return out;
  }

  _restoreGeometryOnly() {
    this.root.traverse((object) => {
      const state = this.rest.get(object.uuid);
      if (state) restoreTransform(object, state);
    });
    this.root.updateMatrixWorld(true);
  }

  bendKnee(side, degrees) {
    const suffix = sideSuffix(side);
    const current = this._snapshotLogicalPose()[`leg_${suffix}`];
    return this.setLegPose(suffix, { ...current, kneeFlexion: degrees });
  }

  rotateHip(side, degrees) {
    const suffix = sideSuffix(side);
    const current = this._snapshotLogicalPose()[`leg_${suffix}`];
    return this.setLegPose(suffix, { ...current, hipFlexion: degrees });
  }

  flexAnkle(side, degrees) {
    const suffix = sideSuffix(side);
    const current = this._snapshotLogicalPose()[`leg_${suffix}`];
    return this.setLegPose(suffix, { ...current, ankleFlexion: degrees });
  }

  resetPose() {
    this._restoreGeometryOnly();
    for (const name of this.pose.keys()) this.pose.set(name, { x: 0, y: 0, z: 0 });
    this.root.updateMatrixWorld(true);
  }
}

export function createSkeletonMechanics(rigRoot) {
  return new SkeletonMechanics(rigRoot);
}

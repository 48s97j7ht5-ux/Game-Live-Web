import * as THREE from 'three';

/**
 * Skeleton Rig v0.1
 *
 * Purpose:
 * - provide a mechanical hierarchy independent from anatomical dimensions;
 * - read current semantic joint positions from the visible skeleton at runtime;
 * - rebuild from changed anatomy without changing movement rules;
 * - keep Skeleton v1.2+ as the source of anatomical proportions/landmarks.
 *
 * This module does NOT modify skeleton-v12.js.
 */

export const SKELETON_RIG_VERSION = '0.1';

const REQUIRED = Object.freeze([
  'pelvis_center',
  'hip_L', 'knee_L', 'ankle_L',
  'hip_R', 'knee_R', 'ankle_R',
  'shoulder_L', 'elbow_L', 'wrist_L',
  'shoulder_R', 'elbow_R', 'wrist_R',
  'spine_S1', 'spine_L1', 'spine_T12', 'spine_T1',
]);

function assertJoint(sourceRoot, name) {
  const joint = sourceRoot.getObjectByName(name);
  if (!joint) throw new Error(`SkeletonRig: missing semantic joint ${name}`);
  return joint;
}

function localFromWorld(parent, worldPosition) {
  return parent.worldToLocal(worldPosition.clone());
}

function worldPositionOf(object) {
  return object.getWorldPosition(new THREE.Vector3());
}

export class SkeletonRig {
  constructor(sourceRoot) {
    if (!sourceRoot?.isObject3D) throw new Error('SkeletonRig: source rig root is required');
    this.sourceRoot = sourceRoot;
    this.root = new THREE.Group();
    this.root.name = 'mechanical_rig_root';
    this.root.visible = false;
    this.nodes = new Map();
    this.links = new Map();
    this.sourceVersion = String(sourceRoot.userData?.rigVersion || 'unknown');
    this._validateSource();
    this.rebuildFromSource();
  }

  _validateSource() {
    const missing = REQUIRED.filter(name => !this.sourceRoot.getObjectByName(name));
    if (missing.length) throw new Error(`SkeletonRig: missing source joints: ${missing.join(', ')}`);
  }

  _makeNode(name, parent = this.root) {
    const g = new THREE.Group();
    g.name = `rig_${name}`;
    g.userData.jointName = name;
    parent.add(g);
    this.nodes.set(name, g);
    return g;
  }

  _placeNodeFromSource(name) {
    const source = assertJoint(this.sourceRoot, name);
    const node = this.nodes.get(name);
    const parent = node.parent;
    node.position.copy(localFromWorld(parent, worldPositionOf(source)));
    node.quaternion.identity();
    node.scale.set(1, 1, 1);
    node.updateMatrix();
    node.updateMatrixWorld(true);
  }

  _link(name, a, b) {
    const A = this.nodes.get(a), B = this.nodes.get(b);
    this.links.set(name, {
      a, b,
      get length() {
        const pa = A.getWorldPosition(new THREE.Vector3());
        const pb = B.getWorldPosition(new THREE.Vector3());
        return pa.distanceTo(pb);
      },
    });
  }

  rebuildFromSource() {
    this.root.clear();
    this.nodes.clear();
    this.links.clear();

    // Trunk hierarchy. Pelvis is the mechanical root; spine grows upward from it.
    const pelvis = this._makeNode('pelvis_center', this.root);
    const s1 = this._makeNode('spine_S1', pelvis);
    const l1 = this._makeNode('spine_L1', s1);
    const t12 = this._makeNode('spine_T12', l1);
    const t1 = this._makeNode('spine_T1', t12);

    // Legs: movement rules live in the hierarchy, dimensions come from source joint positions.
    const hipL = this._makeNode('hip_L', pelvis);
    const kneeL = this._makeNode('knee_L', hipL);
    const ankleL = this._makeNode('ankle_L', kneeL);

    const hipR = this._makeNode('hip_R', pelvis);
    const kneeR = this._makeNode('knee_R', hipR);
    const ankleR = this._makeNode('ankle_R', kneeR);

    // Arms branch from upper trunk.
    const shoulderL = this._makeNode('shoulder_L', t1);
    const elbowL = this._makeNode('elbow_L', shoulderL);
    const wristL = this._makeNode('wrist_L', elbowL);

    const shoulderR = this._makeNode('shoulder_R', t1);
    const elbowR = this._makeNode('elbow_R', shoulderR);
    const wristR = this._makeNode('wrist_R', elbowR);

    this.root.updateMatrixWorld(true);

    // Important: child nodes are placed from source WORLD coordinates, converted into the
    // current parent's local space. Therefore any future change in height/proportions only
    // changes offsets/segment lengths, not the hierarchy or movement code.
    for (const name of [
      'pelvis_center', 'spine_S1', 'spine_L1', 'spine_T12', 'spine_T1',
      'hip_L', 'knee_L', 'ankle_L', 'hip_R', 'knee_R', 'ankle_R',
      'shoulder_L', 'elbow_L', 'wrist_L', 'shoulder_R', 'elbow_R', 'wrist_R',
    ]) {
      this.root.updateMatrixWorld(true);
      this._placeNodeFromSource(name);
    }

    this._link('thigh_L', 'hip_L', 'knee_L');
    this._link('shin_L', 'knee_L', 'ankle_L');
    this._link('thigh_R', 'hip_R', 'knee_R');
    this._link('shin_R', 'knee_R', 'ankle_R');
    this._link('upperarm_L', 'shoulder_L', 'elbow_L');
    this._link('forearm_L', 'elbow_L', 'wrist_L');
    this._link('upperarm_R', 'shoulder_R', 'elbow_R');
    this._link('forearm_R', 'elbow_R', 'wrist_R');

    this.root.updateMatrixWorld(true);
    return this.getMetrics();
  }

  getNode(name) {
    return this.nodes.get(name) || null;
  }

  getWorldPosition(name) {
    const node = this.getNode(name);
    if (!node) throw new Error(`SkeletonRig: unknown node ${name}`);
    return node.getWorldPosition(new THREE.Vector3());
  }

  getMetrics() {
    const result = {
      rigVersion: SKELETON_RIG_VERSION,
      sourceVersion: this.sourceVersion,
      segments: {},
    };
    for (const [name, link] of this.links) result.segments[name] = link.length;
    return result;
  }

  resetRotations() {
    for (const node of this.nodes.values()) node.quaternion.identity();
    this.root.updateMatrixWorld(true);
  }
}

export function createSkeletonRig(sourceRoot) {
  return new SkeletonRig(sourceRoot);
}

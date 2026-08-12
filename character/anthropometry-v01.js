// Character Engine anthropometry baseline v0.2
// Units: metres.
//
// Long-bone values below preserve the research-backed reference already used by
// the project. Axial/pelvic values are explicit rig parameters so that they can
// later be replaced by sex/population/preset distributions without changing the
// skeleton renderer.

export const REFERENCE_ADULT = {
  stature: 1.75,

  // Long bones (osteometric reference)
  femur: 0.4443,
  tibia: 0.3549,
  fibula: 0.3533,
  humerus: 0.3171,
  radius: 0.2292,
  ulna: 0.2458,
  clavicle: 0.1480,

  // Distal body segments (rig targets, not single bones)
  hand: 0.185,
  foot: 0.255,
  headHeight: 0.232,

  // Joint / landmark heights
  ankleJointHeight: 0.078,

  // Pelvic frame. These are neutral engineering baseline dimensions used to
  // place the acetabula and sacrum in 3D; later presets may override them.
  pelvisWidth: 0.285,
  pelvisDepth: 0.190,
  pelvisHeight: 0.205,
  hipCenterHalfWidth: 0.092,
  hipCenterDepth: 0.018,

  // Rib-cage frame (skeletal envelope, not skin/chest circumference).
  ribCageWidth: 0.285,
  ribCageDepth: 0.205,
  ribCageHeight: 0.330,
  upperThoraxWidth: 0.235,

  // Shoulder girdle / scapular frame.
  scapulaHeight: 0.145,
  scapulaWidth: 0.100,
  scapulaDepth: 0.075,
  shoulderJointHalfWidth: 0.215,

  // Neck/head support.
  neckLength: 0.105,
};

const NON_SCALING_KEYS = new Set(['stature']);

export function scaledAnthropometry(stature = REFERENCE_ADULT.stature, overrides = {}) {
  const k = stature / REFERENCE_ADULT.stature;
  const out = {};

  for (const [key, value] of Object.entries(REFERENCE_ADULT)) {
    out[key] = NON_SCALING_KEYS.has(key) ? stature : value * k;
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined && value !== null) out[key] = value;
  }

  return out;
}

export const REFERENCE_RATIOS = {
  femurToTibia: REFERENCE_ADULT.femur / REFERENCE_ADULT.tibia,
  humerusToRadius: REFERENCE_ADULT.humerus / REFERENCE_ADULT.radius,
  humerusToUlna: REFERENCE_ADULT.humerus / REFERENCE_ADULT.ulna,
  clavicleToHumerus: REFERENCE_ADULT.clavicle / REFERENCE_ADULT.humerus,
};

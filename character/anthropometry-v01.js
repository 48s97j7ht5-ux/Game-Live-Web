// Research-backed anthropometry baseline for Character Engine skeleton v0.1.
// Units: metres. These are a neutral adult reference assembled from published
// osteometric/anthropometric measurements and are meant to be parameter inputs,
// not a claim that a single 'average human' exists.
//
// Key source-derived relations used here:
// - New Zealand European adult male osteometric means: humerus 317.1 mm,
//   radius 229.2 mm, ulna 245.8 mm, femur 444.3 mm, tibia 354.9 mm.
//   Source: Fundamental ratios and logarithmic periodicity in human limb bones
//   (PMC3633342).
// - Clavicle CT means are roughly 155 mm male / 141 mm female; neutral baseline
//   below uses the midpoint 148 mm.
// - Whole-body stature remains a separate generator parameter; long-bone ratios
//   are preserved when the baseline is scaled.

export const REFERENCE_ADULT = {
  stature: 1.75,

  // Long bones
  femur: 0.4443,
  tibia: 0.3549,
  fibula: 0.3533,
  humerus: 0.3171,
  radius: 0.2292,
  ulna: 0.2458,
  clavicle: 0.1480,

  // Distal segments. These are external segment targets rather than a single bone.
  hand: 0.185,
  foot: 0.255,

  // Head/axial landmarks used by the rig renderer.
  headHeight: 0.232,
  ankleJointHeight: 0.078,
  hipJointHalfWidth: 0.095,
  shoulderJointHalfWidth: 0.215,
};

export function scaledAnthropometry(stature = REFERENCE_ADULT.stature) {
  const k = stature / REFERENCE_ADULT.stature;
  const out = {};
  for (const [key, value] of Object.entries(REFERENCE_ADULT)) {
    out[key] = key === 'stature' ? stature : value * k;
  }
  return out;
}

export const REFERENCE_RATIOS = {
  femurToTibia: REFERENCE_ADULT.femur / REFERENCE_ADULT.tibia,
  humerusToRadius: REFERENCE_ADULT.humerus / REFERENCE_ADULT.radius,
  humerusToUlna: REFERENCE_ADULT.humerus / REFERENCE_ADULT.ulna,
};

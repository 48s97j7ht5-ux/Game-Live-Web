# Body Shading Passport v0.8

## 1. Purpose

`body_shading` is a separate visual layer that gives the character body volume without baking those shadows into `body_base`.

It must follow body deformation, but remain independently replaceable, tunable and hideable.

---

## 2. What belongs in `body_shading`

The layer may contain:

- clavicle shadows;
- shadow under the breasts / chest volume;
- rib-cage side shadow;
- waist side shadows;
- abdomen volume;
- navel shadow;
- pelvis front-plane shadow;
- inner-thigh / groin transition shadow;
- knee shadows;
- calf shadows;
- ankle shadows;
- subtle highlights where required by the pixel-art style.

The layer must not contain:

- hair;
- face features;
- underwear;
- clothing;
- accessories;
- body hair;
- freckles, scars or tattoos;
- the base body silhouette.

---

## 3. Canvas and alignment

`body_shading` uses the same logical canvas as `body_base`:

- canvas: `240 × 400 px`;
- same origin;
- same body anchors;
- transparent background;
- no anti-aliasing;
- integer pixel coordinates only.

The layer must line up with `body_base` at the reference pose and reference proportions.

---

## 4. Shading zones

### Zone S1 — clavicles and shoulder girdle

Contains:

- clavicle shadow;
- small shadow under the neck base;
- shoulder transition shadow.

Follows:

- `shoulders` strongly;
- `height` only through vertical placement.

Must not:

- stretch across the neck;
- become a hard horizontal stripe;
- move independently from `shoulder_chest_block`.

---

### Zone S2 — chest volume

Contains:

- breast/chest underside shading;
- upper rib-cage volume;
- soft center-chest separation where stylistically appropriate.

Follows:

- chest/torso anchors;
- `shoulders` slightly;
- `waist` slightly through lower rib-cage transition.

Must not:

- be scaled aggressively with `waist`;
- distort the breast/chest form;
- be painted as two isolated circular shadows.

Future note:

If breast shape becomes a separate body parameter, S2 should have discrete presets rather than heavy geometric stretching.

---

### Zone S3 — waist and abdomen

Contains:

- side shadows of the abdomen;
- subtle central abdominal volume;
- navel;
- lower-rib transition.

Follows:

- `waist` strongly;
- `height` slightly.

Must not:

- create an extreme hourglass effect by itself;
- move the navel away from the torso centerline;
- intrude into pelvis shading.

---

### Zone S4 — pelvis and hip volume

Contains:

- front pelvis plane;
- side hip shadow;
- lower-abdomen transition;
- groin/upper-thigh transition shadow.

Follows:

- `hips` strongly;
- `waist` slightly at the top boundary;
- `height` only through vertical placement.

Must not:

- create a diamond-shaped pelvis;
- draw a visible seam between abdomen and hips;
- split left/right hip volume too harshly.

---

### Zone S5 — inner thighs

Contains:

- inner-thigh separation;
- soft shadow where legs emerge from pelvis;
- upper-leg volume near the hip socket.

Follows:

- `hips` strongly near the top;
- leg deformation below.

Must not:

- become a black vertical gap;
- detach thighs visually from pelvis;
- stay fixed while hip width changes.

---

### Zone S6 — knees

Contains:

- knee-cap suggestion;
- inner/outer knee shadow;
- transition from thigh to lower leg.

Follows:

- knee anchors;
- `height` through anchor movement.

Should be treated as semi-locked.

Must not:

- be stretched independently;
- become a circular joint symbol;
- remain at a fixed Y coordinate when leg length changes.

---

### Zone S7 — calves and shins

Contains:

- calf side shadow;
- shin light/shadow balance;
- lower-leg taper.

Follows:

- leg length;
- small leg width changes.

Must not:

- stretch uniformly as a texture;
- distort the ankle zone.

---

### Zone S8 — ankles and feet transition

Contains:

- ankle shadow;
- Achilles/side transition if visible in the chosen front pose;
- small contact shadow above the feet.

Follows:

- ankle anchors.

This zone is almost locked and should mostly move, not deform.

---

## 5. Deformation policy

### `height`

Shading behavior:

- move knee and ankle shading with their anchors;
- stretch only the long, low-detail portions of thigh/shin shading;
- do not stretch clavicles, navel, knees or ankle details.

Recommended distribution:

- lower-leg shading: high positional change;
- thigh shading: medium positional change;
- torso shading: low vertical change;
- head/neck shading: almost none.

---

### `shoulders`

Shading behavior:

- widen S1;
- slightly reposition upper chest shading;
- move arm-root shadows with shoulder anchors.

Do not affect:

- pelvis;
- knees;
- calves;
- feet.

---

### `waist`

Shading behavior:

- move side abdomen shadows inward/outward;
- preserve central navel anchor;
- adjust lower-rib transition smoothly.

Do not:

- scale the whole torso shading uniformly;
- move chest shading aggressively.

---

### `hips`

Shading behavior:

- widen S4;
- move upper inner-thigh shadows;
- reposition leg-root shadows;
- keep center pelvis/groin reference stable.

Do not:

- stretch knee/calf shading with hip width.

---

## 6. Anchor requirements

`body_shading` must use these body anchors:

```text
neck_base_center
left_shoulder_anchor
right_shoulder_anchor
chest_center
underbust_center
waist_center
navel_anchor
pelvis_center
groin_center
left_hip_anchor
right_hip_anchor
left_knee_anchor
right_knee_anchor
left_ankle_anchor
right_ankle_anchor
```

Additional shading-local anchors may be added, but they should derive from body anchors rather than replace them.

---

## 7. Locked, semi-locked and deformable shading features

### Locked / move-only

- navel mark;
- knee-cap detail;
- ankle detail;
- small clavicle highlight accents.

### Semi-locked

- breast/chest underside shading;
- clavicle shadow;
- pelvis center shading;
- knee transitions.

### Deformable

- side waist shadows;
- broad hip side shadows;
- long thigh gradients;
- calf side gradients.

---

## 8. Data representation

Recommended structure:

```js
export const BODY_SHADING = {
  canvas: { width: 240, height: 400 },

  zones: {
    clavicles: { ... },
    chest: { ... },
    waist_abdomen: { ... },
    pelvis: { ... },
    inner_thighs: { ... },
    knees: { ... },
    calves: { ... },
    ankles: { ... }
  },

  anchors: {
    neck_base_center: { ... },
    chest_center: { ... },
    waist_center: { ... },
    navel_anchor: { ... },
    pelvis_center: { ... },
    left_knee_anchor: { ... },
    right_knee_anchor: { ... },
    left_ankle_anchor: { ... },
    right_ankle_anchor: { ... }
  }
};
```

Each zone should support:

```js
{
  bitmap,
  bounds,
  anchor,
  deformPolicy,
  minScaleX,
  maxScaleX,
  minScaleY,
  maxScaleY,
  lockedFeatures
}
```

---

## 9. Render order

The base order for the relevant layers is:

```text
hair_back
body_base
body_shading
face
underwear_top
underwear_bottom
hair_front
```

`body_shading` must always render immediately after `body_base` and before face/hair/clothing layers.

---

## 10. Success criteria

`body_shading` is considered successful when:

- `body_base` still reads as a body without it;
- enabling shading adds volume rather than changing the silhouette;
- changing `height / shoulders / waist / hips` keeps shadows attached to the correct anatomical regions;
- no shadow crosses outside the body after allowed deformation;
- knees, navel and ankle details stay anatomically aligned;
- the character remains readable as pixel-art at the final display scale.

---

## 11. Implementation sequence

1. Prepare a clean `body_base` asset at reference proportions.
2. Create `body_shading` as a transparent aligned layer.
3. Split shading into zones S1–S8.
4. Bind each zone to body anchors.
5. Implement `shoulders` and `waist` deformation first.
6. Add `hips` deformation.
7. Add height-driven anchor movement for knees/ankles.
8. Only after stable body + shading, add face/hair/underwear layers.

---

## 12. Core rule

> Shading follows anatomy. It must never become a second silhouette generator.

The body shape belongs to `body_base`; `body_shading` only explains the volume of that shape.

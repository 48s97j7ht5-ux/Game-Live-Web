# Underwear Layer Passport v0.8

## Purpose
Underwear is the first clothing test layer. It must follow the body without being baked into `body_base`.

## Layers
### `underwear_top`
Contains:
- bra / bralette / simple top pixels
- cups / band
- straps where applicable

Attached primarily to:
- `chest_center`
- `underbust_center`
- `left_shoulder_anchor`
- `right_shoulder_anchor`

### `underwear_bottom`
Contains:
- panties front panel
- waistband
- side straps / side seams
- leg openings

Attached primarily to:
- `waist_center`
- `pelvis_center`
- `left_hip_anchor`
- `right_hip_anchor`
- `groin_center`

## Canvas
Use the same 240×400 master canvas as body assets.

## Deformation policy
Underwear must follow body deformation locally.

### `underwear_top`
May respond to:
- shoulder width: small strap/upper-band repositioning
- torso/chest width: local horizontal deformation
- height: only anchor translation, not global scaling

Must not respond to:
- hips
- leg length

### `underwear_bottom`
May respond to:
- waist width
- hip width
- small pelvis vertical shifts

Must not respond to:
- shoulder width
- face/head changes
- leg length except anchor translation at the pelvis

## Fit model
Each underwear asset should define:
- base body preset it was authored against
- anchor offsets
- deform zones
- max safe horizontal deformation
- overlap priority
- coverage mask

Suggested safe deformation range for v0.8:
- horizontal: roughly ±8–12% around the authored body
- vertical: mostly translation; scaling kept minimal

Beyond the safe range, switch to another authored size/shape preset rather than stretching indefinitely.

## Occlusion
Underwear renders above `body_shading`, but body contour still determines the silhouette underneath.

Later clothing may cover underwear partially or completely. Visibility should be resolved by layer order / coverage masks rather than deleting underwear state.

## Rendering order
`body_base` → `body_shading` → `face` → `underwear_top` → `underwear_bottom` → outer clothing → `hair_front` where hairstyle requires it.

## Success criteria
- changing hips makes bottom underwear follow the pelvis instead of stretching unrelated areas
- changing shoulders does not alter bottom underwear
- changing height does not stretch bra cups or waistband vertically
- underwear remains a removable/switchable layer independent from the body

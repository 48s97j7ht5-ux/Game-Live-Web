# Hair Layer Passport v0.8

## Purpose
Hair is split into two independent layers so it can wrap around the head and shoulders without becoming part of `body_base`.

## Layers
### `hair_back`
Rendered behind `body_base`.
Contains:
- rear hair mass
- hair behind neck
- rear strands behind shoulders
- long hair sections that sit behind torso

### `hair_front`
Rendered above `face` and, where needed, above shoulders/clothing.
Contains:
- fringe / bangs
- side strands around cheeks
- front locks
- strands crossing the forehead or shoulders

## Excludes
- scalp / skull silhouette
- eyebrows
- facial shading
- body shading
- clothing

## Canvas
Use the same 240×400 master canvas as all character layers.

## Required anchors
- `head_top_center`
- `face_center`
- `neck_base_center`
- `left_shoulder_anchor`
- `right_shoulder_anchor`
- optional `hair_length_reference`

## Deformation policy
Hair does **not** follow body deformation globally.

Allowed:
- translate with the head
- small integer corrections at shoulder anchors
- optional segmented adjustment for very long hair when torso height changes
- preset-specific masks for length / volume / style

Forbidden:
- scaling with `waist`
- scaling with `hips`
- stretching the whole hairstyle with `height`
- widening hair automatically with `shoulders`

## Hair preset structure
Each hairstyle should define:
- `back_asset`
- `front_asset`
- anchor offsets
- overlap rules
- allowed corrective shifts
- palette / color mapping

Example IDs:
- `short_bob_01`
- `messy_medium_01`
- `long_straight_01`
- `ponytail_01`

## Color
Prefer palette remapping over separate full sprites for every color. Preserve highlight/shadow relationships through indexed shades.

## Rendering order
`hair_back` → `body_base` → `body_shading` → `face` → underwear/clothing → `hair_front`.

## Success criteria
- changing waist or hips never distorts hair
- head movement keeps front/back hair aligned
- long hair may react to torso/shoulder anchors without visibly stretching
- swapping hairstyles does not require changing the body asset

# Face Layer Passport v0.8

## Purpose
`face` is a separate, mostly locked raster layer attached to `body_base` through head anchors. It must never define the head silhouette.

## Contains
- eyes
- eyebrows
- nose marks
- mouth
- eyelashes if used by style
- blush / facial highlights
- optional expression-specific pixels

## Excludes
- skull / jaw silhouette
- ears silhouette
- hair
- neck
- global head shading
- accessories

## Canvas
Use the same 240×400 master canvas as the body assets to avoid sub-pixel alignment. The useful face area should remain tightly bounded around the head.

## Required anchors
- `face_center`
- `left_eye_anchor`
- `right_eye_anchor`
- `nose_anchor`
- `mouth_anchor`
- `left_brow_anchor`
- `right_brow_anchor`

All anchors are resolved from `body_base`, not from the face layer itself.

## Deformation policy
Status: **locked**.

Allowed:
- integer translation with the head anchor
- at most ±1 px corrective shift after body deformation
- switching whole face presets / expressions

Forbidden:
- scaling with `height`
- scaling with `shoulders`
- scaling with `waist`
- scaling with `hips`
- non-uniform stretching of eyes or mouth

## Expression system
Expressions should be variants of the same facial anchor layout:
- `neutral`
- `smile`
- `annoyed`
- `sad`
- `surprised`
- `flirty` later if needed

The expression system swaps only face pixels. It does not alter the body or head silhouette.

## Rendering order
`body_base` → `body_shading` → `face` → front hair / clothing overlays.

## Success criteria
- changing body proportions never distorts facial features
- eyes remain aligned and symmetrical where intended
- face remains readable at 400 px character scale
- expression swaps do not move the head or hair

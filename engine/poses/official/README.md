# Official pose assets

Poses follow the MPFB pose JSON format (`docs/fileformats/pose.md` in MPFB2):
`RigService.set_pose_from_dict()` — FK poses are applied **from rest** on the matching skeleton type.

## What exists for this rig

Anny / MPFB ship **only T-pose** for `game_engine_with_breast_fk`:

- `anny-t-pose.json` — NAVER Anny `src/anny/data/mpfb2/poses/game_engine_with_breast_fk/t-pose.json`

`a-pose.json` is the same file with every Euler scaled by 0.42 (same bones, same axes). Rest is identity (no pose dict).

## What we do not apply here

MakeHuman Community `poses01` BVH files (`callharvey3d_sitting*.bvh`, `anrico_sitting03.bvh`) are for the **default** MH armature (`spine05`, `upperleg01.L`, …).

MPFB’s “Import MH BVH Pose” is documented as **destructive** (it rewrites bone rolls). Dumping those BVH Eulers onto `game_engine` bones (`thigh_l`, `spine_01`, …) tears the waist — that is what “Сидя 3” showed.

Sitting / walk / hands-on-hips for this project need either:

1. a pose JSON captured in Blender with MPFB MakePose on `game_engine_with_breast`, or
2. Anny `transfer_pose_parameters` between rigs that share bone labels.

Until then the studio only offers Rest / T-pose / A-pose.

Sources:
- https://github.com/naver/anny
- https://github.com/makehumancommunity/mpfb2/blob/master/docs/fileformats/pose.md
- https://github.com/makehumancommunity/mpfb2/blob/master/docs/ui/rigging/applypose.md

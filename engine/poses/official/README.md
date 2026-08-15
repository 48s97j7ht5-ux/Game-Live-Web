# Official pose experiment assets

Browser pose experiment uses original assets rather than hand-authored vertex deformations where possible.

Anny FK (game_engine_with_breast):
- `anny-t-pose.json`: NAVER Anny `game_engine_with_breast_fk` pose.

Mapped/authored FK on `game_engine_with_breast`, same Euler XYZ convention as Anny `t-pose.json`
(upperarm Z = abduct, lowerarm X = elbow, thigh X = flex, thigh Z = spread):

- `a-pose.json`
- `step.json`
- `hands-hips.json`
- `sit-default.json`
- `sit-natural.json`
- `sit-anrico.json`

Do not dump MakeHuman default-skeleton BVH Eulers onto this rig — the rest bone axes differ
and that produced a split squat. Original BVH kept for reference:
- `callharvey3d_sittingdefault.bvh`
- `callharvey3d_sittingnatural.bvh`
- `anrico_sitting03.bvh`

Sources:
- https://github.com/naver/anny
- https://static.makehumancommunity.org/assets/assetpacks/poses01.html

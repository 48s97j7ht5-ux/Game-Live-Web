# Anny / MPFB runtime assets

Vendored browser runtime data from NAVER Anny `src/anny/data/mpfb2`.

Source: `naver/anny`
Source tree: `da6e1069cb2149514aad18abd98729dcd09a1aa3`
Imported: 2026-08-14

The complete MPFB2 data subtree is kept locally so the game runtime does not depend on NAVER raw GitHub URLs. Upstream licensing is preserved inside `mpfb2/LICENSE.md`.

Vendored morph targets used by the character engine:

- `targets/macrodetails` — gender, age, race, muscle, weight, height, proportions
- `targets/breast` — cup / firmness
- `targets/buttocks`, `targets/hands`, `targets/feet`
- `targets/genitals` — adult male morphs

Source commit at import: see git history of this folder.
Refresh with workflow `vendor-mpfb-targets.yml`.

Runtime root: `/engine/anny/mpfb2`

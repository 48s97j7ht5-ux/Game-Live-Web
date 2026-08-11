// Character body layer model v1.2
// Important: geometry is authored per layer; the renderer must not warp the torso to fake breast volume.

export const BODY_LAYER_MODEL_V12 = {
  id: 'female_average_front_v1_2',
  canvas: { width: 126, height: 400 },

  layers: [
    {
      id: 'body_base',
      z: 0,
      required: true,
      description: 'Featureless authored body base: torso/chest wall only. No breast volume, nipples, face, hair or clothing.'
    },
    {
      id: 'breast_shape',
      z: 10,
      required: false,
      description: 'Independent authored breast-volume overlay. No nipples. Swapped/deformed independently of body_base.'
    },
    {
      id: 'nipple_detail',
      z: 20,
      required: false,
      description: 'Independent detail overlay, aligned to breast_shape anchors.'
    },
    {
      id: 'body_shading',
      z: 30,
      required: false,
      description: 'Optional authored shading/detail layer that follows the chosen body geometry.'
    }
  ],

  anchors: {
    chestCenter: { x: 63, y: 124 },
    breastLeft:  { x: 47, y: 124 },
    breastRight: { x: 79, y: 124 },
    underbustLeft:  { x: 47, y: 144 },
    underbustRight: { x: 79, y: 144 }
  },

  breastPresets: [
    { id: 'flat', scale: 0.0 },
    { id: 'small', scale: 0.75 },
    { id: 'average', scale: 1.0 },
    { id: 'large', scale: 1.25 }
  ]
};

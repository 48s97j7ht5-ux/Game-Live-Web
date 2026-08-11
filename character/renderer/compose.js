import {PARTS} from '../data/parts.js';
import {profileScale,verticalExtra} from './deform.js';
import {stamp,pixel} from './raster.js';

export function compose(state){
  const b=new Map(),cx=60;
  const headY=13;
  const torsoUpperY=31;
  const torsoMidY=44+verticalExtra('torsoMid',state);
  const pelvisY=56+verticalExtra('torsoMid',state);
  const thighY=66+verticalExtra('torsoMid',state);
  const lowerY=78+verticalExtra('torsoMid',state)+verticalExtra('thigh',state);
  const footY=93+verticalExtra('torsoMid',state)+verticalExtra('thigh',state)+verticalExtra('lowerLeg',state);
  const shoulderShift=Math.round((state.shoulders-100)/8);
  const hipShift=Math.round((state.hips-100)/10);

  // hair behind body
  stamp(b,PARTS.backHair,cx,11,{shade:'hair'});

  // head + neck as one mass
  stamp(b,PARTS.headNeck,cx,headY,{shade:'skin'});

  // arms first so shoulders can overlap them
  stamp(b,PARTS.upperArm,cx-13-shoulderShift,34,{scaleRow:t=>profileScale('upperArm',t,state),shade:'skin'});
  stamp(b,PARTS.upperArm,cx+13+shoulderShift,34,{scaleRow:t=>profileScale('upperArm',t,state),shade:'skin'});
  stamp(b,PARTS.forearmHand,cx-14-shoulderShift,44,{shade:'skin'});
  stamp(b,PARTS.forearmHand,cx+14+shoulderShift,44,{shade:'skin'});

  // thighs/lower legs before pelvis so hip core covers the sockets
  stamp(b,PARTS.thigh,cx-6-hipShift,thighY,{scaleRow:t=>profileScale('thigh',t,state),stretch:verticalExtra('thigh',state),shade:'skin'});
  stamp(b,PARTS.thigh,cx+6+hipShift,thighY,{scaleRow:t=>profileScale('thigh',t,state),stretch:verticalExtra('thigh',state),shade:'skin'});
  stamp(b,PARTS.lowerLeg,cx-6-hipShift,lowerY,{stretch:verticalExtra('lowerLeg',state),shade:'skin'});
  stamp(b,PARTS.lowerLeg,cx+6+hipShift,lowerY,{stretch:verticalExtra('lowerLeg',state),shade:'skin'});
  stamp(b,PARTS.foot,cx-7-hipShift,footY,{shade:'skin'});
  stamp(b,PARTS.foot,cx+7+hipShift,footY,{shade:'skin'});

  // torso overlaps arm roots
  stamp(b,PARTS.torsoUpper,cx,torsoUpperY,{scaleRow:t=>profileScale('torsoUpper',t,state),shade:'skin'});
  stamp(b,PARTS.torsoMid,cx,torsoMidY,{scaleRow:t=>profileScale('torsoMid',t,state),stretch:verticalExtra('torsoMid',state),shade:'skin'});
  stamp(b,PARTS.pelvisCore,cx,pelvisY,{scaleRow:t=>profileScale('pelvisCore',t,state),shade:'skin'});

  // internal shading: clavicles, bust volume, waist, navel, thigh/leg form
  pixel(b,cx-7,36,'shadow');pixel(b,cx-6,36,'shadow');pixel(b,cx+6,36,'shadow');pixel(b,cx+7,36,'shadow');
  pixel(b,cx-5,40,'shadow');pixel(b,cx-4,40,'shadow');pixel(b,cx+4,40,'shadow');pixel(b,cx+5,40,'shadow');
  for(let y=48;y<56;y++){pixel(b,cx-8,y,'shadow');pixel(b,cx+8,y,'light');}
  pixel(b,cx,53,'shadow');pixel(b,cx,54,'shadow');
  for(let y=70;y<76;y++){pixel(b,cx-3-hipShift,y,'light');pixel(b,cx+3+hipShift,y,'light');}
  for(let y=81;y<88;y++){pixel(b,cx-8-hipShift,y,'shadow');pixel(b,cx+8+hipShift,y,'shadow');}

  // simple underwear follows torso/pelvis and keeps prototype non-explicit
  stamp(b,PARTS.underwearTop,cx,38,{scaleRow:t=>profileScale('torsoUpper',t,state),shade:'cloth'});
  stamp(b,PARTS.underwearBottom,cx,59,{scaleRow:t=>profileScale('pelvisCore',t,state),shade:'cloth'});

  // face
  pixel(b,cx-4,22,'eye');pixel(b,cx-3,22,'eye');pixel(b,cx+3,22,'eye');pixel(b,cx+4,22,'eye');
  pixel(b,cx,25,'shadow');
  pixel(b,cx-2,27,'shadow');pixel(b,cx-1,27,'shadow');pixel(b,cx,27,'shadow');pixel(b,cx+1,27,'shadow');

  // hair in front, lastly
  stamp(b,PARTS.frontHair,cx,14,{shade:'hair'});
  return b;
}

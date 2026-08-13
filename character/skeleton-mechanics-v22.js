import {createSkeletonMechanicsV21} from './skeleton-mechanics-v21.js';

export const MECHANICS_VERSION='2.2.0';

export function createSkeletonMechanicsV22(api){
 const mechanics=createSkeletonMechanicsV21(api);
 const oldState=mechanics.getState.bind(mechanics);
 mechanics.getState=()=>({...oldState(),mechanicsVersion:MECHANICS_VERSION});
 mechanics.getScapulaDiagnostics=side=>{
  const scap=api.getJoint(`scapula_${side}`);
  if(!scap)throw new Error('side must be L or R');
  const d=scap.userData.lastScapulaMechanics;
  return d?{upward:d.upward,posterior:d.posterior,external:d.external,acGap:d.acGap,maxContactGap:d.maxContactGap,meanContactGap:d.meanContactGap,contactGaps:{...d.contactGaps}}:null;
 };
 mechanics.mechanicsVersion=MECHANICS_VERSION;
 return mechanics;
}

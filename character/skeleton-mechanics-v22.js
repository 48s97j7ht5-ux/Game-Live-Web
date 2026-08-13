import * as THREE from 'three';
import {createSkeletonMechanicsV21} from './skeleton-mechanics-v21.js';

export const MECHANICS_VERSION='2.2.0';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wp=o=>o?.getWorldPosition(new THREE.Vector3());

/** Mechanics v2.2
 * Multi-point scapulothoracic contact solver layered on v2.1.
 * The scapula remains a rigid plate; medial, inferior and acromial landmarks
 * are solved together against a calibrated thoracic surface.
 */
export function createSkeletonMechanicsV22(api){
  const base=createSkeletonMechanicsV21(api);
  const contact={};

  function init(side){
    if(contact[side]) return contact[side];
    const scap=api.getJoint(`scapula_${side}`);
    if(!scap) throw new Error(`v2.2 missing scapula ${side}`);
    api.jointRoot.updateMatrixWorld(true);
    const med=scap.getObjectByName(`scMed${side}`);
    const inf=scap.getObjectByName(`scInf${side}`);
    const ac=scap.getObjectByName(`scAc${side}`);
    if(!med||!inf||!ac) throw new Error(`v2.2 missing scapula landmarks ${side}`);
    const t3=wp(api.getJoint('spine_T3')),t7=wp(api.getJoint('spine_T7'));
    const centerZ=(t3.z+t7.z)*.5+.018;
    const pts=[wp(med),wp(inf),wp(ac)];
    const pivot=pts.reduce((a,p)=>a.add(p),new THREE.Vector3()).multiplyScalar(1/3);
    const rx=Math.max(.17,Math.abs(pivot.x)*1.13),rz=.135;
    const surfaceZ=x=>centerZ-rz*Math.sqrt(Math.max(.001,1-clamp(Math.abs(x)/rx,0,.985)**2));
    const rest={med:pts[0].z-surfaceZ(pts[0].x),inf:pts[1].z-surfaceZ(pts[1].x),ac:pts[2].z-surfaceZ(pts[2].x)};
    return contact[side]={scap,med,inf,ac,surfaceZ,rest};
  }

  function sample(m){
    api.jointRoot.updateMatrixWorld(true);
    const pts={med:wp(m.med),inf:wp(m.inf),ac:wp(m.ac)};
    const e={};
    for(const k of ['med','inf','ac']) e[k]=pts[k].z-m.surfaceZ(pts[k].x)-m.rest[k];
    return {pts,e};
  }

  function worldTransform(scap,pivot,rot,translation){
    const parent=scap.parent; parent.updateMatrixWorld(true);
    const worldQ=scap.getWorldQuaternion(new THREE.Quaternion());
    const worldP=scap.getWorldPosition(new THREE.Vector3());
    const q=rot||new THREE.Quaternion();
    const newQ=q.clone().multiply(worldQ);
    const newP=worldP.clone().sub(pivot).applyQuaternion(q).add(pivot).add(translation||new THREE.Vector3());
    const inv=parent.matrixWorld.clone().invert();
    const parentQ=parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    scap.position.copy(newP.applyMatrix4(inv));
    scap.quaternion.copy(parentQ.multiply(newQ));
    scap.updateMatrixWorld(true);
  }

  function constrain(side){
    const m=init(side);
    for(let i=0;i<10;i++){
      const s=sample(m), p=s.pts, e=s.e;
      const pivot=p.med.clone().add(p.inf).add(p.ac).multiplyScalar(1/3);
      // Least-squares AP translation for all three contacts.
      const mean=(e.med+e.inf+e.ac)/3;
      const dz=-clamp(mean,-.009,.009)*.82;

      // Two independent rigid plate rotations.  Y rotation corrects medial vs
      // inferior winging; X rotation corrects acromial/inferior tilt.
      const wing=e.inf-e.med;
      const tilt=e.ac-(e.med+e.inf)*.5;
      const qWing=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),clamp(wing*2.0,-.018,.018));
      const qTilt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(side==='L'?-1:1,0,0),clamp(tilt*1.15,-.012,.012));
      const q=qTilt.multiply(qWing);
      worldTransform(m.scap,pivot,q,new THREE.Vector3(0,0,dz));
    }
    return validate(side);
  }

  function validate(side){
    const m=init(side),{e}=sample(m);
    const vals=Object.values(e),max=Math.max(...vals.map(Math.abs)),penetration=Math.min(...vals);
    const rms=Math.sqrt(vals.reduce((a,v)=>a+v*v,0)/vals.length);
    const status=(max>.020||penetration<-.008)?'FAIL':(max>.012||rms>.008)?'WARN':'PASS';
    return {status,maxContactDrift:max,rmsContactDrift:rms,penetration,errors:e,thresholds:{warn:.012,fail:.020,rmsWarn:.008,maxPenetration:.008}};
  }

  const oldArm=base.setArmPose.bind(base);
  base.setArmPose=(side,v={})=>{
    const out=oldArm(side,v);
    // v2.1 already performs its correction; v2.2 then refines all three
    // contacts simultaneously instead of replacing the stable lower layer.
    const shoulderValidation=constrain(side);
    api.jointRoot.updateMatrixWorld(true);
    return {...out,shoulderValidation};
  };

  base.validateAnatomy=()=>{
    const shoulders={L:validate('L'),R:validate('R')};
    const statuses=Object.values(shoulders).map(x=>x.status);
    return {status:statuses.includes('FAIL')?'FAIL':statuses.includes('WARN')?'WARN':'PASS',shoulders};
  };
  base.mechanicsVersion=MECHANICS_VERSION;
  return base;
}

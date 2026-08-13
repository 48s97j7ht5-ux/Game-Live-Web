import * as THREE from 'three';
import {createSkeletonMechanicsV20} from './skeleton-mechanics-v20.js';

export const MECHANICS_VERSION='2.1.0';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wp=o=>o?.getWorldPosition(new THREE.Vector3());

/** Mechanics v2.1
 * Adds a rigid scapula/thorax contact correction after the existing shoulder
 * solver and exposes a numerical anatomy validator. Skeleton v1.3 is untouched.
 */
export function createSkeletonMechanicsV21(api){
  const base=createSkeletonMechanicsV20(api);
  const contact={};

  function init(side){
    if(contact[side]) return contact[side];
    const scap=api.getJoint(`scapula_${side}`),gh=api.getJoint(`shoulder_${side}`);
    if(!scap||!gh) throw new Error(`v2.1 missing scapula/shoulder ${side}`);
    api.jointRoot.updateMatrixWorld(true);
    const med=scap.getObjectByName(`scMed${side}`),inf=scap.getObjectByName(`scInf${side}`),ac=scap.getObjectByName(`scAc${side}`);
    if(!med||!inf||!ac) throw new Error(`v2.1 missing scapula landmarks ${side}`);
    const t3=wp(api.getJoint('spine_T3')),t7=wp(api.getJoint('spine_T7'));
    const centerY=(t3.y+t7.y)*.5+.015,centerZ=(t3.z+t7.z)*.5+.018;
    const pts=[wp(med),wp(inf),wp(ac)],pivot=pts.reduce((a,p)=>a.add(p),new THREE.Vector3()).multiplyScalar(1/3);
    const rx=Math.max(.17,Math.abs(pivot.x)*1.13),rz=.135;
    const surfaceZ=x=>centerZ-rz*Math.sqrt(Math.max(.001,1-clamp(Math.abs(x)/rx,0,.985)**2));
    const restOffset=(p)=>p.z-surfaceZ(p.x);
    contact[side]={scap,gh,med,inf,ac,centerY,centerZ,rx,rz,surfaceZ,rest:{med:restOffset(pts[0]),inf:restOffset(pts[1]),ac:restOffset(pts[2])}};
    return contact[side];
  }

  function signedError(m,p){return p.z-m.surfaceZ(p.x)}
  function errors(m){api.jointRoot.updateMatrixWorld(true);return {med:signedError(m,wp(m.med))-m.rest.med,inf:signedError(m,wp(m.inf))-m.rest.inf,ac:signedError(m,wp(m.ac))-m.rest.ac};}

  function rotateWorldAround(scap,pivot,axis,angle){
    if(Math.abs(angle)<1e-7)return;
    const q=new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(),angle);
    const parent=scap.parent;parent.updateMatrixWorld(true);
    const worldQ=scap.getWorldQuaternion(new THREE.Quaternion());
    const worldP=scap.getWorldPosition(new THREE.Vector3());
    const newQ=q.clone().multiply(worldQ);
    const newP=worldP.clone().sub(pivot).applyQuaternion(q).add(pivot);
    const parentInv=parent.matrixWorld.clone().invert(),parentQ=parent.getWorldQuaternion(new THREE.Quaternion());
    scap.position.copy(newP.applyMatrix4(parentInv));
    scap.quaternion.copy(parentQ.invert().multiply(newQ));
    scap.updateMatrixWorld(true);
  }

  function translateWorld(scap,v){
    const parent=scap.parent;parent.updateMatrixWorld(true);
    const w=scap.getWorldPosition(new THREE.Vector3()).add(v);
    scap.position.copy(w.applyMatrix4(parent.matrixWorld.clone().invert()));
    scap.updateMatrixWorld(true);
  }

  function constrain(side){
    const m=init(side),scap=m.scap;
    // Iterative rigid correction: keep medial border + inferior angle near their
    // calibrated rest clearance from the thoracic ellipse, while preserving the
    // scapula as one rigid plate.
    for(let i=0;i<7;i++){
      const a=wp(m.med),b=wp(m.inf),c=wp(m.ac),pivot=a.clone().add(b).add(c).multiplyScalar(1/3),e=errors(m);
      const mean=(e.med+e.inf)*.5;
      // primary contact translation along AP direction
      translateWorld(scap,new THREE.Vector3(0,0,-clamp(mean,-.010,.010)*.78));
      api.jointRoot.updateMatrixWorld(true);
      const e2=errors(m);
      // differential contact error means the plate is winging: rotate about
      // an approximately superoinferior axis through the scapular body.
      const diff=e2.inf-e2.med;
      rotateWorldAround(scap,pivot,new THREE.Vector3(0,1,0),clamp(diff*2.4,-.020,.020));
      api.jointRoot.updateMatrixWorld(true);
      const e3=errors(m);
      // keep acromial side from peeling off while allowing physiological tilt.
      if(Math.abs(e3.ac)>.018){
        const axis=new THREE.Vector3(side==='L'?-1:1,0,0);
        rotateWorldAround(scap,pivot,axis,clamp(e3.ac*1.25,-.012,.012));
      }
      api.jointRoot.updateMatrixWorld(true);
    }
    return validateShoulder(side);
  }

  function validateShoulder(side){
    const m=init(side),e=errors(m),abs=[Math.abs(e.med),Math.abs(e.inf),Math.abs(e.ac)];
    const max=Math.max(...abs),penetration=Math.min(e.med,e.inf,e.ac);
    // 12 mm relative drift is WARN, 20 mm or >8 mm penetration is FAIL.
    const status=(max>.020||penetration<-.008)?'FAIL':max>.012?'WARN':'PASS';
    return {status,maxContactDrift:max,penetration,errors:e,thresholds:{warn:.012,fail:.020,maxPenetration:.008}};
  }

  const oldArm=base.setArmPose.bind(base);
  base.setArmPose=(side,v={})=>{
    const out=oldArm(side,v);
    const shoulderValidation=constrain(side);
    api.jointRoot.updateMatrixWorld(true);
    return {...out,shoulderValidation};
  };

  const oldReset=base.reset.bind(base);
  base.reset=()=>{oldReset();api.jointRoot.updateMatrixWorld(true)};

  base.validateAnatomy=()=>{
    const shoulders={L:validateShoulder('L'),R:validateShoulder('R')};
    const statuses=Object.values(shoulders).map(x=>x.status);
    return {status:statuses.includes('FAIL')?'FAIL':statuses.includes('WARN')?'WARN':'PASS',shoulders};
  };
  base.mechanicsVersion=MECHANICS_VERSION;
  return base;
}

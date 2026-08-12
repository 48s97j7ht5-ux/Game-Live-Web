import * as THREE from 'three';
import { scaledAnthropometry } from './anthropometry-v01.js';

// Build v1.2 strictly on top of v1.1: feet and the rest of the frozen rig remain unchanged.
let capturedScene=null;
const originalSceneAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){if(!capturedScene) capturedScene=this;return originalSceneAdd.apply(this,objects);};
await import('./skeleton-v11.js?v=20260812-1500');
THREE.Scene.prototype.add=originalSceneAdd;
const scene=capturedScene;
if(!scene) throw new Error('Skeleton v1.2: base scene not captured');
const root=scene.children.find(o=>o.isGroup&&o.children.length>40);
if(!root) throw new Error('Skeleton v1.2: rig root not found');
root.name='rig_root';
root.userData.rigVersion='1.2';

const A=scaledAnthropometry(1.75);
const boneMat=new THREE.MeshStandardMaterial({color:0xd7dbe7});
const frameMat=new THREE.MeshStandardMaterial({color:0x8a95ae});
const endMat=new THREE.MeshStandardMaterial({color:0x7cc7ff});
const handGroup=new THREE.Group();handGroup.name='hands_v12';root.add(handGroup);
function n(x,y,z,r=.005,mat=frameMat,name=''){const m=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),mat);m.position.set(x,y,z);if(name)m.name=name;handGroup.add(m);return m;}
function b(a,c,r=.0035,mat=boneMat,name=''){const v=c.position.clone().sub(a.position);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,8),mat);m.position.copy(a.position).add(c.position).multiplyScalar(.5);m.scale.set(1,v.length(),1);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());if(name)m.name=name;handGroup.add(m);return m;}

// Reconstruct the exact landmark targets used by the frozen v1.0 rig.
const ankle=A.ankleJointHeight;
const knee=ankle+A.tibia;
const hip=knee+A.femur;
const s1=hip+.125,l1=s1+.18,t12=l1+.022,t1=t12+.30;
const t3Index=9;
const t3T=(t3Index+1)/12;
const t3Y=t12+(t1-t12)*t3T;
const shoulderY=t3Y+.01;
const elbowY=shoulderY-A.humerus;
const expectedWristY=elbowY-A.radius;
const expectedWristAbsX=A.shoulderJointHalfWidth+.035;
const expectedWristZ=.010;

const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o)});
function nearestSphere(target, predicate=()=>true){
  return meshes
    .filter(o=>o.geometry?.type==='SphereGeometry'&&predicate(o))
    .sort((a,b)=>a.position.distanceToSquared(target)-b.position.distanceToSquared(target))[0]||null;
}
function tag(obj,name,role='joint'){
  if(!obj)return null;
  obj.name=name;
  obj.userData.rigRole=role;
  return obj;
}

// Stable semantic names for the major mechanical landmarks. These names are the public
// contract for future mechanics modules; mechanics must not rediscover joints by coordinates.
const rig={};
rig.pelvis=tag(nearestSphere(new THREE.Vector3(0,hip+.05,0),o=>Math.abs(o.position.x)<.06&&o.position.y>hip-.05&&o.position.y<hip+.25),'pelvis_center','landmark');
rig.spine_s1=tag(nearestSphere(new THREE.Vector3(0,s1,0),o=>Math.abs(o.position.x)<.035&&o.position.y>s1-.08&&o.position.y<s1+.08),'spine_S1','vertebra');
rig.spine_l1=tag(nearestSphere(new THREE.Vector3(0,l1,0),o=>Math.abs(o.position.x)<.035&&o.position.y>l1-.08&&o.position.y<l1+.08),'spine_L1','vertebra');
rig.spine_t12=tag(nearestSphere(new THREE.Vector3(0,t12,0),o=>Math.abs(o.position.x)<.035&&o.position.y>t12-.06&&o.position.y<t12+.06),'spine_T12','vertebra');
rig.spine_t1=tag(nearestSphere(new THREE.Vector3(0,t1,0),o=>Math.abs(o.position.x)<.035&&o.position.y>t1-.06&&o.position.y<t1+.06),'spine_T1','vertebra');

for(const side of [-1,1]){
  const suffix=side<0?'L':'R';
  const sx=side*A.shoulderJointHalfWidth;
  const ex=side*(A.shoulderJointHalfWidth+.025);
  const wx=side*expectedWristAbsX;
  const hx=side*A.hipCenterHalfWidth;
  const kx=side*A.hipCenterHalfWidth*.72;
  const ax=side*A.hipCenterHalfWidth*.86;

  rig[`shoulder_${suffix}`]=tag(nearestSphere(new THREE.Vector3(sx,shoulderY,0),o=>Math.sign(o.position.x)===side&&o.position.y>shoulderY-.10&&o.position.y<shoulderY+.10),`shoulder_${suffix}`);
  rig[`elbow_${suffix}`]=tag(nearestSphere(new THREE.Vector3(ex,elbowY,.005),o=>Math.sign(o.position.x)===side&&o.position.y>elbowY-.10&&o.position.y<elbowY+.10),`elbow_${suffix}`);
  rig[`wrist_${suffix}`]=tag(nearestSphere(new THREE.Vector3(wx,expectedWristY,expectedWristZ),o=>Math.sign(o.position.x)===side&&o.position.y>.75&&o.position.y<1.05),`wrist_${suffix}`);
  rig[`hip_${suffix}`]=tag(nearestSphere(new THREE.Vector3(hx,hip,A.hipCenterDepth),o=>Math.sign(o.position.x)===side&&o.position.y>hip-.10&&o.position.y<hip+.10),`hip_${suffix}`);
  rig[`knee_${suffix}`]=tag(nearestSphere(new THREE.Vector3(kx,knee,0),o=>Math.sign(o.position.x)===side&&o.position.y>knee-.10&&o.position.y<knee+.10),`knee_${suffix}`);
  rig[`ankle_${suffix}`]=tag(nearestSphere(new THREE.Vector3(ax,ankle,0),o=>Math.sign(o.position.x)===side&&o.position.y>ankle-.06&&o.position.y<ankle+.10),`ankle_${suffix}`);
}

// Build anatomical hands from the named distal wrists.
for(const side of [-1,1]){
  const suffix=side<0?'L':'R';
  const wrist=rig[`wrist_${suffix}`];
  if(!wrist)continue;
  const wx=wrist.position.x,wy=wrist.position.y,wz=wrist.position.z;

  // Hide only the old simplified hand below the true distal wrist. Preserve radius/ulna.
  root.traverse(o=>{if(!o.isMesh||o===wrist)return;if(Math.sign(o.position.x)!==side)return;
    if(o.position.y<wy-.012&&o.position.y>wy-.24&&Math.abs(o.position.x-wx)<.09)o.visible=false;
  });

  const rowY=[wy-.018,wy-.040];
  const lateral=[.018,.006,-.007,-.019];
  const carpalProxNames=['scaphoid','lunate','triquetrum','pisiform'];
  const carpalDistNames=['trapezium','trapezoid','capitate','hamate'];
  const prox=[],dist=[];
  for(let i=0;i<4;i++){const z=wz+(i===0?.006:i===3?-.005:0);prox.push(n(wx+side*lateral[i],rowY[0],z,.0055,frameMat,`${carpalProxNames[i]}_${suffix}`));}
  for(let i=0;i<4;i++){const arch=Math.abs(i-1.5)*.004;dist.push(n(wx+side*lateral[i]*1.08,rowY[1],wz+arch,.0055,frameMat,`${carpalDistNames[i]}_${suffix}`));}
  for(let i=0;i<3;i++)b(prox[i],prox[i+1],.0028,frameMat);
  for(let i=0;i<3;i++)b(dist[i],dist[i+1],.0028,frameMat);
  b(wrist,prox[1],.0033,frameMat,`wrist_to_carpus_a_${suffix}`);b(wrist,prox[2],.0033,frameMat,`wrist_to_carpus_b_${suffix}`);
  b(prox[0],dist[0],.0027,frameMat);b(prox[1],dist[1],.0027,frameMat);b(prox[2],dist[2],.0027,frameMat);b(prox[3],dist[3],.0027,frameMat);

  const mcX=[.030,.018,.004,-.011,-.026];
  const mcLen=[.064,.086,.091,.085,.076];
  const digitNames=['thumb','index','middle','ring','little'];
  const heads=[];
  for(let i=0;i<5;i++){
    const base=dist[Math.min(i,3)];
    const hx2=wx+side*mcX[i];
    const hy=rowY[1]-mcLen[i];
    const hz=wz+(i===0?.020:Math.abs(i-2)*.003);
    const head=n(hx2,hy,hz,i===0?.0065:.0058,frameMat,`metacarpal_head_${digitNames[i]}_${suffix}`);
    b(base,head,i===0?.0048:.0042,boneMat,`metacarpal_${digitNames[i]}_${suffix}`);heads.push(head);
  }

  let p=heads[0];
  const th1=n(p.position.x+side*.022,p.position.y-.031,p.position.z+.012,.0055,frameMat,`thumb_IP_${suffix}`);b(p,th1,.0042,boneMat,`thumb_proximal_${suffix}`);
  const th2=n(th1.position.x+side*.014,th1.position.y-.026,th1.position.z+.006,.005,endMat,`thumb_tip_${suffix}`);b(th1,th2,.0038,boneMat,`thumb_distal_${suffix}`);

  const segs=[[.043,.026,.021],[.048,.030,.023],[.044,.028,.022],[.036,.023,.019]];
  const phalanxNames=['proximal','middle','distal'];
  for(let f=1;f<5;f++){
    let q=heads[f];
    const outward=(2.2-f)*.003*side;
    for(let j=0;j<3;j++){
      const nodeName=j===2?`${digitNames[f]}_tip_${suffix}`:`${digitNames[f]}_${j===0?'PIP':'DIP'}_${suffix}`;
      const tip=n(q.position.x+outward,q.position.y-segs[f-1][j],q.position.z+(j===2?.002:0),j===2?.0045:.005,j===2?endMat:frameMat,nodeName);
      b(q,tip,j===0?.0038:.0033,boneMat,`${digitNames[f]}_${phalanxNames[j]}_${suffix}`);q=tip;
    }
  }
}

// Publish a lightweight index for diagnostics/consumers. Object names remain the source of truth.
const rigIndex={};
root.traverse(o=>{if(o.name)rigIndex[o.name]=o.uuid;});
root.userData.rigIndex=rigIndex;
scene.userData.rigRootName='rig_root';
scene.userData.rigVersion='1.2';

const title=document.querySelector('.info .title');if(title)title.textContent='Skeleton v1.2';
const sub=document.querySelector('.info .sub');if(sub)sub.innerHTML='anatomical hands · named rig landmarks<br>рост 1750 мм · сетка 100 мм';
const metrics=document.getElementById('metrics');if(metrics){metrics.innerHTML=metrics.innerHTML.replace('Диагностика v1.1','Диагностика v1.2').replace('v1.1 · anatomical feet','v1.2 · anatomical hands + feet');metrics.insertAdjacentHTML('beforeend','<div class="row"><span>Rig</span><span>named joints + hand bones</span></div><div class="row"><span>API</span><span>getObjectByName / rigIndex</span></div>');}

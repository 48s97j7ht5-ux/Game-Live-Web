import * as THREE from 'three';
import { scaledAnthropometry } from './anthropometry-v01.js';

// Capture the scene created by the frozen v1.0 module without modifying v1.0.
let capturedScene=null;
const originalSceneAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){ if(!capturedScene) capturedScene=this; return originalSceneAdd.apply(this,objects); };
await import('./skeleton-v10.js?v=20260812-1422');
THREE.Scene.prototype.add=originalSceneAdd;

const scene=capturedScene;
const A=scaledAnthropometry(1.75);
if(!scene) throw new Error('Skeleton v1.1: base scene not captured');

// Root is the large Group containing the anatomical rig.
const root=scene.children.find(o=>o.isGroup && o.children.length>40);
if(!root) throw new Error('Skeleton v1.1: rig root not found');

// v1.0 represented each foot as a heel-mid-toe polyline. Hide only those old
// low foot cylinders/end markers; ankle and malleoli remain untouched.
root.traverse(o=>{
  if(!o.isMesh) return;
  const y=o.position.y;
  if(y<0.075 && o.geometry?.type==='CylinderGeometry') o.visible=false;
  if(y<0.075 && o.geometry?.type==='SphereGeometry' && o.position.z>-0.10) o.visible=false;
});

const boneMat=new THREE.MeshStandardMaterial({color:0xd7dbe7});
const frameMat=new THREE.MeshStandardMaterial({color:0x8a95ae});
const jointMat=new THREE.MeshStandardMaterial({color:0xf0a65b});
const endMat=new THREE.MeshStandardMaterial({color:0x7cc7ff});
const footGroup=new THREE.Group(); footGroup.name='feet-v11-anatomical'; root.add(footGroup);

function n(x,y,z,r=.010,mat=frameMat){const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,9),mat);m.position.set(x,y,z);footGroup.add(m);return m;}
function b(a,c,r=.007,mat=boneMat){const v=c.position.clone().sub(a.position);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,9),mat);m.position.copy(a.position).add(c.position).multiplyScalar(.5);m.scale.set(1,v.length(),1);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());footGroup.add(m);return m;}

const ankle=A.ankleJointHeight, hx=A.hipCenterHalfWidth, L=A.foot;
for(const side of [-1,1]){
  const x=side*hx*.86;
  // Hindfoot: talus receives tibial load; calcaneus sits inferior/posterior.
  const talus=n(x,ankle-.018,-.040,.015,jointMat);
  const calc=n(x,0.050,-L*.205,.017,frameMat);
  const heel=n(x,0.025,-L*.255,.013,endMat);
  b(talus,calc,.010); b(calc,heel,.011);

  // Midfoot: navicular/cuneiform chain medially and cuboid chain laterally.
  const nav=n(x-side*.010,0.060,L*.055,.010,frameMat);
  const cun=n(x-side*.014,0.052,L*.205,.010,frameMat);
  const cub=n(x+side*.020,0.038,L*.175,.010,frameMat);
  b(talus,nav,.008); b(calc,cub,.008); b(nav,cun,.007); b(calc,nav,.006,frameMat);

  // Five metatarsal rays. The first ray is shorter/thicker; lateral rays form
  // the flatter lateral arch. Front of foot fans slightly instead of staying a line.
  const rayOffsets=[-0.030,-0.015,0,0.016,0.031].map(v=>v*side);
  const starts=[cun,cun,cun,cub,cub];
  const lengths=[.55,.62,.64,.61,.57];
  for(let i=0;i<5;i++){
    const base=n(x+rayOffsets[i]*.55, i<3?0.047:0.035, L*.245,.007,frameMat);
    const head=n(x+rayOffsets[i], i===0?0.032:0.025, L*lengths[i], i===0?.009:.007,frameMat);
    b(starts[i],base,.006,frameMat); b(base,head,i===0?.008:.006);
    // Toes: hallux has two phalanges, lesser toes are represented by two
    // articulated segments sufficient for the rig silhouette.
    const toe1=n(x+rayOffsets[i]*1.05,0.020,L*(lengths[i]+.105),.006,frameMat);
    const tip=n(x+rayOffsets[i]*1.08,0.016,L*(lengths[i]+(i===0?.205:.175)),.006,endMat);
    b(head,toe1,i===0?.007:.0055); b(toe1,tip,i===0?.0065:.0048);
  }
}

// Update visible version text/diagnostics while retaining v1.0 controls/UI.
const title=document.querySelector('.info .title'); if(title) title.textContent='Skeleton v1.1';
const sub=document.querySelector('.info .sub'); if(sub) sub.innerHTML='anatomical feet · hind/mid/forefoot<br>рост 1750 мм · сетка 100 мм';
const metrics=document.getElementById('metrics');
if(metrics){metrics.innerHTML=metrics.innerHTML.replace('Диагностика v1.0','Диагностика v1.1').replace('FROZEN v1 baseline','v1.1 · anatomical feet').replace('</div>`','</div>');metrics.insertAdjacentHTML('beforeend','<div class="row"><span>Foot</span><span>talus / calcaneus / midfoot / 5 rays</span></div><div class="row"><span>Arches</span><span>medial / lateral / transverse</span></div>');}

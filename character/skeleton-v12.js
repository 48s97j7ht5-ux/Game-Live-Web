import * as THREE from 'three';

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

const boneMat=new THREE.MeshStandardMaterial({color:0xd7dbe7});
const frameMat=new THREE.MeshStandardMaterial({color:0x8a95ae});
const endMat=new THREE.MeshStandardMaterial({color:0x7cc7ff});
const handGroup=new THREE.Group();handGroup.name='hands-v12-anatomical';root.add(handGroup);
function n(x,y,z,r=.005,mat=frameMat){const m=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),mat);m.position.set(x,y,z);handGroup.add(m);return m;}
function b(a,c,r=.0035,mat=boneMat){const v=c.position.clone().sub(a.position);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,8),mat);m.position.copy(a.position).add(c.position).multiplyScalar(.5);m.scale.set(1,v.length(),1);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());handGroup.add(m);return m;}

// Locate the existing v1.0/v1.1 wrist and hand-tip markers geometrically. Old hand sticks are hidden only below each wrist.
const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o)});
for(const side of [-1,1]){
  const candidates=meshes.filter(o=>o.geometry?.type==='SphereGeometry'&&Math.sign(o.position.x)===side&&o.position.y>.45&&o.position.y<1.25);
  const wrist=candidates.sort((a,b)=>Math.abs(Math.abs(a.position.x)-.20)-Math.abs(Math.abs(b.position.x)-.20))[0];
  if(!wrist) continue;
  const wx=wrist.position.x, wy=wrist.position.y, wz=wrist.position.z;
  root.traverse(o=>{if(!o.isMesh||o===wrist)return;if(Math.sign(o.position.x)!==side)return;if(o.position.y<wy-.012&&o.position.y>wy-.24&&Math.abs(o.position.x-wx)<.09)o.visible=false;});

  // Eight carpals in two compact rows. Proximal: scaphoid/lunate/triquetrum/pisiform.
  // Distal: trapezium/trapezoid/capitate/hamate. The palm is not a flat fan: it has a shallow transverse arch.
  const rowY=[wy-.018,wy-.040];
  const lateral=[-.018,-.006,.007,.019];
  const prox=[],dist=[];
  for(let i=0;i<4;i++){const z=wz+(i===0?.006:i===3?-.005:0);prox.push(n(wx+side*lateral[i],rowY[0],z,.0055));}
  for(let i=0;i<4;i++){const arch=Math.abs(i-1.5)*.004;dist.push(n(wx+side*lateral[i]*1.08,rowY[1],wz+arch,.0055));}
  for(let i=0;i<3;i++)b(prox[i],prox[i+1],.0028,frameMat);
  for(let i=0;i<3;i++)b(dist[i],dist[i+1],.0028,frameMat);
  b(prox[0],dist[0],.0027,frameMat);b(prox[1],dist[1],.0027,frameMat);b(prox[2],dist[2],.0027,frameMat);b(prox[3],dist[3],.0027,frameMat);

  // Five metacarpals. III is longest/central; II and IV slightly shorter, V shorter. I diverges for the thumb.
  const mcX=[-.030,-.018,-.004,.011,.026];
  const mcLen=[.064,.086,.091,.085,.076];
  const heads=[];
  for(let i=0;i<5;i++){
    const base=dist[Math.min(i,3)];
    const hx=wx+side*mcX[i];
    const hy=rowY[1]-mcLen[i];
    const hz=wz+(i===0?.020:Math.abs(i-2)*.003);
    const head=n(hx,hy,hz,i===0?.0065:.0058);
    b(base,head,i===0?.0048:.0042);heads.push(head);
  }

  // Thumb: two phalanges, oblique and anterior to the palm to preserve opposition geometry.
  let p=heads[0];
  const th1=n(p.position.x+side*.022,p.position.y-.031,p.position.z+.012,.0055);b(p,th1,.0042);
  const th2=n(th1.position.x+side*.014,th1.position.y-.026,th1.position.z+.006,.005,endMat);b(th1,th2,.0038);

  // Digits II–V: proximal, middle, distal phalanges. Natural cascade toward the little finger.
  const segs=[[.043,.026,.021],[.048,.030,.023],[.044,.028,.022],[.036,.023,.019]];
  for(let f=1;f<5;f++){
    let q=heads[f];
    const outward=(f-2.2)*.003*side;
    for(let j=0;j<3;j++){
      const tip=n(q.position.x+outward,q.position.y-segs[f-1][j],q.position.z+(j===2?.002:0),j===2?.0045:.005,j===2?endMat:frameMat);
      b(q,tip,j===0?.0038:.0033);q=tip;
    }
  }
}

const title=document.querySelector('.info .title');if(title)title.textContent='Skeleton v1.2';
const sub=document.querySelector('.info .sub');if(sub)sub.innerHTML='anatomical hands · carpus/metacarpus/digits<br>рост 1750 мм · сетка 100 мм';
const metrics=document.getElementById('metrics');if(metrics){metrics.innerHTML=metrics.innerHTML.replace('Диагностика v1.1','Диагностика v1.2').replace('v1.1 · anatomical feet','v1.2 · anatomical hands + feet');metrics.insertAdjacentHTML('beforeend','<div class="row"><span>Hand</span><span>8 carpals / 5 metacarpals / 14 phalanges</span></div><div class="row"><span>Thumb</span><span>CMC divergence + 2 phalanges</span></div>');}

import * as THREE from 'three';

// Browser port of the MPFB/MakeHuman pieces we actually need for static sprite generation.
// Sources mirrored by implementation:
// - MPFB Rig entity: position strategies CUBE/VERTEX/MEAN/XYZ
// - MPFB RigService: pose dictionaries / local bone rotations
// - MPFB ClothesService: MHCLO fitting and transfer of basemesh deformation data
// - Blender vec_roll_to_mat3_normalized: bone +Y orientation and roll

const MH_TO_BLENDER_SCALE = 0.1;

export function objToRigXYZ(x,y,z){return new THREE.Vector3(x*MH_TO_BLENDER_SCALE,-z*MH_TO_BLENDER_SCALE,y*MH_TO_BLENDER_SCALE)}
export function rigToObjXYZ(v){return new THREE.Vector3(v.x/MH_TO_BLENDER_SCALE,v.z/MH_TO_BLENDER_SCALE,-v.y/MH_TO_BLENDER_SCALE)}

export function parseBaseOBJ(text){
  const verts=[]; const bodyFaces=[]; const groups=new Map(); let active=[];
  const addGroupVert=(name,i)=>{if(!groups.has(name))groups.set(name,new Set());groups.get(name).add(i)};
  for(const raw of text.split(/\r?\n/)){
    const s=raw.trim(); if(!s||s[0]==='#')continue;
    if(s.startsWith('v ')){const p=s.split(/\s+/);verts.push(+p[1],+p[2],+p[3]);continue}
    if(s.startsWith('g ')){active=s.slice(2).trim().split(/\s+/).filter(Boolean);continue}
    if(s.startsWith('f ')){
      const q=s.slice(2).trim().split(/\s+/).map(x=>parseInt(x.split('/')[0],10)-1);
      for(const g of active)for(const i of q)addGroupVert(g,i);
      if(active.includes('body'))for(let i=1;i<q.length-1;i++)bodyFaces.push(q[0],q[i],q[i+1]);
    }
  }
  return {vertices:new Float32Array(verts),bodyFaces,groups};
}

export function parseOBJ(text){
  const verts=[],faces=[];
  for(const raw of text.split(/\r?\n/)){
    const s=raw.trim(); if(!s||s[0]==='#')continue;
    const p=s.split(/\s+/);
    if(p[0]==='v')verts.push([+p[1],+p[2],+p[3]]);
    else if(p[0]==='f'){
      const q=p.slice(1).map(x=>parseInt(x.split('/')[0],10)-1);
      for(let i=1;i<q.length-1;i++)faces.push([q[0],q[i],q[i+1]]);
    }
  }
  return {verts,faces};
}

export function parseMHCLO(text){
  const out={verts:[],x:null,y:null,z:null,deleteVerts:new Set(),objFile:null,material:null}; let mode='head';
  const toks=text.split(/\r?\n/);
  for(const raw of toks){
    const s=raw.trim(); if(!s||s[0]==='#')continue; const p=s.split(/\s+/);
    if(p[0]==='obj_file'){out.objFile=p.slice(1).join(' ');continue}
    if(p[0]==='material'){out.material=p.slice(1).join(' ');continue}
    if(p[0]==='x_scale'){out.x=[+p[1],+p[2],+p[3]];continue}
    if(p[0]==='y_scale'){out.y=[+p[1],+p[2],+p[3]];continue}
    if(p[0]==='z_scale'){out.z=[+p[1],+p[2],+p[3]];continue}
    if(p[0]==='verts'){mode='verts';continue}
    if(p[0]==='delete_verts'){mode='delete';continue}
    if(mode==='verts'&&/^\d+$/.test(p[0])){
      if(p.length===1)out.verts.push({i:[+p[0],+p[0],+p[0]],w:[1,0,0],o:[0,0,0]});
      else if(p.length>=9)out.verts.push({i:[+p[0],+p[1],+p[2]],w:[+p[3],+p[4],+p[5]],o:[+p[6],+p[7],+p[8]]});
      continue;
    }
    if(mode==='delete'){
      const nums=s.replace(/-/g,' - ').split(/\s+/); for(let k=0;k<nums.length;k++){
        if(/^\d+$/.test(nums[k])){
          const a=+nums[k]; if(nums[k+1]==='-'&&/^\d+$/.test(nums[k+2]||'')){const b=+nums[k+2];for(let n=a;n<=b;n++)out.deleteVerts.add(n);k+=2}else out.deleteVerts.add(a);
        }
      }
    }
  }
  return out;
}

function vAtObj(vertices,i){const k=i*3;return new THREE.Vector3(vertices[k],vertices[k+1],vertices[k+2])}
function vAtRig(vertices,i){const k=i*3;return objToRigXYZ(vertices[k],vertices[k+1],vertices[k+2])}

function strategyPosition(info,mesh,relativeScale=1){
  let p=null;
  if(info.strategy==='VERTEX'&&info.vertex_index<mesh.vertices.length/3)p=vAtRig(mesh.vertices,info.vertex_index);
  else if(info.strategy==='MEAN'&&Array.isArray(info.vertex_indices)&&info.vertex_indices.length){p=new THREE.Vector3();let n=0;for(const i of info.vertex_indices){if(i<mesh.vertices.length/3){p.add(vAtRig(mesh.vertices,i));n++}}if(n)p.multiplyScalar(1/n);else p=null}
  else if(info.strategy==='XYZ'&&Array.isArray(info.vertex_indices)&&info.vertex_indices.length>=3){const a=vAtRig(mesh.vertices,info.vertex_indices[0]),b=vAtRig(mesh.vertices,info.vertex_indices[1]),c=vAtRig(mesh.vertices,info.vertex_indices[2]);p=new THREE.Vector3(a.x,b.y,c.z)}
  else if(info.strategy==='CUBE'&&info.cube_name&&mesh.groups.has(info.cube_name)){
    const set=mesh.groups.get(info.cube_name);p=new THREE.Vector3();let n=0;for(const i of set){p.add(vAtRig(mesh.vertices,i));n++}if(n)p.multiplyScalar(1/n);else p=null;
  }
  if(!p&&Array.isArray(info.default_position))p=new THREE.Vector3(...info.default_position);
  if(p&&Array.isArray(info.offset))p.add(new THREE.Vector3(...info.offset).multiplyScalar(relativeScale));
  return p;
}

// Exact structure of Blender's vec_roll_to_mat3_normalized, ported to THREE.Matrix4.
function boneBasisFromVectorRoll(vec,roll){
  const n=vec.clone().normalize(),x=n.x,y=n.y,z=n.z;
  const SAFE=6.1e-3,CRIT=2.5e-4,TH2=CRIT*CRIT; let theta=1+y,alt=x*x+z*z;
  // Blender's 3x3 is column-major semantically; create explicit basis matrix here.
  let b00,b01,b02,b10,b11,b12,b20,b21,b22;
  if(theta>SAFE||alt>TH2){
    if(theta<=SAFE)theta=alt*.5+alt*alt*.125;
    b00=1-x*x/theta; b01=x; b02=-x*z/theta;
    b10=-x; b11=y; b12=-z;
    b20=-x*z/theta; b21=z; b22=1-z*z/theta;
  }else{b00=-1;b01=0;b02=0;b10=0;b11=-1;b12=0;b20=0;b21=0;b22=1}
  const base=new THREE.Matrix4().set(b00,b01,b02,0,b10,b11,b12,0,b20,b21,b22,0,0,0,0,1);
  const rq=new THREE.Quaternion().setFromAxisAngle(n,roll||0),r=new THREE.Matrix4().makeRotationFromQuaternion(rq);
  return r.multiply(base);
}

export function buildRig(rigJson,mesh){
  const defs=rigJson.bones||rigJson; const bones={};
  for(const [name,d] of Object.entries(defs)){
    const head=strategyPosition(d.head,mesh),tail=strategyPosition(d.tail,mesh); if(!head||!tail)continue;
    const orient=boneBasisFromVectorRoll(tail.clone().sub(head),d.roll||0); orient.setPosition(head);
    bones[name]={name,def:d,head,tail,restWorld:orient,restLocal:null};
  }
  for(const b of Object.values(bones)){
    const parent=b.def.parent&&bones[b.def.parent];
    b.restLocal=parent?parent.restWorld.clone().invert().multiply(b.restWorld):b.restWorld.clone();
  }
  return bones;
}

function poseQuaternion(name,bone,pose){
  const a=pose?.bone_rotations?.[name]; if(!a)return new THREE.Quaternion();
  let mode=pose?.bone_rotation_modes?.[name]||bone.def.rotation_mode||(a.length===4?'QUATERNION':'XYZ');
  if(mode==='QUATERNION')return new THREE.Quaternion(a[1],a[2],a[3],a[0]).normalize();
  if(mode==='AXIS_ANGLE'){const axis=new THREE.Vector3(a[1],a[2],a[3]);if(axis.lengthSq()<1e-12)return new THREE.Quaternion();return new THREE.Quaternion().setFromAxisAngle(axis.normalize(),a[0])}
  if(!['XYZ','XZY','YXZ','YZX','ZXY','ZYX'].includes(mode))mode='XYZ';
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(a[0],a[1],a[2],mode));
}

export function buildSkinMatrices(bones,pose=null){
  const posedWorld={},skin={}; const pending=new Set(Object.keys(bones)); let guard=0;
  while(pending.size&&guard++<pending.size*10+100){
    let changed=false;
    for(const name of [...pending]){
      const b=bones[name],parentName=b.def.parent||'',parent=parentName?bones[parentName]:null;if(parent&&pending.has(parentName))continue;
      const tr=pose?.bone_translations?.[name]||[0,0,0],q=poseQuaternion(name,b,pose),delta=new THREE.Matrix4().compose(new THREE.Vector3(...tr),q,new THREE.Vector3(1,1,1));
      const local=b.restLocal.clone().multiply(delta); posedWorld[name]=parent?posedWorld[parentName].clone().multiply(local):local;
      skin[name]=posedWorld[name].clone().multiply(b.restWorld.clone().invert()); pending.delete(name);changed=true;
    }
    if(!changed)break;
  }
  return skin;
}

export function buildVertexInfluences(weightsJson,vertexCount){
  const out=Array.from({length:vertexCount},()=>[]),src=weightsJson.weights||weightsJson;
  for(const [bone,pairs] of Object.entries(src))for(const p of pairs){const i=p[0],w=p[1];if(i>=0&&i<vertexCount&&w>0)out[i].push([bone,w])}
  return out;
}

export function skinVertices(restObjVertices,influences,skinMatrices){
  const out=new Float32Array(restObjVertices.length),v=new THREE.Vector3(),sum;
  for(let i=0;i<restObjVertices.length/3;i++){
    const k=i*3,inf=influences[i];if(!inf||!inf.length){out[k]=restObjVertices[k];out[k+1]=restObjVertices[k+1];out[k+2]=restObjVertices[k+2];continue}
    const src=objToRigXYZ(restObjVertices[k],restObjVertices[k+1],restObjVertices[k+2]),acc=new THREE.Vector3();sum={v:0};
    for(const [bone,w] of inf){const m=skinMatrices[bone];if(!m)continue;v.copy(src).applyMatrix4(m);acc.addScaledVector(v,w);sum.v+=w}
    if(sum.v>1e-8)acc.multiplyScalar(1/sum.v);else acc.copy(src);const o=rigToObjXYZ(acc);out[k]=o.x;out[k+1]=o.y;out[k+2]=o.z;
  }
  return out;
}

function scaleFromMhclo(r,axis,base){if(!r)return 1;const a=vAtObj(base,r[0]),b=vAtObj(base,r[1]);return Math.abs((b.getComponent(axis)-a.getComponent(axis))/r[2])}
export function fitMHCLO(meta,baseObjVertices){
  // MHCLO offsets are MakeHuman coordinates. MPFB swaps Y/Z only after Blender import;
  // in browser we remain in the original OBJ coordinate system, so no swap is needed here.
  const S=[scaleFromMhclo(meta.x,0,baseObjVertices),scaleFromMhclo(meta.y,1,baseObjVertices),scaleFromMhclo(meta.z,2,baseObjVertices)],out=new Float32Array(meta.verts.length*3);
  for(let n=0;n<meta.verts.length;n++){
    const q=meta.verts[n],p=new THREE.Vector3();for(let j=0;j<3;j++){const i=q.i[j],w=q.w[j],k=i*3;if(k+2<baseObjVertices.length)p.addScaledVector(new THREE.Vector3(baseObjVertices[k],baseObjVertices[k+1],baseObjVertices[k+2]),w)}
    p.x+=q.o[0]*S[0];p.y+=q.o[1]*S[1];p.z+=q.o[2]*S[2];const k=n*3;out[k]=p.x;out[k+1]=p.y;out[k+2]=p.z;
  }
  return out;
}

export function transferInfluencesToMHCLO(meta,baseInfluences){
  const out=Array.from({length:meta.verts.length},()=>[]);
  for(let n=0;n<meta.verts.length;n++){
    const q=meta.verts[n],acc=new Map();
    for(let j=0;j<3;j++)for(const [bone,bw] of (baseInfluences[q.i[j]]||[]))acc.set(bone,(acc.get(bone)||0)+bw*q.w[j]);
    let total=0;for(const w of acc.values())total+=w;if(total>1e-8)out[n]=[...acc.entries()].filter(x=>x[1]>1e-6).map(([b,w])=>[b,w/total]);
  }
  return out;
}

export function expandIndexedCloth(objData,vertexArray){
  const pos=[];for(const tri of objData.faces)for(const i of tri){const k=i*3;if(k+2<vertexArray.length)pos.push(vertexArray[k],vertexArray[k+1],vertexArray[k+2])}return new Float32Array(pos);
}

export function expandIndexedInfluences(objData,vertexInfluences){
  const out=[];for(const tri of objData.faces)for(const i of tri)out.push(vertexInfluences[i]||[]);return out;
}

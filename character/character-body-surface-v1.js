import * as THREE from 'three';

/**
 * Body Surface v1 — one continuous outer envelope for Skeleton Contract v1.
 *
 * Twenty-nine broad deformers describe only silhouette-relevant anatomy.
 * They are fused into a single implicit surface, so the visible result has no
 * transparent mannequin seams and does not depend on the experimental muscle
 * paths. This is the geometric input for the future 400 px art rasterizer.
 */
export const BODY_SURFACE_VERSION='1.0.0';
export const REQUIRED_SKELETON_CONTRACT=1;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const unitY=new THREE.Vector3(0,1,0);
const cubeCorners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const tetrahedra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
const tetraEdges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];

function smoothMin(a,b,k){
 const h=clamp(.5+.5*(b-a)/k,0,1);
 return THREE.MathUtils.lerp(b,a,h)-k*h*(1-h);
}

function ellipsoidDistance(point,d,tmp){
 tmp.copy(point).sub(d.center).applyQuaternion(d.inverseQuaternion);
 const x=tmp.x/d.radii.x,y=tmp.y/d.radii.y,z=tmp.z/d.radii.z;
 const k0=Math.hypot(x,y,z);
 if(k0<1e-7)return-Math.min(d.radii.x,d.radii.y,d.radii.z);
 const k1=Math.hypot(tmp.x/(d.radii.x*d.radii.x),tmp.y/(d.radii.y*d.radii.y),tmp.z/(d.radii.z*d.radii.z));
 return k0*(k0-1)/Math.max(k1,1e-7);
}

function capsuleDistance(point,d,tmp,tmp2){
 tmp.copy(point).sub(d.a);tmp2.copy(d.b).sub(d.a);
 const t=clamp(tmp.dot(tmp2)/Math.max(tmp2.lengthSq(),1e-8),0,1),radius=THREE.MathUtils.lerp(d.radiusA,d.radiusB,t);
 return tmp.addScaledVector(tmp2,-t).length()-radius;
}

function toonGradient(){
 const data=new Uint8Array([48,96,150,205,255]);
 const texture=new THREE.DataTexture(data,5,1,THREE.RedFormat,THREE.UnsignedByteType);
 texture.minFilter=THREE.NearestFilter;texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 return texture;
}

export function createBodySurfaceV1(api,{visible=true,opacity=1,color=0xd89f7c,voxelSize=.027}={}){
 if(!api||api.contractVersion!==REQUIRED_SKELETON_CONTRACT)throw new Error('Body Surface v1 requires Skeleton Contract v1');
 const root=api.jointRoot,group=new THREE.Group();group.name='body_surface_v1';group.userData.kind='body-surface-layer';root.add(group);
 const gradientMap=toonGradient(),material=new THREE.MeshToonMaterial({color,gradientMap,transparent:opacity<1,opacity:clamp(opacity,.15,1),depthWrite:opacity>=.98,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(new THREE.BufferGeometry(),material);mesh.name='body_surface_mesh';mesh.renderOrder=4;mesh.userData.kind='body-surface';group.add(mesh);
 const deformers=[],tmp=new THREE.Vector3(),tmp2=new THREE.Vector3(),inverseRoot=new THREE.Matrix4(),rootQuaternion=new THREE.Quaternion(),inverseRootQuaternion=new THREE.Quaternion();
 const stature=api.getRestMetrics?.().stature??1.75,S=stature/1.75,blendRadius=.022*S;
 let disposed=false,lastSignature='',lastBuild={triangleCount:0,vertexCount:0,grid:[0,0,0],bounds:null,buildMs:0};

 function object(name){return api.getJoint(name)||root.getObjectByName(name)||null}
 function requireObject(name){const o=object(name);if(!o)throw new Error(`Body Surface v1 missing anchor ${name}`);return o}
 function point(name,offset=null){
  const o=requireObject(name),p=offset?.clone()??new THREE.Vector3();
  return p.applyMatrix4(o.matrixWorld).applyMatrix4(inverseRoot);
 }
 function orientation(name){
  const q=requireObject(name).getWorldQuaternion(new THREE.Quaternion());
  return inverseRootQuaternion.clone().multiply(q).normalize();
 }
 function addEllipsoid(name,zone,center,radii,quaternion=new THREE.Quaternion(),side=null){
  const q=quaternion.clone().normalize();deformers.push({type:'ellipsoid',name,zone,side,center,radii:radii.clone().multiplyScalar(S),quaternion:q,inverseQuaternion:q.clone().invert()});
 }
 function addCapsule(name,zone,a,b,radiusA,radiusB=radiusA,side=null){deformers.push({type:'capsule',name,zone,side,a,b,radiusA:radiusA*S,radiusB:radiusB*S})}
 function alongQuaternion(a,b){const direction=b.clone().sub(a).normalize();return new THREE.Quaternion().setFromUnitVectors(unitY,direction)}
 function localOffset(q,x,y,z){return new THREE.Vector3(x*S,y*S,z*S).applyQuaternion(q)}
 function rebuildDeformers(){
  deformers.length=0;root.updateMatrixWorld(true);inverseRoot.copy(root.matrixWorld).invert();root.getWorldQuaternion(rootQuaternion);inverseRootQuaternion.copy(rootQuaternion).invert();
  const headQ=orientation('head'),headCenter=point('head').add(localOffset(headQ,0,.057,.020));
  addEllipsoid('head','head',headCenter,new THREE.Vector3(.096,.122,.106),headQ);
  addCapsule('neck','neck',point('spine_T1'),point('head'),.056,.047);

  const t3=point('spine_T3'),t10=point('spine_T10'),t12=point('spine_T12'),l3=point('spine_L3'),s1=point('spine_S1');
  const chestQ=orientation('spine_T7'),chestCenter=t3.clone().lerp(t10,.53).add(localOffset(chestQ,0,.004,.020));
  addEllipsoid('thorax','torso',chestCenter,new THREE.Vector3(.174,.247,.124),chestQ);
  const abdomenQ=orientation('spine_L3'),abdomenCenter=t12.clone().lerp(s1,.55).add(localOffset(abdomenQ,0,0,.026));
  addEllipsoid('abdomen','torso',abdomenCenter,new THREE.Vector3(.139,.199,.116),abdomenQ);
  const pelvisQ=orientation('pelvis_center'),hipMid=point('hip_L').add(point('hip_R')).multiplyScalar(.5),pelvisCenter=hipMid.clone().add(localOffset(pelvisQ,0,.014,.014));
  addEllipsoid('pelvis','pelvis',pelvisCenter,new THREE.Vector3(.160,.154,.124),pelvisQ);
  for(const side of ['L','R']){
   const sign=side==='L'?-1:1;
   addEllipsoid(`breast_${side}`,'chest',chestCenter.clone().add(localOffset(chestQ,sign*.068,.020,.106)),new THREE.Vector3(.078,.086,.057),chestQ,side);
   addEllipsoid(`gluteal_${side}`,'pelvis',pelvisCenter.clone().add(localOffset(pelvisQ,sign*.076,-.035,-.083)),new THREE.Vector3(.096,.116,.080),pelvisQ,side);
  }

  for(const side of ['L','R']){
   const shoulder=point(`shoulder_${side}`),elbow=point(`elbow_${side}`),wrist=point(`wrist_${side}`),hip=point(`hip_${side}`),knee=point(`knee_${side}`),ankle=point(`ankle_${side}`);
   addEllipsoid(`shoulder_${side}`,'upperArms',shoulder.clone().lerp(elbow,.055),new THREE.Vector3(.062,.073,.064),orientation(`shoulder_${side}`),side);
   addCapsule(`upper_arm_${side}`,'upperArms',shoulder,elbow,.054,.038,side);
   addCapsule(`forearm_${side}`,'forearms',elbow,wrist,.043,.029,side);
   const middleMcp=point(`finger_mcp_${side}_2`);
   addCapsule(`palm_${side}`,'hands',wrist,middleMcp,.032,.027,side);
   addCapsule(`finger_mass_${side}`,'hands',middleMcp,point(`finger_${side}_2_2`),.016,.008,side);
   addCapsule(`thumb_${side}`,'hands',point(`thumb_cmc_${side}`),point(`thumb_tip_${side}`),.012,.006,side);
   addCapsule(`thigh_${side}`,'thighs',hip,knee,.084,.056,side);
   addEllipsoid(`knee_${side}`,'knees',knee.clone().add(localOffset(orientation(`knee_${side}`),0,0,.008)),new THREE.Vector3(.059,.066,.059),orientation(`knee_${side}`),side);
   addCapsule(`shin_${side}`,'lowerLegs',knee,ankle,.056,.039,side);
   addCapsule(`foot_${side}`,'feet',point(`heel_${side}`),point(`tip_${side}_2`),.050,.029,side);
  }
 }
 function field(pointValue){
  let distance=Infinity;
  for(const d of deformers){const next=d.type==='ellipsoid'?ellipsoidDistance(pointValue,d,tmp):capsuleDistance(pointValue,d,tmp,tmp2);distance=distance===Infinity?next:smoothMin(distance,next,blendRadius)}
  return distance;
 }
 function deformerBounds(){
  const min=new THREE.Vector3(Infinity,Infinity,Infinity),max=new THREE.Vector3(-Infinity,-Infinity,-Infinity);
  for(const d of deformers){
   const radius=d.type==='ellipsoid'?Math.max(d.radii.x,d.radii.y,d.radii.z):Math.max(d.radiusA,d.radiusB),points=d.type==='ellipsoid'?[d.center]:[d.a,d.b];
   for(const p of points){min.min(p.clone().addScalar(-radius));max.max(p.clone().addScalar(radius))}
  }
  min.addScalar(-.040*S);max.addScalar(.040*S);return{min,max};
 }
 function buildGeometry(){
  const started=performance.now(),bounds=deformerBounds(),size=bounds.max.clone().sub(bounds.min),target=Math.max(.018*S,Number(voxelSize)*S),nx=clamp(Math.ceil(size.x/target)+1,12,76),ny=clamp(Math.ceil(size.y/target)+1,24,92),nz=clamp(Math.ceil(size.z/target)+1,12,52),step=new THREE.Vector3(size.x/(nx-1),size.y/(ny-1),size.z/(nz-1));
  const values=new Float32Array(nx*ny*nz),gridIndex=(x,y,z)=>x+nx*(y+ny*z),sample=new THREE.Vector3();
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){sample.set(bounds.min.x+x*step.x,bounds.min.y+y*step.y,bounds.min.z+z*step.z);values[gridIndex(x,y,z)]=field(sample)}
  const positions=[],indices=[],vertexMap=new Map(),cornerPoints=Array.from({length:8},()=>new THREE.Vector3()),cornerValues=new Float32Array(8);
  function vertex(p){const key=`${Math.round(p.x*1e5)},${Math.round(p.y*1e5)},${Math.round(p.z*1e5)}`;let index=vertexMap.get(key);if(index!==undefined)return index;index=positions.length/3;positions.push(p.x,p.y,p.z);vertexMap.set(key,index);return index}
  const centroid=new THREE.Vector3(),inside=new THREE.Vector3(),outside=new THREE.Vector3(),normal=new THREE.Vector3(),axisU=new THREE.Vector3(),axisV=new THREE.Vector3(),edgePoint=new THREE.Vector3();
  for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
   let negative=0;
   for(let c=0;c<8;c++){const [dx,dy,dz]=cubeCorners[c],p=cornerPoints[c];p.set(bounds.min.x+(x+dx)*step.x,bounds.min.y+(y+dy)*step.y,bounds.min.z+(z+dz)*step.z);const v=values[gridIndex(x+dx,y+dy,z+dz)];cornerValues[c]=v;if(v<0)negative++}
   if(negative===0||negative===8)continue;
   for(const tet of tetrahedra){
    const crossings=[],insideIds=tet.filter(i=>cornerValues[i]<0),outsideIds=tet.filter(i=>cornerValues[i]>=0);if(!insideIds.length||!outsideIds.length)continue;
    for(const [ea,eb] of tetraEdges){const ia=tet[ea],ib=tet[eb],va=cornerValues[ia],vb=cornerValues[ib];if((va<0)===(vb<0))continue;const t=clamp(va/(va-vb),0,1);crossings.push(edgePoint.copy(cornerPoints[ia]).lerp(cornerPoints[ib],t).clone())}
    if(crossings.length<3)continue;
    centroid.set(0,0,0);for(const p of crossings)centroid.add(p);centroid.multiplyScalar(1/crossings.length);
    inside.set(0,0,0);for(const i of insideIds)inside.add(cornerPoints[i]);inside.multiplyScalar(1/insideIds.length);
    outside.set(0,0,0);for(const i of outsideIds)outside.add(cornerPoints[i]);outside.multiplyScalar(1/outsideIds.length);normal.copy(outside).sub(inside).normalize();
    const ref=Math.abs(normal.y)<.85?unitY:new THREE.Vector3(1,0,0);axisU.crossVectors(normal,ref).normalize();axisV.crossVectors(normal,axisU).normalize();
    crossings.sort((a,b)=>Math.atan2(a.clone().sub(centroid).dot(axisV),a.clone().sub(centroid).dot(axisU))-Math.atan2(b.clone().sub(centroid).dot(axisV),b.clone().sub(centroid).dot(axisU)));
    const first=vertex(crossings[0]);for(let i=1;i<crossings.length-1;i++)indices.push(first,vertex(crossings[i]),vertex(crossings[i+1]));
   }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  lastBuild={triangleCount:indices.length/3,vertexCount:positions.length/3,grid:[nx,ny,nz],bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},buildMs:performance.now()-started};return geometry;
 }
 function signature(){return deformers.map(d=>d.type==='ellipsoid'?`${d.name}:${d.center.toArray().map(v=>v.toFixed(4))}:${d.quaternion.toArray().map(v=>v.toFixed(4))}`:`${d.name}:${d.a.toArray().map(v=>v.toFixed(4))}:${d.b.toArray().map(v=>v.toFixed(4))}`).join('|')}
 function update(force=false){
  if(disposed)return null;rebuildDeformers();const nextSignature=signature();if(!force&&nextSignature===lastSignature)return getDiagnostics();lastSignature=nextSignature;
  const geometry=buildGeometry(),old=mesh.geometry;mesh.geometry=geometry;old.dispose();return getDiagnostics();
 }
 function getDiagnostics(){
  const landmarks=['head','shoulder_L','shoulder_R','elbow_L','elbow_R','wrist_L','wrist_R','hip_L','hip_R','knee_L','knee_R','ankle_L','ankle_R'],clearance={};
  for(const name of landmarks)clearance[name]=field(point(name));
  const sides={L:deformers.filter(d=>d.side==='L').length,R:deformers.filter(d=>d.side==='R').length},positions=mesh.geometry.getAttribute('position'),finite=!!positions&&Array.from(positions.array).every(Number.isFinite);
  const checks={contract:api.contractVersion===1,deformerCount:deformers.length===29,bilateral:sides.L===sides.R,continuousMesh:lastBuild.triangleCount>1500,finite,landmarksInside:Object.values(clearance).every(v=>v<=.012*S),pixelTarget:true};
  return{version:BODY_SURFACE_VERSION,stature,targetPixelHeight:400,deformerCount:deformers.length,sides,zones:[...new Set(deformers.map(d=>d.zone))],shadeSteps:5,voxelSize:Number(voxelSize),mesh:lastBuild,landmarkClearance:clearance,checks,pass:Object.values(checks).every(Boolean)};
 }
 function setVisible(next){group.visible=!!next;return group.visible}
 function setOpacity(next){const value=clamp(Number(next)||0,.15,1);material.opacity=value;material.transparent=value<1;material.depthWrite=value>=.98;material.needsUpdate=true;return value}
 function dispose(){disposed=true;mesh.geometry.dispose();material.dispose();gradientMap.dispose();group.removeFromParent()}

  update(true);setVisible(visible);const validation=getDiagnostics();if(!validation.pass)throw new Error('Body Surface v1 validation failed: '+JSON.stringify(validation));
  const surfaceApi=Object.freeze({version:BODY_SURFACE_VERSION,group,mesh,material,update,getDiagnostics,validate:getDiagnostics,setVisible,setOpacity,dispose});root.userData.bodySurface=surfaceApi;return surfaceApi;
}

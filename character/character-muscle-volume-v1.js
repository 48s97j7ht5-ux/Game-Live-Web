import * as THREE from 'three';

/**
 * Muscle Volume v1 — dynamic shoulder-girdle and upper-limb muscle layer.
 *
 * The module owns visual muscle geometry only. Skeleton geometry, joint
 * mechanics and the outer body envelope remain independent. Each path point
 * is stored in the local frame of the bone/landmark it belongs to; moving the
 * rig therefore changes muscle-tendon length without changing either rig.
 */
export const MUSCLE_VOLUME_VERSION='1.0.0';
export const REQUIRED_SKELETON_CONTRACT=1;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function variableTubeGeometry(points,radius,thicknessScale=1,segments=14,radial=10){
 const curve=points.length===2?new THREE.LineCurve3(points[0],points[1]):new THREE.CatmullRomCurve3(points,'centripetal',false,.5),frames=curve.computeFrenetFrames(segments,false),vertices=[],normals=[],uvs=[],indices=[];
 for(let i=0;i<=segments;i++){
  const t=i/segments,p=curve.getPointAt(t),n=frames.normals[i],b=frames.binormals[i],belly=Math.pow(Math.sin(Math.PI*t),.68),r=radius*thicknessScale*(.22+.78*belly);
  for(let j=0;j<radial;j++){
   const a=j/radial*Math.PI*2,normal=n.clone().multiplyScalar(Math.cos(a)).addScaledVector(b,Math.sin(a)).normalize();
   vertices.push(p.x+normal.x*r,p.y+normal.y*r,p.z+normal.z*r);normals.push(normal.x,normal.y,normal.z);uvs.push(t,j/radial);
  }
 }
 for(let i=0;i<segments;i++)for(let j=0;j<radial;j++){const k=(j+1)%radial,a=i*radial+j,b=i*radial+k,c=(i+1)*radial+k,d=(i+1)*radial+j;indices.push(a,c,b,a,d,c)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeBoundingSphere();return g;
}

function pathLength(points){let length=0;for(let i=1;i<points.length;i++)length+=points[i].distanceTo(points[i-1]);return length}

export function createMuscleVolumeV1(api,{visible=true,opacity=.88}={}){
 if(!api||api.contractVersion!==REQUIRED_SKELETON_CONTRACT)throw new Error('Muscle Volume v1 requires Skeleton Contract v1');
 api.jointRoot.updateMatrixWorld(true);
 const group=new THREE.Group();group.name='muscle_volume_v1';group.userData.kind='muscle-volume-layer';api.jointRoot.add(group);
 const materials={
  superficial:new THREE.MeshStandardMaterial({color:0xb94d43,roughness:.82,transparent:true,opacity,depthWrite:false}),
  deep:new THREE.MeshStandardMaterial({color:0x8f3837,roughness:.86,transparent:true,opacity:opacity*.90,depthWrite:false}),
  tendon:new THREE.MeshStandardMaterial({color:0xd3b8a0,roughness:.9,transparent:true,opacity,depthWrite:false})
 };
 const muscles=[],byName=new Map();let disposed=false,lastSignature='';

 function object(name){return api.getJoint(name)||api.jointRoot.getObjectByName(name)||null}
 function requireObject(name){const o=object(name);if(!o)throw new Error(`Muscle Volume v1 missing anchor ${name}`);return o}
 function world(name){return requireObject(name).getWorldPosition(new THREE.Vector3())}
 function attachment(name,worldPosition=null){const o=requireObject(name),p=worldPosition?.clone()??world(name);return{object:o,local:o.worldToLocal(p)}}
 function offset(name,x=0,y=0,z=0){return attachment(name,world(name).add(new THREE.Vector3(x,y,z)))}
 function along(parent,start,end,t,offsetVector=new THREE.Vector3()){return attachment(parent,world(start).lerp(world(end),t).add(offsetVector))}
 function resolve(a){return a.object.localToWorld(a.local.clone()).applyMatrix4(api.jointRoot.matrixWorld.clone().invert())}
 function add(name,side,region,radius,anchors,layer='superficial'){
  const points=anchors.map(resolve),restLength=pathLength(points),mesh=new THREE.Mesh(variableTubeGeometry(points,radius),materials[layer]);mesh.name=`muscle_${name}_${side}`;mesh.renderOrder=3;mesh.userData.kind='muscle-volume';mesh.userData.muscleName=name;mesh.userData.side=side;mesh.userData.region=region;group.add(mesh);
  const m={name,side,region,radius,anchors,mesh,restLength,currentLength:restLength,stretchRatio:1,thicknessScale:1,volumeRatio:1};muscles.push(m);byName.set(`${name}_${side}`,m);return m;
 }
 function addPair(name,region,radius,build,layer='superficial'){for(const side of ['L','R'])add(name,side,region,radius,build(side,side==='L'?-1:1),layer)}

 // Broad thoracoscapular muscles are represented by several anatomical slips.
 addPair('trapezius_upper','shoulderGirdle',.018,(s,g)=>[offset('neck_C2',g*.018,0,-.012),attachment(`scAc${s}`)],'superficial');
 addPair('trapezius_middle','shoulderGirdle',.017,(s,g)=>[offset('spine_T3',g*.010,0,-.020),attachment(`scMed${s}`)],'superficial');
 addPair('trapezius_lower','shoulderGirdle',.015,(s,g)=>[offset('spine_T7',g*.010,0,-.018),attachment(`scBorderMid${s}`)],'superficial');
 addPair('pectoralis_clavicular','chestToArm',.022,(s,g)=>[offset(`SC_${s}`,g*.008,-.006,.020),offset(`shoulder_${s}`,0,-.070,.032)],'superficial');
 addPair('pectoralis_sternal','chestToArm',.024,(s,g)=>[offset('sternumBody',g*.020,0,.010),offset(`shoulder_${s}`,0,-.085,.028)],'superficial');
 addPair('latissimus_dorsi','backToArm',.024,(s,g)=>[offset('spine_L3',g*.045,-.010,-.035),offset('spine_T10',g*.055,-.010,-.040),offset(`scInf${s}`,0,-.012,-.006),offset(`shoulder_${s}`,0,-.092,-.020)],'superficial');
 for(const rib of [3,5,7])addPair(`serratus_${rib}`,'scapularStabilizers',.009,(s,g)=>[attachment(`r${rib}${s}A`),attachment(`r${rib}${s}L`),attachment(rib===3?`scSup${s}`:rib===5?`scBorderMid${s}`:`scInf${s}`)],'deep');

 // Three deltoid heads share the deltoid tuberosity but retain distinct origins.
 addPair('deltoid_anterior','shoulder',.024,(s,g)=>[offset(`AC_${s}`,-g*.020,0,.012),along(`shoulder_${s}`,`shoulder_${s}`,`elbow_${s}`,.38,new THREE.Vector3(0,0,.012))]);
 addPair('deltoid_middle','shoulder',.027,(s,g)=>[attachment(`scAc${s}`),along(`shoulder_${s}`,`shoulder_${s}`,`elbow_${s}`,.39,new THREE.Vector3(g*.010,0,0))]);
 addPair('deltoid_posterior','shoulder',.023,(s,g)=>[attachment(`scMed${s}`),offset(`shoulder_${s}`,-g*.010,-.105,-.020),along(`shoulder_${s}`,`shoulder_${s}`,`elbow_${s}`,.38,new THREE.Vector3(0,0,-.010))]);

 // Rotator cuff: thin deep paths centred on the glenohumeral joint.
 addPair('supraspinatus','rotatorCuff',.010,(s,g)=>[attachment(`scSup${s}`),offset(`shoulder_${s}`,0,-.018,-.002)],'deep');
 addPair('infraspinatus','rotatorCuff',.012,(s,g)=>[attachment(`scBorderMid${s}`),offset(`shoulder_${s}`,0,-.030,-.018)],'deep');
 addPair('teres_minor','rotatorCuff',.009,(s,g)=>[attachment(`scInf${s}`),offset(`shoulder_${s}`,0,-.048,-.014)],'deep');
 addPair('subscapularis','rotatorCuff',.012,(s,g)=>[offset(`scBorderMid${s}`,0,0,.012),offset(`shoulder_${s}`,0,-.030,.014)],'deep');

 // Arm flexors/extensors cross the elbow because their insertions live in the
 // forearm frame. Their visible bulge therefore follows actual joint motion.
 addPair('biceps_long','upperArm',.018,(s,g)=>[attachment(`scGlen${s}`),offset(`shoulder_${s}`,0,-.035,.022),along(`forearm_rotation_${s}`,`elbow_${s}`,`wrist_${s}`,.13,new THREE.Vector3(g*.009,0,.012))]);
 addPair('biceps_short','upperArm',.019,(s,g)=>[attachment(`scCor${s}`),offset(`shoulder_${s}`,-g*.005,-.050,.024),along(`forearm_rotation_${s}`,`elbow_${s}`,`wrist_${s}`,.12,new THREE.Vector3(g*.006,0,.014))]);
 addPair('brachialis','upperArm',.017,(s,g)=>[along(`shoulder_${s}`,`shoulder_${s}`,`elbow_${s}`,.30,new THREE.Vector3(0,0,.015)),along(`elbow_${s}`,`elbow_${s}`,`wrist_${s}`,.10,new THREE.Vector3(-g*.006,0,.005))],'deep');
 addPair('triceps_long','upperArm',.020,(s,g)=>[attachment(`scInf${s}`),offset(`shoulder_${s}`,0,-.050,-.022),along(`elbow_${s}`,`elbow_${s}`,`wrist_${s}`,.08,new THREE.Vector3(0,0,-.015))]);
 addPair('triceps_lateral','upperArm',.019,(s,g)=>[along(`shoulder_${s}`,`shoulder_${s}`,`elbow_${s}`,.16,new THREE.Vector3(g*.010,0,-.014)),along(`elbow_${s}`,`elbow_${s}`,`wrist_${s}`,.08,new THREE.Vector3(g*.006,0,-.014))]);
 addPair('triceps_medial','upperArm',.014,(s,g)=>[along(`shoulder_${s}`,`shoulder_${s}`,`elbow_${s}`,.35,new THREE.Vector3(-g*.008,0,-.010)),along(`elbow_${s}`,`elbow_${s}`,`wrist_${s}`,.07,new THREE.Vector3(-g*.004,0,-.012))],'deep');

 // Forearm silhouettes: flexor/extensor masses and brachioradialis. Detailed
 // individual finger tendons remain a later hand-specific pass.
 addPair('brachioradialis','forearm',.014,(s,g)=>[along(`shoulder_${s}`,`shoulder_${s}`,`elbow_${s}`,.84,new THREE.Vector3(g*.012,0,.004)),along(`forearm_rotation_${s}`,`elbow_${s}`,`wrist_${s}`,.84,new THREE.Vector3(g*.010,0,.006))]);
 addPair('forearm_flexors','forearm',.018,(s,g)=>[along(`forearm_rotation_${s}`,`elbow_${s}`,`wrist_${s}`,.08,new THREE.Vector3(-g*.006,0,.012)),along(`forearm_rotation_${s}`,`elbow_${s}`,`wrist_${s}`,.86,new THREE.Vector3(-g*.004,0,.009))]);
 addPair('forearm_extensors','forearm',.016,(s,g)=>[along(`elbow_${s}`,`elbow_${s}`,`wrist_${s}`,.08,new THREE.Vector3(g*.007,0,-.012)),along(`elbow_${s}`,`elbow_${s}`,`wrist_${s}`,.86,new THREE.Vector3(g*.005,0,-.009))]);

 function update(force=false){
  if(disposed)return null;api.jointRoot.updateMatrixWorld(true);group.updateMatrixWorld(true);
  const invRoot=api.jointRoot.matrixWorld.clone().invert(),allPoints=muscles.map(m=>m.anchors.map(a=>a.object.localToWorld(a.local.clone()).applyMatrix4(invRoot))),signature=allPoints.flat().map(p=>`${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`).join('|');
  if(!force&&signature===lastSignature)return getDiagnostics();lastSignature=signature;
  for(let i=0;i<muscles.length;i++){
   const m=muscles[i],points=allPoints[i],length=pathLength(points),stretch=length/m.restLength,thickness=clamp(Math.sqrt(m.restLength/Math.max(length,.001)),.72,1.35);
   m.currentLength=length;m.stretchRatio=stretch;m.thicknessScale=thickness;m.volumeRatio=stretch*thickness*thickness;
   const geometry=variableTubeGeometry(points,m.radius,thickness);m.mesh.geometry.dispose();m.mesh.geometry=geometry;
  }
  return getDiagnostics();
 }
 function getDiagnostics(){
  const sides={L:muscles.filter(m=>m.side==='L').length,R:muscles.filter(m=>m.side==='R').length},maxVolumeError=Math.max(...muscles.map(m=>Math.abs(1-m.volumeRatio))),maxStretch=Math.max(...muscles.map(m=>m.stretchRatio)),minStretch=Math.min(...muscles.map(m=>m.stretchRatio));
  const bilateral=muscles.filter(m=>m.side==='L').every(l=>{const r=byName.get(`${l.name}_R`);return r&&Math.abs(l.restLength-r.restLength)<=.002});
  const checks={contract:api.contractVersion===1,muscleCount:muscles.length>=50,bilateral:sides.L===sides.R&&bilateral,finite:muscles.every(m=>Number.isFinite(m.currentLength)&&m.currentLength>.01),volumeConservation:maxVolumeError<=.02,ordinaryThickness:muscles.every(m=>m.radius<=.027)};
  return{version:MUSCLE_VOLUME_VERSION,muscleCount:muscles.length,sides,regions:[...new Set(muscles.map(m=>m.region))],maxVolumeError,maxStretch,minStretch,checks,pass:Object.values(checks).every(Boolean)};
 }
 function getMuscle(name,side){const m=byName.get(`${name}_${side}`);return m?{name:m.name,side:m.side,region:m.region,restLength:m.restLength,currentLength:m.currentLength,stretchRatio:m.stretchRatio,thicknessScale:m.thicknessScale,volumeRatio:m.volumeRatio}:null}
 function setVisible(next){group.visible=!!next;return group.visible}
 function setOpacity(next){const value=clamp(Number(next)||0,.12,1);materials.superficial.opacity=value;materials.deep.opacity=value*.90;materials.tendon.opacity=value;return value}
 function dispose(){disposed=true;for(const m of muscles)m.mesh.geometry.dispose();for(const m of Object.values(materials))m.dispose();group.removeFromParent()}

 update(true);setVisible(visible);const validation=getDiagnostics();if(!validation.pass)throw new Error('Muscle Volume v1 validation failed: '+JSON.stringify(validation));
 const muscleApi=Object.freeze({version:MUSCLE_VOLUME_VERSION,muscles:Object.freeze(muscles),group,update,getMuscle,getDiagnostics,validate:getDiagnostics,setVisible,setOpacity,dispose});api.jointRoot.userData.muscleVolume=muscleApi;return muscleApi;
}

import * as THREE from 'three';

/**
 * Body Volume v1 — neutral adult body envelope for Skeleton Contract v1.
 *
 * This module deliberately contains no joint mechanics. It attaches analytic
 * soft-tissue volumes to the existing rig, so the skeleton can be corrected
 * without rewriting the body layer and the mechanics can move both together.
 * The first pass is a clean body_base: no hair, face details, clothes or
 * individual body-composition controls.
 */
export const BODY_VOLUME_VERSION='1.0.0';
export const REQUIRED_SKELETON_CONTRACT=1;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const unitY=new THREE.Vector3(0,1,0);

function loftGeometry(length,profile,radialSegments=20){
 const vertices=[],indices=[],uvs=[];
 for(let ring=0;ring<profile.length;ring++){
  const [t,rx,rz]=profile[ring];
  for(let i=0;i<radialSegments;i++){
   const a=i/radialSegments*Math.PI*2;
   vertices.push(Math.cos(a)*rx,length*t,Math.sin(a)*rz);
   uvs.push(i/radialSegments,t);
  }
 }
 for(let ring=0;ring<profile.length-1;ring++)for(let i=0;i<radialSegments;i++){
  const n=(i+1)%radialSegments,a=ring*radialSegments+i,b=ring*radialSegments+n,c=(ring+1)*radialSegments+n,d=(ring+1)*radialSegments+i;
  indices.push(a,c,b,a,d,c);
 }
 const bottom=vertices.length/3;vertices.push(0,0,0);uvs.push(.5,0);
 const top=vertices.length/3;vertices.push(0,length,0);uvs.push(.5,1);
 for(let i=0;i<radialSegments;i++){
  const n=(i+1)%radialSegments;
  indices.push(bottom,n,i);
  const a=(profile.length-1)*radialSegments+i,b=(profile.length-1)*radialSegments+n;
  indices.push(top,a,b);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}

function worldPoint(object){return object.getWorldPosition(new THREE.Vector3())}

export function createBodyVolumeV1(api,{opacity=.42,color=0xd8a27e,visible=true}={}){
 if(!api||api.contractVersion!==REQUIRED_SKELETON_CONTRACT)throw new Error('Body Volume v1 requires Skeleton Contract v1');
 api.jointRoot.updateMatrixWorld(true);

 // Capture only the pre-existing skeleton meshes. Body meshes are added later,
 // so hiding the skeleton never hides the joint hierarchy that drives the body.
 const skeletonMeshes=[];api.jointRoot.traverse(o=>{if(o.isMesh)skeletonMeshes.push(o)});
 const stature=api.getRestMetrics?.().stature??1.75,S=stature/1.75;
 const material=new THREE.MeshStandardMaterial({color,roughness:.88,metalness:0,transparent:true,opacity:clamp(opacity,.12,1),depthWrite:false,side:THREE.DoubleSide});
 const parts=[],attachments=[],zones=new Map(),scapularPads={};
 const sphereGeometry=new THREE.SphereGeometry(1,24,18);

 function object(name){return api.getJoint(name)||api.jointRoot.getObjectByName(name)||null}
 function requireObject(name){const o=object(name);if(!o)throw new Error(`Body Volume v1 missing anchor ${name}`);return o}
 function register(mesh,zone,name){
  mesh.name=`body_${name}`;mesh.userData.kind='body-volume-part';mesh.userData.bodyVolumePart=true;mesh.userData.bodyZone=zone;mesh.renderOrder=2;
  parts.push(mesh);if(!zones.has(zone))zones.set(zone,[]);zones.get(zone).push(mesh);return mesh;
 }
 function attachment(anchor,name){
  const g=new THREE.Group();g.name=`body_attachment_${name}`;g.userData.kind='body-volume-attachment';anchor.add(g);attachments.push(g);return g;
 }
 function ellipsoid(anchorName,name,zone,centerWorld,scale,rotation=null){
  const anchor=requireObject(anchorName),g=attachment(anchor,name),m=register(new THREE.Mesh(sphereGeometry,material),zone,name);
  m.position.copy(anchor.worldToLocal(centerWorld.clone()));m.scale.set(scale[0]*S,scale[1]*S,scale[2]*S);if(rotation)m.quaternion.copy(rotation);g.add(m);return m;
 }
 function loftWorld(anchorName,name,zone,startWorld,endWorld,profile){
  const anchor=requireObject(anchorName),g=attachment(anchor,name),start=anchor.worldToLocal(startWorld.clone()),end=anchor.worldToLocal(endWorld.clone()),delta=end.sub(start),length=delta.length();
  if(length<.001)throw new Error(`Body Volume v1 zero-length part ${name}`);
  const scaledProfile=profile.map(([t,rx,rz])=>[t,rx*S,rz*S]),m=register(new THREE.Mesh(loftGeometry(length,scaledProfile),material),zone,name);
  m.position.copy(start);m.quaternion.setFromUnitVectors(unitY,delta.normalize());g.add(m);return m;
 }
 function loftBetween(anchorName,endName,name,zone,profile){const a=requireObject(anchorName),b=requireObject(endName);return loftWorld(anchorName,name,zone,worldPoint(a),worldPoint(b),profile)}
 const hipL=worldPoint(requireObject('hip_L')),hipR=worldPoint(requireObject('hip_R')),hipMid=hipL.clone().add(hipR).multiplyScalar(.5);
 const shoulderL=worldPoint(requireObject('shoulder_L')),shoulderR=worldPoint(requireObject('shoulder_R')),shoulderMid=shoulderL.clone().add(shoulderR).multiplyScalar(.5);
 const t3=worldPoint(requireObject('spine_T3')),t7=worldPoint(requireObject('spine_T7')),t10=worldPoint(requireObject('spine_T10')),t12=worldPoint(requireObject('spine_T12')),l3=worldPoint(requireObject('spine_L3')),s1=worldPoint(requireObject('spine_S1'));

 // Axial body: overlapping analytic masses form a continuous, neutral adult
 // envelope while still following the regional spine joints.
 const headBase=worldPoint(requireObject('head')),crown=worldPoint(requireObject('crown'));
 ellipsoid('head','head','head',headBase.clone().lerp(crown,.55).add(new THREE.Vector3(0,0,.018*S)),[.090,.116,.102]);
 loftWorld('spine_T1','neck','neck',worldPoint(requireObject('spine_T1')),headBase.clone().add(new THREE.Vector3(0,0,.010*S)),[[0,.058,.054],[.50,.052,.049],[1,.045,.044]]);
 ellipsoid('spine_T7','thorax','chest',t3.clone().lerp(t10,.52).add(new THREE.Vector3(0,.005*S,.020*S)),[.172,.252,.122]);
 ellipsoid('spine_L3','abdomen','abdomen',t12.clone().lerp(s1,.52).add(new THREE.Vector3(0,0,.025*S)),[.135,.205,.112]);
 ellipsoid('pelvis_center','pelvis','pelvis',hipMid.clone().add(new THREE.Vector3(0,.015*S,.012*S)),[.158,.155,.120]);
 for(const side of ['L','R']){
  const sign=side==='L'?-1:1;
  ellipsoid('pelvis_center',`gluteal_${side}`,'pelvis',hipMid.clone().add(new THREE.Vector3(sign*.078*S,-.030*S,-.060*S)),[.095,.115,.075]);
 }

 // Scapular soft-tissue pads follow each blade independently. This is the
 // crucial bridge between the mobile scapula and the otherwise rigid thorax
 // envelope; it lets the inferior angle remain under a visible back surface.
 for(const side of ['L','R']){
  const scap=requireObject(`scapula_${side}`),landmarks=[`scSup${side}`,`scBorderMid${side}`,`scInf${side}`].map(requireObject),center=landmarks.reduce((v,o)=>v.add(worldPoint(o)),new THREE.Vector3()).multiplyScalar(1/landmarks.length);
  center.add(new THREE.Vector3(0,0,-.004*S));
  scapularPads[side]=ellipsoid(`scapula_${side}`,`scapular_pad_${side}`,'upperBack',center,[.090,.100,.026]);
  scapularPads[side].userData.landmarks=landmarks.map(o=>o.name);
  // Deltoid mass rotates with the humerus while overlapping the thorax and pad.
  const sh=worldPoint(requireObject(`shoulder_${side}`));
  ellipsoid(`shoulder_${side}`,`deltoid_${side}`,'upperArms',sh.clone().add(new THREE.Vector3(0,-.025*S,0)),[.066,.080,.068]);
 }

 const upperArmProfile=[[0,.054,.058],[.25,.052,.055],[.60,.043,.045],[.86,.034,.036],[1,.038,.040]];
 const forearmProfile=[[0,.038,.041],[.22,.043,.045],[.62,.034,.037],[.88,.027,.030],[1,.028,.031]];
 const thighProfile=[[0,.078,.085],[.24,.083,.090],[.58,.069,.075],[.85,.052,.057],[1,.055,.060]];
 const shinProfile=[[0,.052,.057],[.22,.061,.070],[.55,.057,.064],[.84,.039,.044],[1,.038,.043]];

 for(const side of ['L','R']){
  loftBetween(`shoulder_${side}`,`elbow_${side}`,`upper_arm_${side}`,'upperArms',upperArmProfile);
  const elbow=worldPoint(requireObject(`elbow_${side}`));ellipsoid(`elbow_${side}`,`elbow_blend_${side}`,'forearms',elbow,[.041,.044,.043]);
  loftBetween(`forearm_rotation_${side}`,`wrist_${side}`,`forearm_${side}`,'forearms',forearmProfile);
  const wrist=worldPoint(requireObject(`wrist_${side}`));ellipsoid(`wrist_${side}`,`wrist_blend_${side}`,'hands',wrist,[.030,.033,.024]);
  const palmEnd=worldPoint(requireObject(`finger_mcp_${side}_2`));
  loftWorld(`wrist_${side}`,`palm_${side}`,'hands',wrist,palmEnd,[[0,.034,.023],[.45,.044,.026],[.82,.040,.023],[1,.031,.020]]);

  for(let f=1;f<5;f++){
   const mcp=`finger_mcp_${side}_${f}`,pip=`finger_pip_${side}_${f}`,dip=`finger_dip_${side}_${f}`,tip=`finger_${side}_${f}_2`,baseRadius=(f===2?.009:f===1?.0087:f===3?.0082:.0076);
   loftBetween(mcp,pip,`finger_${side}_${f}_prox`,'hands',[[0,baseRadius,baseRadius*.78],[1,baseRadius*.78,baseRadius*.68]]);
   loftBetween(pip,dip,`finger_${side}_${f}_mid`,'hands',[[0,baseRadius*.78,baseRadius*.68],[1,baseRadius*.64,baseRadius*.58]]);
   loftWorld(dip,`finger_${side}_${f}_dist`,'hands',worldPoint(requireObject(dip)),worldPoint(requireObject(tip)),[[0,baseRadius*.64,baseRadius*.58],[.75,baseRadius*.52,baseRadius*.48],[1,baseRadius*.25,baseRadius*.24]]);
  }
  loftBetween(`thumb_cmc_${side}`,`thumb_mcp_${side}`,`thumb_${side}_metacarpal`,'hands',[[0,.011,.010],[1,.010,.009]]);
  loftBetween(`thumb_mcp_${side}`,`thumb_ip_${side}`,`thumb_${side}_prox`,'hands',[[0,.011,.010],[1,.009,.008]]);
  loftWorld(`thumb_ip_${side}`,`thumb_${side}_dist`,'hands',worldPoint(requireObject(`thumb_ip_${side}`)),worldPoint(requireObject(`thumb_tip_${side}`)),[[0,.009,.008],[.75,.007,.0065],[1,.003,.003]]);

  loftBetween(`hip_${side}`,`knee_${side}`,`thigh_${side}`,'thighs',thighProfile);
  const knee=worldPoint(requireObject(`knee_${side}`));ellipsoid(`knee_${side}`,`knee_blend_${side}`,'lowerLegs',knee.clone().add(new THREE.Vector3(0,0,.008*S)),[.060,.066,.058]);
  loftBetween(`knee_${side}`,`ankle_${side}`,`lower_leg_${side}`,'lowerLegs',shinProfile);
  const ankle=worldPoint(requireObject(`ankle_${side}`));ellipsoid(`ankle_${side}`,`ankle_blend_${side}`,'feet',ankle,[.043,.048,.040]);
  const heel=worldPoint(requireObject(`heel_${side}`)),toe=worldPoint(requireObject(`tip_${side}_2`));
  loftWorld(`subtalar_${side}`,`foot_${side}`,'feet',heel,toe,[[0,.047,.042],[.18,.058,.046],[.55,.052,.041],[.84,.047,.034],[1,.032,.025]]);
  for(let i=0;i<5;i++){
   const mtp=`toe_mtp_${side}_${i}`,tipName=`tip_${side}_${i}`,r=i===0?.0125:Math.max(.0065,.0105-i*.0009);
   loftWorld(mtp,`toe_${side}_${i}`,'feet',worldPoint(requireObject(mtp)),worldPoint(requireObject(tipName)),[[0,r,r*.80],[.72,r*.78,r*.68],[1,r*.28,r*.26]]);
  }
 }

 function scapulaCoverage(side){
  const pad=scapularPads[side];pad.updateMatrixWorld(true);const inv=pad.matrixWorld.clone().invert();let max=0;
  for(const name of pad.userData.landmarks){const p=worldPoint(requireObject(name)).applyMatrix4(inv);max=Math.max(max,p.length())}
  return{pass:max<=1.06,maxNormalizedRadius:max};
 }
 function getDiagnostics(){
  api.jointRoot.updateMatrixWorld(true);const required=['head','neck','chest','upperBack','abdomen','pelvis','upperArms','forearms','hands','thighs','lowerLegs','feet'];
  const coverage=Object.fromEntries(required.map(z=>[z,zones.get(z)?.length??0])),scapula={L:scapulaCoverage('L'),R:scapulaCoverage('R')};
  const checks={contract:api.contractVersion===1,completeZones:Object.values(coverage).every(n=>n>0),bilateralLimbs:['upperArms','forearms','hands','thighs','lowerLegs','feet'].every(z=>(zones.get(z)?.length??0)%2===0),scapulaCovered:scapula.L.pass&&scapula.R.pass,partCount:parts.length>=50};
  return{version:BODY_VOLUME_VERSION,stature,partCount:parts.length,coverage,scapula,checks,pass:Object.values(checks).every(Boolean)};
 }
 function setVisible(next){for(const p of parts)p.visible=!!next;return !!next}
 function setOpacity(next){material.opacity=clamp(Number(next)||0,.12,1);material.depthWrite=material.opacity>=.98;return material.opacity}
 function setSkeletonVisible(next){for(const m of skeletonMeshes)m.visible=!!next;return !!next}
 function dispose(){for(const g of attachments)g.removeFromParent();for(const p of parts)if(p.geometry!==sphereGeometry)p.geometry.dispose();sphereGeometry.dispose();material.dispose()}

 setVisible(visible);const diagnostics=getDiagnostics();if(!diagnostics.pass)throw new Error('Body Volume v1 validation failed: '+JSON.stringify(diagnostics));
 const bodyApi=Object.freeze({version:BODY_VOLUME_VERSION,parts:Object.freeze([...parts]),zones:Object.freeze([...zones.keys()]),material,setVisible,setOpacity,setSkeletonVisible,getDiagnostics,validate:getDiagnostics,dispose});
 api.jointRoot.userData.bodyVolume=bodyApi;return bodyApi;
}

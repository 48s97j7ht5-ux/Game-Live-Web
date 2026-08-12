import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { scaledAnthropometry } from './anthropometry-v01.js';

const container=document.getElementById('app');
const metricsEl=document.getElementById('metrics');
const labelsEl=document.getElementById('labels');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b0d12);
const camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.01,100);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;container.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;controls.minDistance=1.7;controls.maxDistance=8;controls.target.set(0,.9,0);
scene.add(new THREE.HemisphereLight(0xdde8ff,0x1d2330,2.2));const key=new THREE.DirectionalLight(0xffffff,2.2);key.position.set(4,6,5);scene.add(key);

const A=scaledAnthropometry(1.75);
const ground=new THREE.Mesh(new THREE.CircleGeometry(2.25,64),new THREE.MeshStandardMaterial({color:0x151923,roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
const grid=new THREE.GridHelper(4,40,0x32405a,0x202735);grid.position.y=.002;scene.add(grid);

const skeletonRoot=new THREE.Group();scene.add(skeletonRoot);
const MAT_BONE=new THREE.MeshStandardMaterial({color:0xd7dbe7,roughness:.68});
const MAT_JOINT=new THREE.MeshStandardMaterial({color:0xf0a65b,roughness:.58});
const MAT_END=new THREE.MeshStandardMaterial({color:0x7cc7ff,roughness:.52});
const MAT_CORE=new THREE.MeshStandardMaterial({color:0xb8a8ff,roughness:.58});
const MAT_FRAME=new THREE.MeshStandardMaterial({color:0x8a95ae,roughness:.72});
const nodes={},bones=[];
function addNode(name,xyz,r=.025,mat=MAT_JOINT){const m=new THREE.Mesh(new THREE.SphereGeometry(r,18,12),mat);m.position.set(...xyz);m.name=name;skeletonRoot.add(m);nodes[name]=m}
function addBone(name,aName,bName,r=.014,mat=MAT_BONE){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,12,1,false),mat);m.name=name;skeletonRoot.add(m);bones.push({mesh:m,aName,bName})}
function syncBone(b){const a=nodes[b.aName].position,c=nodes[b.bName].position,mid=a.clone().add(c).multiplyScalar(.5),len=a.distanceTo(c);b.mesh.position.copy(mid);b.mesh.scale.set(1,len,1);b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),c.clone().sub(a).normalize())}
function syncBones(){bones.forEach(syncBone)}

function buildLandmarks(){const H=A.stature;const ankleY=A.ankleJointHeight,kneeY=ankleY+A.tibia,hipY=kneeY+A.femur;const pelvisCenterY=hipY+A.pelvisHeight*.35,pelvisTopY=pelvisCenterY+A.pelvisHeight*.42,pelvisBottomY=pelvisCenterY-A.pelvisHeight*.42;const ribBottomY=pelvisTopY+H*.075,ribTopY=ribBottomY+A.ribCageHeight,ribMidY=(ribTopY+ribBottomY)*.5;const neckBaseY=ribTopY+H*.018,neckTopY=neckBaseY+A.neckLength,crownY=H,headCenterY=crownY-A.headHeight*.5;const shoulderY=ribTopY-A.scapulaHeight*.16,elbowY=shoulderY-A.humerus,wristY=elbowY-A.radius,handY=wristY-A.hand*.48,fingerY=wristY-A.hand;const px=A.pelvisWidth*.5,pz=A.pelvisDepth*.5,rx=A.ribCageWidth*.5,rz=A.ribCageDepth*.5,ux=A.upperThoraxWidth*.5,hipX=A.hipCenterHalfWidth,shoulderX=A.shoulderJointHalfWidth;
return {
pelvisCenter:[0,pelvisCenterY,0],pelvisTopL:[-px,pelvisTopY,-pz*.05],pelvisTopR:[px,pelvisTopY,-pz*.05],pelvisFrontL:[-px*.78,pelvisCenterY,pz],pelvisFrontR:[px*.78,pelvisCenterY,pz],pelvisBackL:[-px*.72,pelvisCenterY,-pz],pelvisBackR:[px*.72,pelvisCenterY,-pz],pelvisBottomL:[-px*.55,pelvisBottomY,0],pelvisBottomR:[px*.55,pelvisBottomY,0],sacrum:[0,pelvisCenterY+A.pelvisHeight*.18,-pz*.62],hipL:[-hipX,hipY,A.hipCenterDepth],hipR:[hipX,hipY,A.hipCenterDepth],
lumbarLow:[0,pelvisTopY+H*.035,-.018],lumbarHigh:[0,ribBottomY-H*.025,-.004],thoracicLow:[0,ribBottomY+A.ribCageHeight*.22,.012],thoracicMid:[0,ribMidY,.022],thoracicHigh:[0,ribTopY-A.ribCageHeight*.18,.012],neckBase:[0,neckBaseY,-.004],neckTop:[0,neckTopY,0],head:[0,headCenterY,.006],crown:[0,crownY,.006],
ribLowL:[-rx*.86,ribBottomY,0],ribLowR:[rx*.86,ribBottomY,0],ribLowFront:[0,ribBottomY,rz*.78],ribLowBack:[0,ribBottomY,-rz*.70],ribMidL:[-rx,ribMidY,0],ribMidR:[rx,ribMidY,0],ribMidFront:[0,ribMidY,rz],ribMidBack:[0,ribMidY,-rz*.86],ribTopL:[-ux,ribTopY,0],ribTopR:[ux,ribTopY,0],ribTopFront:[0,ribTopY,rz*.64],ribTopBack:[0,ribTopY,-rz*.62],sternumTop:[0,ribTopY-A.ribCageHeight*.08,rz*.67],sternumBottom:[0,ribBottomY+A.ribCageHeight*.18,rz*.80],
scapulaMedialL:[-ux*.63,shoulderY-A.scapulaHeight*.28,-A.scapulaDepth],scapulaMedialR:[ux*.63,shoulderY-A.scapulaHeight*.28,-A.scapulaDepth],scapulaInferiorL:[-ux*.78,shoulderY-A.scapulaHeight,-A.scapulaDepth*.82],scapulaInferiorR:[ux*.78,shoulderY-A.scapulaHeight,-A.scapulaDepth*.82],glenoidL:[-shoulderX,shoulderY,-.006],glenoidR:[shoulderX,shoulderY,-.006],clavicleMedialL:[-.018,ribTopY-.008,rz*.48],clavicleMedialR:[.018,ribTopY-.008,rz*.48],clavicleL:[-A.clavicle*.72,shoulderY+.012,.018],clavicleR:[A.clavicle*.72,shoulderY+.012,.018],shoulderL:[-shoulderX,shoulderY,0],shoulderR:[shoulderX,shoulderY,0],
elbowL:[-shoulderX-.025,elbowY,.008],elbowR:[shoulderX+.025,elbowY,.008],wristL:[-shoulderX-.035,wristY,.014],wristR:[shoulderX+.035,wristY,.014],handL:[-shoulderX-.037,handY,.018],handR:[shoulderX+.037,handY,.018],fingerL:[-shoulderX-.039,fingerY,.020],fingerR:[shoulderX+.039,fingerY,.020],kneeL:[-hipX*.90,kneeY,.012],kneeR:[hipX*.90,kneeY,.012],ankleL:[-hipX*.86,ankleY,0],ankleR:[hipX*.86,ankleY,0],heelL:[-hipX*.86,H*.022,-A.foot*.22],heelR:[hipX*.86,H*.022,-A.foot*.22],toeL:[-hipX*.86,H*.020,A.foot*.78],toeR:[hipX*.86,H*.020,A.foot*.78]}}
const P=buildLandmarks();
for(const [name,xyz] of Object.entries(P)){let r=A.stature*.012,mat=MAT_JOINT;if(/pelvis|sacrum|lumbar|thoracic|neck|head/.test(name))mat=MAT_CORE;if(/rib|sternum|scapula|clavicle/.test(name))mat=MAT_FRAME;if(/toe|heel|finger|crown/.test(name))mat=MAT_END;if(name==='head')r=A.headHeight*.42;else if(/hip|shoulder|glenoid/.test(name))r=A.stature*.018;else if(/knee|elbow/.test(name))r=A.stature*.016;else if(/ankle|wrist/.test(name))r=A.stature*.013;else if(/pelvisCenter|sacrum/.test(name))r=A.stature*.020;else if(/rib|scapula|clavicle|sternum/.test(name))r=A.stature*.009;else if(/toe|heel|finger|crown/.test(name))r=A.stature*.010;addNode(name,xyz,r,mat)}

[['pelvisTopL','pelvisFrontL'],['pelvisFrontL','pelvisBottomL'],['pelvisBottomL','pelvisBackL'],['pelvisBackL','pelvisTopL'],['pelvisTopR','pelvisFrontR'],['pelvisFrontR','pelvisBottomR'],['pelvisBottomR','pelvisBackR'],['pelvisBackR','pelvisTopR'],['pelvisTopL','pelvisTopR'],['pelvisBottomL','pelvisBottomR'],['pelvisBackL','sacrum'],['pelvisBackR','sacrum'],['pelvisCenter','hipL'],['pelvisCenter','hipR']].forEach((x,i)=>addBone('pelvisFrame'+i,x[0],x[1],.011,MAT_FRAME));
[['sacrum','lumbarLow'],['lumbarLow','lumbarHigh'],['lumbarHigh','thoracicLow'],['thoracicLow','thoracicMid'],['thoracicMid','thoracicHigh'],['thoracicHigh','neckBase'],['neckBase','neckTop'],['neckTop','head'],['head','crown']].forEach((x,i)=>addBone('spine'+i,x[0],x[1],i<6?.015:.012));
for(const level of ['Low','Mid','Top']){const l='rib'+level+'L',r='rib'+level+'R',f='rib'+level+'Front',b='rib'+level+'Back';addBone('rib'+level+'LF',l,f,.008,MAT_FRAME);addBone('rib'+level+'RF',r,f,.008,MAT_FRAME);addBone('rib'+level+'LB',l,b,.008,MAT_FRAME);addBone('rib'+level+'RB',r,b,.008,MAT_FRAME)}
addBone('sternum','sternumTop','sternumBottom',.010,MAT_FRAME);addBone('thoraxFrontTop','sternumTop','ribTopFront',.007,MAT_FRAME);addBone('thoraxFrontBottom','sternumBottom','ribLowFront',.007,MAT_FRAME);addBone('thoraxBackLow','thoracicLow','ribLowBack',.007,MAT_FRAME);addBone('thoraxBackMid','thoracicMid','ribMidBack',.007,MAT_FRAME);addBone('thoraxBackTop','thoracicHigh','ribTopBack',.007,MAT_FRAME);
for(const s of ['L','R']){addBone('clavicleMedial'+s,'sternumTop','clavicleMedial'+s,.010,MAT_FRAME);addBone('clavicle'+s,'clavicleMedial'+s,'clavicle'+s,.011,MAT_BONE);addBone('clavicleDistal'+s,'clavicle'+s,'glenoid'+s,.010,MAT_BONE);addBone('scapulaUpper'+s,'scapulaMedial'+s,'glenoid'+s,.009,MAT_FRAME);addBone('scapulaLowerA'+s,'scapulaMedial'+s,'scapulaInferior'+s,.009,MAT_FRAME);addBone('scapulaLowerB'+s,'scapulaInferior'+s,'glenoid'+s,.009,MAT_FRAME);addBone('glenoidToShoulder'+s,'glenoid'+s,'shoulder'+s,.009,MAT_FRAME);addBone('femur'+s,'hip'+s,'knee'+s,.020,MAT_BONE);addBone('tibia'+s,'knee'+s,'ankle'+s,.017,MAT_BONE);addBone('foot'+s,'ankle'+s,'toe'+s,.016,MAT_BONE);addBone('heel'+s,'ankle'+s,'heel'+s,.012,MAT_BONE);addBone('humerus'+s,'shoulder'+s,'elbow'+s,.017,MAT_BONE);addBone('radius'+s,'elbow'+s,'wrist'+s,.014,MAT_BONE);addBone('palm'+s,'wrist'+s,'hand'+s,.014,MAT_BONE);addBone('handEnd'+s,'hand'+s,'finger'+s,.011,MAT_BONE)}

const base={};for(const [n,m] of Object.entries(nodes))base[n]=m.position.clone();
function resetPose(){for(const [n,p] of Object.entries(base))nodes[n].position.copy(p)}
function pose(name){resetPose();if(name==='relaxed'){const dx=.018;for(const n of ['pelvisCenter','sacrum','pelvisTopL','pelvisTopR','pelvisFrontL','pelvisFrontR','pelvisBackL','pelvisBackR','pelvisBottomL','pelvisBottomR'])nodes[n].position.x+=dx;nodes.lumbarLow.position.x+=dx*.8;nodes.lumbarHigh.position.x+=dx*.5;nodes.thoracicLow.position.x+=dx*.25;nodes.shoulderL.position.y-=.012;nodes.glenoidL.position.y-=.010;nodes.scapulaMedialL.position.y-=.008;nodes.elbowL.position.z+=.050;nodes.wristL.position.z+=.075;nodes.handL.position.z+=.080;nodes.fingerL.position.z+=.085;nodes.kneeL.position.x-=.010;nodes.ankleL.position.x-=.015}if(name==='step'){nodes.hipL.position.z+=.030;nodes.kneeL.position.z+=.120;nodes.ankleL.position.z+=.190;nodes.heelL.position.z+=.190;nodes.toeL.position.z+=.205;nodes.hipR.position.z-=.025;nodes.kneeR.position.z-=.090;nodes.ankleR.position.z-=.135;nodes.heelR.position.z-=.135;nodes.toeR.position.z-=.115;nodes.elbowL.position.z-=.055;nodes.wristL.position.z-=.105;nodes.handL.position.z-=.120;nodes.fingerL.position.z-=.130;nodes.elbowR.position.z+=.055;nodes.wristR.position.z+=.105;nodes.handR.position.z+=.120;nodes.fingerR.position.z+=.130}syncBones();updateLabels()}
document.querySelectorAll('[data-pose]').forEach(btn=>btn.addEventListener('click',()=>{pose(btn.dataset.pose);document.querySelectorAll('[data-pose]').forEach(b=>b.classList.toggle('active',b===btn))}));

const diagnosticNodes=['crown','head','neckBase','shoulderL','elbowL','wristL','hipL','kneeL','ankleL','toeL','pelvisCenter','thoracicMid','sternumTop','glenoidL'];
const labelMap={crown:'crown',head:'head',neckBase:'C7/neck',shoulderL:'shoulder',elbowL:'elbow',wristL:'wrist',hipL:'hip center',kneeL:'knee',ankleL:'ankle',toeL:'toe',pelvisCenter:'pelvis',thoracicMid:'thorax',sternumTop:'sternum',glenoidL:'glenoid'};
const labelEls={};for(const n of diagnosticNodes){const d=document.createElement('div');d.className='joint-label';d.textContent=labelMap[n];labelsEl.appendChild(d);labelEls[n]=d}
function updateLabels(){for(const n of diagnosticNodes){const v=nodes[n].position.clone().project(camera);const visible=v.z<1;const x=(v.x*.5+.5)*innerWidth,y=(-v.y*.5+.5)*innerHeight;const el=labelEls[n];el.style.display=visible?'block':'none';el.style.left=x+'px';el.style.top=y+'px'}}

const mm=v=>Math.round(v*1000);
function actualLen(a,b){return mm(nodes[a].position.distanceTo(nodes[b].position))}
function updateMetrics(){const rows=[['Рост',mm(A.stature)+' мм'],['Femur (эталон)',mm(A.femur)+' мм'],['Femur rig',actualLen('hipL','kneeL')+' мм'],['Tibia (эталон)',mm(A.tibia)+' мм'],['Tibia rig',actualLen('kneeL','ankleL')+' мм'],['Humerus (эталон)',mm(A.humerus)+' мм'],['Humerus rig',actualLen('shoulderL','elbowL')+' мм'],['Radius (эталон)',mm(A.radius)+' мм'],['Forearm rig',actualLen('elbowL','wristL')+' мм'],['Clavicle (эталон)',mm(A.clavicle)+' мм'],['Foot target',mm(A.foot)+' мм'],['Femur/Tibia',(A.femur/A.tibia).toFixed(3)]];metricsEl.innerHTML='<b>Фактические размеры</b>'+rows.map(([a,b])=>`<div class="metric-row"><span>${a}</span><span>${b}</span></div>`).join('')}
updateMetrics();

function setView(view){controls.enableRotate=view==='free';const d=3.3;const target=new THREE.Vector3(0,.88,0);controls.target.copy(target);if(view==='front')camera.position.set(0,.9,d);if(view==='back')camera.position.set(0,.9,-d);if(view==='side')camera.position.set(d,.9,0);if(view==='threequarter')camera.position.set(2.35,1.15,2.7);camera.lookAt(target);controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));updateLabels()}
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));

syncBones();pose('neutral');setView('front');
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);updateLabels()}addEventListener('resize',resize,{passive:true});
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);updateLabels()});

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { scaledAnthropometry } from './anthropometry-v01.js';

const A = scaledAnthropometry(1.75);
const container = document.getElementById('app');
const metricsEl = document.getElementById('metrics');
const labelsEl = document.getElementById('labels');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
const camera = new THREE.PerspectiveCamera(31, innerWidth/innerHeight, .01, 100);
const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight); renderer.outputColorSpace=THREE.SRGBColorSpace; container.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.07; controls.enablePan=false; controls.target.set(0,.9,0); controls.minDistance=1.7; controls.maxDistance=8;
scene.add(new THREE.HemisphereLight(0xdde8ff,0x1d2330,2.2)); const key=new THREE.DirectionalLight(0xffffff,2.2); key.position.set(4,6,5); scene.add(key);
const ground=new THREE.Mesh(new THREE.CircleGeometry(2.25,64),new THREE.MeshStandardMaterial({color:0x151923,roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
const grid=new THREE.GridHelper(4,40,0x32405a,0x202735);grid.position.y=.002;scene.add(grid);

const root=new THREE.Group();scene.add(root);
const MAT_BONE=new THREE.MeshStandardMaterial({color:0xd7dbe7,roughness:.68});
const MAT_JOINT=new THREE.MeshStandardMaterial({color:0xf0a65b,roughness:.58});
const MAT_END=new THREE.MeshStandardMaterial({color:0x7cc7ff,roughness:.52});
const MAT_CORE=new THREE.MeshStandardMaterial({color:0xb8a8ff,roughness:.58});
const MAT_FRAME=new THREE.MeshStandardMaterial({color:0x8a95ae,roughness:.72});
const nodes={},bones=[];
function node(name,p,r=.022,mat=MAT_JOINT){const m=new THREE.Mesh(new THREE.SphereGeometry(r,18,12),mat);m.position.set(...p);m.name=name;root.add(m);nodes[name]=m}
function bone(name,a,b,r=.014,mat=MAT_BONE){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,12),mat);root.add(m);bones.push({mesh:m,a,b,name})}
function sync(){for(const b of bones){const a=nodes[b.a].position,c=nodes[b.b].position,mid=a.clone().add(c).multiplyScalar(.5),len=a.distanceTo(c);b.mesh.position.copy(mid);b.mesh.scale.set(1,len,1);b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),c.clone().sub(a).normalize())}}

function P(){
 const H=A.stature, ankleY=A.ankleJointHeight, kneeY=ankleY+A.tibia, hipY=kneeY+A.femur;
 const pelvisCY=hipY+A.pelvisHeight*.35, pelvisTop=pelvisCY+A.pelvisHeight*.42, pelvisBottom=pelvisCY-A.pelvisHeight*.42;
 const ribBottom=pelvisTop+H*.072, ribTop=ribBottom+A.ribCageHeight, ribMid=(ribBottom+ribTop)/2;
 const neckBaseY=ribTop+H*.018, neckTopY=neckBaseY+A.neckLength, crownY=H, headY=crownY-A.headHeight*.5;
 const shoulderY=ribTop-A.scapulaHeight*.16, elbowY=shoulderY-A.humerus, wristY=elbowY-A.radius, handY=wristY-A.hand*.48, fingerY=wristY-A.hand;
 const px=A.pelvisWidth*.5,pz=A.pelvisDepth*.5,rx=A.ribCageWidth*.5,rz=A.ribCageDepth*.5,ux=A.upperThoraxWidth*.5,hx=A.hipCenterHalfWidth,sx=A.shoulderJointHalfWidth;
 // Sagittal baseline: pelvis tilted forward, lumbar lordosis forward, thoracic kyphosis backward, cervical return forward.
 const pelvisTilt=THREE.MathUtils.degToRad(11);
 const frontRise=Math.sin(pelvisTilt)*pz, frontShift=Math.cos(pelvisTilt)*pz;
 return {
  pelvisCenter:[0,pelvisCY,0.010], pelvisTopL:[-px,pelvisTop,-.025], pelvisTopR:[px,pelvisTop,-.025],
  pelvisFrontL:[-px*.78,pelvisCY+frontRise,frontShift],pelvisFrontR:[px*.78,pelvisCY+frontRise,frontShift],
  pelvisBackL:[-px*.72,pelvisCY-frontRise,-frontShift],pelvisBackR:[px*.72,pelvisCY-frontRise,-frontShift],
  pelvisBottomL:[-px*.55,pelvisBottom,.018],pelvisBottomR:[px*.55,pelvisBottom,.018], sacrum:[0,pelvisCY+A.pelvisHeight*.18,-pz*.56],
  hipL:[-hx,hipY,.028],hipR:[hx,hipY,.028],
  lumbarLow:[0,pelvisTop+H*.035,.035], lumbarHigh:[0,ribBottom-H*.025,.050], thoracicLow:[0,ribBottom+A.ribCageHeight*.22,.020], thoracicMid:[0,ribMid,-.035], thoracicHigh:[0,ribTop-A.ribCageHeight*.18,-.020], neckBase:[0,neckBaseY,.005], neckTop:[0,neckTopY,.025], head:[0,headY,.030], crown:[0,crownY,.030],
  ribLowL:[-rx*.86,ribBottom,.010],ribLowR:[rx*.86,ribBottom,.010],ribLowFront:[0,ribBottom,rz*.83],ribLowBack:[0,ribBottom,-rz*.62],
  ribMidL:[-rx,ribMid,-.010],ribMidR:[rx,ribMid,-.010],ribMidFront:[0,ribMid,rz*.92],ribMidBack:[0,ribMid,-rz*.86],
  ribTopL:[-ux,ribTop,-.005],ribTopR:[ux,ribTop,-.005],ribTopFront:[0,ribTop,rz*.58],ribTopBack:[0,ribTop,-rz*.58], sternumTop:[0,ribTop-A.ribCageHeight*.08,rz*.62],sternumBottom:[0,ribBottom+A.ribCageHeight*.18,rz*.77],
  scapulaMedialL:[-ux*.63,shoulderY-A.scapulaHeight*.28,-A.scapulaDepth],scapulaMedialR:[ux*.63,shoulderY-A.scapulaHeight*.28,-A.scapulaDepth],
  scapulaInferiorL:[-ux*.78,shoulderY-A.scapulaHeight,-A.scapulaDepth*.82],scapulaInferiorR:[ux*.78,shoulderY-A.scapulaHeight,-A.scapulaDepth*.82],
  glenoidL:[-sx,shoulderY,-.004],glenoidR:[sx,shoulderY,-.004],clavicleMedialL:[-.018,ribTop-.008,rz*.44],clavicleMedialR:[.018,ribTop-.008,rz*.44],clavicleL:[-A.clavicle*.72,shoulderY+.012,.016],clavicleR:[A.clavicle*.72,shoulderY+.012,.016], shoulderL:[-sx,shoulderY,.004],shoulderR:[sx,shoulderY,.004],
  elbowL:[-sx-.025,elbowY,.010],elbowR:[sx+.025,elbowY,.010],wristL:[-sx-.035,wristY,.018],wristR:[sx+.035,wristY,.018],handL:[-sx-.037,handY,.022],handR:[sx+.037,handY,.022],fingerL:[-sx-.039,fingerY,.026],fingerR:[sx+.039,fingerY,.026],
  kneeL:[-hx*.90,kneeY,.018],kneeR:[hx*.90,kneeY,.018],ankleL:[-hx*.86,ankleY,0],ankleR:[hx*.86,ankleY,0],
  heelL:[-hx*.86,H*.022,-A.foot*.23],heelR:[hx*.86,H*.022,-A.foot*.23], midFootL:[-hx*.86,H*.035,A.foot*.25],midFootR:[hx*.86,H*.035,A.foot*.25], toeL:[-hx*.86,H*.020,A.foot*.77],toeR:[hx*.86,H*.020,A.foot*.77]
 };
}
const p=P();
for(const [n,v] of Object.entries(p)){let r=A.stature*.012,mat=MAT_JOINT;if(/pelvis|sacrum|lumbar|thoracic|neck|head/.test(n))mat=MAT_CORE;if(/rib|sternum|scapula|clavicle/.test(n))mat=MAT_FRAME;if(/toe|heel|finger|crown|midFoot/.test(n))mat=MAT_END;if(n==='head')r=A.headHeight*.42;else if(/hip|shoulder|glenoid/.test(n))r=A.stature*.018;else if(/knee|elbow/.test(n))r=A.stature*.016;else if(/ankle|wrist/.test(n))r=A.stature*.013;else if(/pelvisCenter|sacrum/.test(n))r=A.stature*.020;else if(/rib|scapula|clavicle|sternum/.test(n))r=A.stature*.009;else if(/toe|heel|finger|crown|midFoot/.test(n))r=A.stature*.010;node(n,v,r,mat)}

[['pelvisTopL','pelvisFrontL'],['pelvisFrontL','pelvisBottomL'],['pelvisBottomL','pelvisBackL'],['pelvisBackL','pelvisTopL'],['pelvisTopR','pelvisFrontR'],['pelvisFrontR','pelvisBottomR'],['pelvisBottomR','pelvisBackR'],['pelvisBackR','pelvisTopR'],['pelvisTopL','pelvisTopR'],['pelvisBottomL','pelvisBottomR'],['pelvisBackL','sacrum'],['pelvisBackR','sacrum'],['pelvisCenter','hipL'],['pelvisCenter','hipR']].forEach((x,i)=>bone('pelvis'+i,x[0],x[1],.011,MAT_FRAME));
[['sacrum','lumbarLow'],['lumbarLow','lumbarHigh'],['lumbarHigh','thoracicLow'],['thoracicLow','thoracicMid'],['thoracicMid','thoracicHigh'],['thoracicHigh','neckBase'],['neckBase','neckTop'],['neckTop','head'],['head','crown']].forEach((x,i)=>bone('spine'+i,x[0],x[1],i<6?.015:.012));
for(const level of ['Low','Mid','Top']){const l='rib'+level+'L',r='rib'+level+'R',f='rib'+level+'Front',b='rib'+level+'Back';bone('r1'+level,l,f,.008,MAT_FRAME);bone('r2'+level,r,f,.008,MAT_FRAME);bone('r3'+level,l,b,.008,MAT_FRAME);bone('r4'+level,r,b,.008,MAT_FRAME)}
bone('sternum','sternumTop','sternumBottom',.010,MAT_FRAME);bone('tf1','sternumTop','ribTopFront',.007,MAT_FRAME);bone('tf2','sternumBottom','ribLowFront',.007,MAT_FRAME);bone('tb1','thoracicLow','ribLowBack',.007,MAT_FRAME);bone('tb2','thoracicMid','ribMidBack',.007,MAT_FRAME);bone('tb3','thoracicHigh','ribTopBack',.007,MAT_FRAME);
for(const s of ['L','R']){bone('cm'+s,'sternumTop','clavicleMedial'+s,.010,MAT_FRAME);bone('cl'+s,'clavicleMedial'+s,'clavicle'+s,.011);bone('cd'+s,'clavicle'+s,'glenoid'+s,.010);bone('su'+s,'scapulaMedial'+s,'glenoid'+s,.009,MAT_FRAME);bone('sl1'+s,'scapulaMedial'+s,'scapulaInferior'+s,.009,MAT_FRAME);bone('sl2'+s,'scapulaInferior'+s,'glenoid'+s,.009,MAT_FRAME);bone('gs'+s,'glenoid'+s,'shoulder'+s,.009,MAT_FRAME);bone('femur'+s,'hip'+s,'knee'+s,.020);bone('tibia'+s,'knee'+s,'ankle'+s,.017);bone('heel'+s,'ankle'+s,'heel'+s,.012);bone('footA'+s,'ankle'+s,'midFoot'+s,.015);bone('footB'+s,'midFoot'+s,'toe'+s,.014);bone('hum'+s,'shoulder'+s,'elbow'+s,.017);bone('rad'+s,'elbow'+s,'wrist'+s,.014);bone('palm'+s,'wrist'+s,'hand'+s,.014);bone('hand2'+s,'hand'+s,'finger'+s,.011)}
sync();

const labels=['crown','head','neckBase','thoracicMid','lumbarHigh','pelvisCenter','hipL','kneeL','ankleL','heelL','midFootL','toeL','shoulderL','elbowL','wristL'];
const labelEls={};for(const n of labels){const d=document.createElement('div');d.className='joint-label';d.textContent=n;labelsEl.appendChild(d);labelEls[n]=d}
let labelsVisible=false;document.body.classList.add('labels-hidden');
function updateLabels(){for(const n of labels){const v=nodes[n].position.clone().project(camera);const x=(v.x*.5+.5)*innerWidth,y=(-v.y*.5+.5)*innerHeight;labelEls[n].style.left=x+'px';labelEls[n].style.top=y+'px'}}
function mm(v){return Math.round(v*1000)}
const dist=(a,b)=>nodes[a].position.distanceTo(nodes[b].position);
metricsEl.innerHTML=`<h3>Диагностика v0.3</h3>
<div class="row"><span>Рост</span><span>${mm(A.stature)} мм</span></div>
<div class="row"><span>Femur</span><span>${mm(dist('hipL','kneeL'))} мм</span></div>
<div class="row"><span>Tibia</span><span>${mm(dist('kneeL','ankleL'))} мм</span></div>
<div class="row"><span>Humerus</span><span>${mm(dist('shoulderL','elbowL'))} мм</span></div>
<div class="row"><span>Radius</span><span>${mm(dist('elbowL','wristL'))} мм</span></div>
<div class="row"><span>Pelvis tilt</span><span>11°</span></div>
<div class="row"><span>Lumbar z</span><span>${mm(nodes.lumbarHigh.position.z)} мм</span></div>
<div class="row"><span>Thoracic z</span><span>${mm(nodes.thoracicMid.position.z)} мм</span></div>`;

function setView(v){const t=new THREE.Vector3(0,.9,0);controls.target.copy(t);if(v==='front')camera.position.set(0,.95,4.6);if(v==='back')camera.position.set(0,.95,-4.6);if(v==='side')camera.position.set(4.6,.95,0);if(v==='threequarter')camera.position.set(3.1,1.25,3.4);camera.lookAt(t);controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));updateLabels()}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelector('[data-labels]').addEventListener('click',e=>{labelsVisible=!labelsVisible;document.body.classList.toggle('labels-hidden',!labelsVisible);e.currentTarget.classList.toggle('active',labelsVisible)});
setView('threequarter');
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);updateLabels()}addEventListener('resize',resize,{passive:true});
renderer.setAnimationLoop(()=>{controls.update();updateLabels();renderer.render(scene,camera)});

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { scaledAnthropometry } from './anthropometry-v01.js';

/** Skeleton v1.5 — anatomically corrected geometry baseline. */
export const SKELETON_CONTRACT_VERSION=1;
export const SKELETON_VERSION='1.5';

const stature=1.75,A=scaledAnthropometry(stature),H=A.stature;
const app=document.getElementById('app'),metrics=document.getElementById('metrics'),labelsRoot=document.getElementById('labels');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b0d12);
const camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.01,100);window.__SKELETON_CAMERA__=camera;
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));app.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.target.set(0,.9,0);
scene.add(new THREE.HemisphereLight(0xdde8ff,0x1d2330,2.2));const dl=new THREE.DirectionalLight(0xffffff,2);dl.position.set(4,6,5);scene.add(dl);
const grid=new THREE.GridHelper(4,40,0x32405a,0x202735);grid.position.y=.002;scene.add(grid);

const MAT={bone:new THREE.MeshStandardMaterial({color:0xd7dbe7}),joint:new THREE.MeshStandardMaterial({color:0xf0a65b}),frame:new THREE.MeshStandardMaterial({color:0x8a95ae}),vert:new THREE.MeshStandardMaterial({color:0xb8a8ff}),cart:new THREE.MeshStandardMaterial({color:0x8ed3c7}),end:new THREE.MeshStandardMaterial({color:0x7cc7ff})};
const root=new THREE.Group();root.name='rig_root';root.userData.rigVersion=SKELETON_VERSION;scene.add(root);
const joints=new Map(),named=new Map();
function joint(name,parent,local){const g=new THREE.Group();g.name=`joint_${name}`;g.userData.semanticName=name;g.userData.kind='skeleton-joint';g.position.copy(local);parent.add(g);joints.set(name,g);return g}
function node(parent,name,local,r=.018,mat=MAT.joint){const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),mat);m.name=name;m.position.copy(local);parent.add(m);named.set(name,m);return m}
function link(parent,name,a,b,r=.011,mat=MAT.bone){const v=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,10),mat);m.name=name;m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(1,v.length(),1);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize());parent.add(m);return m}
function worldLocal(parent,p){root.updateMatrixWorld(true);parent.updateMatrixWorld(true);return parent.worldToLocal(p.clone())}
function wn(parent,name,x,y,z,r=.018,mat=MAT.joint){return node(parent,name,worldLocal(parent,new THREE.Vector3(x,y,z)),r,mat)}
function wb(parent,name,A0,B0,r=.011,mat=MAT.bone){return link(parent,name,worldLocal(parent,A0),worldLocal(parent,B0),r,mat)}
function smooth(a,b,t){t=t*t*(3-2*t);return a+(b-a)*t}

const ankleY=A.ankleJointHeight,kneeY=ankleY+A.tibia,hipY=kneeY+A.femur,hx=A.hipCenterHalfWidth,sx=A.shoulderJointHalfWidth;
const s1=hipY+.125,l1=s1+.18,t12=l1+.022,skY=H-A.headHeight*.50,headPivotY=skY-.055;
// C1 must meet the skull base instead of entering the cranial vault. T1 is derived
// from the configured neck length, keeping the complete T1→C1 chord measurable.
const c1y=headPivotY+.004,c2y=c1y-.013,t1=c1y-A.neckLength,c7y=t1+.012;

// Pelvis: root of both legs and the mobile vertebral column.
const pelvis=joint('pelvis_center',root,new THREE.Vector3(0,hipY+.05,0));
const px=A.pelvisWidth*.5,pz=A.pelvisDepth*.5;
for(const side of [-1,1]){const s=side<0?'L':'R',g=side;const P={ASIS:new THREE.Vector3(g*px*.90,s1+.047,pz*.64),PSIS:new THREE.Vector3(g*px*.78,s1+.041,-pz*.68),crestA:new THREE.Vector3(g*px*1.06,s1+.088,pz*.12),crestP:new THREE.Vector3(g*px,s1+.086,-pz*.34),acet:new THREE.Vector3(g*hx,hipY+.015,.012),pub:new THREE.Vector3(g*.040,hipY-.022,pz*.52),isch:new THREE.Vector3(g*.082,hipY-.098,-.025),ramus:new THREE.Vector3(g*.060,hipY-.060,pz*.24)};for(const [k,p] of Object.entries(P))wn(pelvis,k+s,p.x,p.y,p.z,k==='acet'?.018:k==='isch'?.012:.011,MAT.frame);for(const [a,b] of [['PSIS','crestP'],['crestP','crestA'],['crestA','ASIS'],['ASIS','acet'],['acet','isch'],['isch','ramus'],['ramus','pub'],['pub','acet']])wb(pelvis,`${a}${s}_${b}${s}`,P[a],P[b],.008,MAT.frame)}
wb(pelvis,'pubL_pubR',new THREE.Vector3(-.040,hipY-.022,pz*.52),new THREE.Vector3(.040,hipY-.022,pz*.52),.008,MAT.frame);
// Posterior pelvic ring: sacral body/alae, sacroiliac contacts and coccyx.
// These are geometry nodes now; the SI joints stay neutral until the mechanics pass.
const sacTop=new THREE.Vector3(0,s1+.018,-.020),sacMid=new THREE.Vector3(0,hipY+.025,-.034),sacApex=new THREE.Vector3(0,hipY-.055,-.025),coccyx=new THREE.Vector3(0,hipY-.112,-.004);
for(const [n,p,r] of [['sacrumTop',sacTop,.018],['sacrumMid',sacMid,.017],['sacrumApex',sacApex,.013],['coccyx',coccyx,.010]])wn(pelvis,n,...p.toArray(),r,MAT.frame);
wb(pelvis,'sacrum_top_mid',sacTop,sacMid,.015,MAT.frame);wb(pelvis,'sacrum_mid_apex',sacMid,sacApex,.013,MAT.frame);wb(pelvis,'sacrum_coccyx',sacApex,coccyx,.008,MAT.frame);
for(const side of ['L','R']){const g=side==='L'?-1:1,siW=new THREE.Vector3(g*px*.78,s1+.041,-pz*.68),alaW=new THREE.Vector3(g*.052,s1+.006,-.030),si=joint(`si_${side}`,pelvis,worldLocal(pelvis,siW));node(si,`SI_${side}`,new THREE.Vector3(),.011,MAT.joint);wn(pelvis,`sacralAla_${side}`,...alaW.toArray(),.013,MAT.frame);wb(pelvis,`sacralAla_body_${side}`,alaW,sacMid,.010,MAT.frame);wb(pelvis,`SI_sacrum_${side}`,siW,alaW,.008,MAT.cart);}

// Build a real serial vertebral chain. Each vertebra is its own joint and carries its own visual body.
const spineWorld={S1:new THREE.Vector3(0,s1,-.010)};
['L5','L4','L3','L2','L1'].forEach((k,i)=>{const t=(i+1)/5,z=i<2?smooth(-.010,.006,(i+1)/2):smooth(.006,-.005,(i-1)/3);spineWorld[k]=new THREE.Vector3(0,s1+(l1-s1)*t,z)});
Array.from({length:12},(_,i)=>'T'+(12-i)).forEach((k,i)=>{const t=(i+1)/12,z=t<=.5?smooth(-.005,-.050,t/.5):smooth(-.050,-.020,(t-.5)/.5);spineWorld[k]=new THREE.Vector3(0,t12+(t1-t12)*t,z)});
['C7','C6','C5','C4','C3'].forEach((k,i)=>{const t=i/4;spineWorld[k]=new THREE.Vector3(0,c7y+(c2y-.012-c7y)*t,smooth(-.020,-.012,t))});
spineWorld.C2=new THREE.Vector3(0,c2y,-.008);spineWorld.C1=new THREE.Vector3(0,c1y,-.004);
const order=['S1','L5','L4','L3','L2','L1','T12','T11','T10','T9','T8','T7','T6','T5','T4','T3','T2','T1','C7','C6','C5','C4','C3','C2','C1'];
const jointName={S1:'spine_S1',L5:'spine_L5',L4:'spine_L4',L3:'spine_L3',L2:'spine_L2',L1:'spine_L1',T12:'spine_T12',T11:'spine_T11',T10:'spine_T10',T9:'spine_T9',T8:'spine_T8',T7:'spine_T7',T6:'spine_T6',T5:'spine_T5',T4:'spine_T4',T3:'spine_T3',T2:'spine_T2',T1:'spine_T1',C7:'neck_C7',C6:'neck_C6',C5:'neck_C5',C4:'neck_C4',C3:'neck_C3',C2:'neck_C2',C1:'neck_C1'};
const vj={};let parent=pelvis,prevWorld=new THREE.Vector3(0,hipY+.05,0);
for(const k of order){const g=joint(jointName[k],parent,spineWorld[k].clone().sub(prevWorld));vj[k]=g;node(g,k,new THREE.Vector3(),k==='S1'?.021:k[0]==='L'?.018:k[0]==='T'?.015:k==='C1'?.017:k==='C2'?.016:.012,MAT.vert);if(parent!==pelvis)link(parent,`${order[order.indexOf(k)-1]}_${k}`,new THREE.Vector3(),spineWorld[k].clone().sub(prevWorld),.008,MAT.vert);parent=g;prevWorld=spineWorld[k]}
node(vj.C2,'dens',worldLocal(vj.C2,new THREE.Vector3(0,c2y+.024,-.002)),.007,MAT.vert);wb(vj.C2,'C2_dens',spineWorld.C2,new THREE.Vector3(0,c2y+.024,-.002),.005,MAT.vert);

// Thoracic ribs: each pair belongs to its own thoracic vertebra.
const widths=[.078,.101,.125,.142,.154,.162,.166,.163,.155,.143,.118,.097],fronts=[.058,.070,.086,.100,.112,.121,.127,.125,.118,.108,.090,.074],backs=[.042,.050,.058,.065,.071,.075,.078,.079,.078,.074,.066,.058],drops=[.004,.009,.018,.029,.041,.054,.067,.080,.093,.106,.119,.132],ribVs=['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
for(let i=0;i<12;i++){const key=ribVs[i],p=spineWorld[key],rg=vj[key];for(const s of['L','R']){const sg=s==='L'?-1:1,k=`r${i+1}${s}`,P=new THREE.Vector3(sg*widths[i]*.36,p.y-.002,p.z-backs[i]),PL=new THREE.Vector3(sg*widths[i]*.78,p.y-drops[i]*.20,p.z-backs[i]*.72),L=new THREE.Vector3(sg*widths[i],p.y-drops[i]*.46,p.z+fronts[i]*.18),AL=new THREE.Vector3(sg*widths[i]*.86,p.y-drops[i]*.74,p.z+fronts[i]*.66),AA=new THREE.Vector3(sg*widths[i]*.64,p.y-drops[i],p.z+fronts[i]);for(const [n,q] of [['P',P],['PL',PL],['L',L],['AL',AL],['A',AA]])wn(rg,k+n,...q.toArray(),.006,MAT.frame);for(const [n,a,b] of [['root',p,P],['post',P,PL],['lat',PL,L],['antlat',L,AL],['ant',AL,AA]])wb(rg,`${k}_${n}`,a,b,.0055,MAT.frame)}}

// Sternum is centered on T7 so it follows the middle thorax while ribs deform around it.
const t7g=vj.T7,sternY=spineWorld.T3.y-.012,man=new THREE.Vector3(0,sternY,spineWorld.T3.z+.095),stern=new THREE.Vector3(0,spineWorld.T7.y-.006,spineWorld.T7.z+.135),xiph=new THREE.Vector3(0,spineWorld.T10.y-.025,spineWorld.T10.z+.118);
const jugular=new THREE.Vector3(0,man.y+.030,man.z-.006);
wn(t7g,'jugularNotch',...jugular.toArray(),.008,MAT.frame);wn(t7g,'manubrium',...man.toArray(),.012,MAT.frame);wn(t7g,'sternumBody',...stern.toArray(),.011,MAT.frame);wn(t7g,'xiphoid',...xiph.toArray(),.009,MAT.frame);wb(t7g,'jugular_manubrium',jugular,man,.008,MAT.frame);wb(t7g,'manubrium_sternumBody',man,stern,.009,MAT.frame);wb(t7g,'sternumBody_xiphoid',stern,xiph,.007,MAT.frame);
// Costal cartilage closes ribs 1–7 onto the sternum. Ribs 8–10 join the
// shared costal margin; 11–12 remain floating as in the anatomical cage.
for(let i=0;i<10;i++){const key=ribVs[i],p=spineWorld[key],rg=vj[key];for(const side of ['L','R']){const sg=side==='L'?-1:1,aa=new THREE.Vector3(sg*widths[i]*.64,p.y-drops[i],p.z+fronts[i]);let target;if(i<7){const t=i/6;target=new THREE.Vector3(sg*.014,smooth(man.y,stern.y,t),smooth(man.z,stern.z,t));}else{const t=(i-7)/2;target=new THREE.Vector3(sg*smooth(.040,.070,t),smooth(stern.y,xiph.y,t),smooth(stern.z,xiph.z,t));}wb(rg,`costal_cartilage_r${i+1}${side}`,aa,target,.005,MAT.cart);}}

// Native shoulder complex: thorax -> sternoclavicular -> clavicle -> acromioclavicular -> scapula/ST -> glenohumeral.
const shoulderHost=vj.T3,sy=spineWorld.T3.y+.01;
function buildShoulderGirdle(side){
 const g=side==='L'?-1:1;
 const scW=new THREE.Vector3(g*.018,sy+.012,.035),clavicleDz=.047,clavicleDx=Math.sqrt(A.clavicle*A.clavicle-clavicleDz*clavicleDz),acW=new THREE.Vector3(g*(.018+clavicleDx),sy+.012,.035-clavicleDz),ghW=new THREE.Vector3(g*sx,sy,0);
 const sc=joint(`sc_${side}`,shoulderHost,worldLocal(shoulderHost,scW));
 const ac=joint(`ac_${side}`,sc,worldLocal(sc,acW));
 const scapula=joint(`scapula_${side}`,ac,new THREE.Vector3());
 const shoulder=joint(`shoulder_${side}`,scapula,worldLocal(scapula,ghW));
 node(sc,`SC_${side}`,new THREE.Vector3(),.012,MAT.joint);node(ac,`AC_${side}`,new THREE.Vector3(),.011,MAT.joint);node(shoulder,`shoulder_${side}_dynamic`,new THREE.Vector3(),.025,MAT.joint);
 link(sc,`clavicle_${side}`,new THREE.Vector3(),worldLocal(sc,acW),.009,MAT.bone);
 // Anatomical scapula: superior angle (T2), root of the spine (T3), inferior angle (T7),
 // glenoid, acromion and coracoid are separate landmarks. The old four-point kite
 // conflated the superior angle with the medial border and placed the inferior angle at T8.
 const scapMedX=sx-.006-A.scapulaWidth,scSupY=spineWorld.T2.y+.004;
 const scSup=new THREE.Vector3(g*scapMedX,scSupY,-.116);
 const scMed=new THREE.Vector3(g*(scapMedX+.003),spineWorld.T3.y-.010,-.118);
 const scInf=new THREE.Vector3(g*(scapMedX+.012),scSupY-A.scapulaHeight,-.103);
 const scAc=acW.clone();
 const scGlen=new THREE.Vector3(g*(sx-.006),sy-.020,-.018);
 const scCor=new THREE.Vector3(g*(sx-.032),sy+.002,.006);
 for(const [n,p,r] of [['scSup',scSup,.009],['scMed',scMed,.010],['scInf',scInf,.010],['scAc',scAc,.010],['scGlen',scGlen,.011],['scCor',scCor,.008]])wn(scapula,n+side,...p.toArray(),r,MAT.frame);
 wb(scapula,`scSup_scMed${side}`,scSup,scMed,.007,MAT.frame);
 wb(scapula,`scMed_scInf${side}`,scMed,scInf,.007,MAT.frame);
 wb(scapula,`scInf_scGlen${side}`,scInf,scGlen,.007,MAT.frame);
 wb(scapula,`scGlen_scSup${side}`,scGlen,scSup,.0065,MAT.frame);
 // Scapular spine reaches the acromion; the coracoid projects anteriorly without
 // being mistaken for part of the thoracic contact surface.
 wb(scapula,`scMed_scAc${side}`,scMed,scAc,.0065,MAT.frame);
 wb(scapula,`scGlen_scAc${side}`,scGlen,scAc,.007,MAT.frame);
 wb(scapula,`scGlen_scCor${side}`,scGlen,scCor,.006,MAT.frame);
 wb(scapula,`glenoid_shoulder_${side}`,scGlen,ghW,.006,MAT.frame);
 return shoulder;
}
buildShoulderGirdle('L');buildShoulderGirdle('R');

// Head terminal: C1 carries the atlanto-occipital attachment, then the head has its own flexion joint.
const head=joint('head',vj.C1,new THREE.Vector3(0,headPivotY-c1y,.024));
const occL=new THREE.Vector3(-.028,c1y+.018,0),occR=new THREE.Vector3(.028,c1y+.018,0),skBase=new THREE.Vector3(0,headPivotY,.020),faceP=new THREE.Vector3(0,skY-.008,.095),crownP=new THREE.Vector3(0,H,.018);
for(const [n,p,r,m] of [['occL',occL,.010,MAT.frame],['occR',occR,.010,MAT.frame],['skullBase',skBase,.018,MAT.frame],['face',faceP,.018,MAT.frame],['crown',crownP,.011,MAT.end]])wn(head,n,...p.toArray(),r,m);
wb(head,'occL_skullBase',occL,skBase,.006,MAT.frame);wb(head,'occR_skullBase',occR,skBase,.006,MAT.frame);wb(head,'skullBase_face',skBase,faceP,.006,MAT.frame);
// Mandible hangs from a transverse TMJ axis. It is neutral in v1.5 but ready for jaw mechanics.
const jawHinge=new THREE.Vector3(0,skY-.038,.058),jaw=joint('jaw',head,worldLocal(head,jawHinge));
const jawCondL=new THREE.Vector3(-.046,skY-.037,.057),jawCondR=new THREE.Vector3(.046,skY-.037,.057),jawAngL=new THREE.Vector3(-.043,skY-.094,.055),jawAngR=new THREE.Vector3(.043,skY-.094,.055),chin=new THREE.Vector3(0,skY-.105,.090);
for(const [n,p,r] of [['jawCondyleL',jawCondL,.008],['jawCondyleR',jawCondR,.008],['jawAngleL',jawAngL,.009],['jawAngleR',jawAngR,.009],['chin',chin,.011]])wn(jaw,n,...p.toArray(),r,MAT.frame);
for(const [n,a,b] of [['jawRamusL',jawCondL,jawAngL],['jawRamusR',jawCondR,jawAngR],['jawBodyL',jawAngL,chin],['jawBodyR',jawAngR,chin]])wb(jaw,n,a,b,.0065,MAT.frame);
const skull=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),MAT.vert);skull.name='skull';skull.scale.set(.082,.105,.092);skull.position.copy(worldLocal(head,new THREE.Vector3(0,skY+.012,.018)));head.add(skull);

function buildArm(side){
 const g=side==='L'?-1:1,shoulder=joints.get(`shoulder_${side}`);
 // Small carrying angle keeps the elbow close to the trunk and the wrist slightly lateral.
 const elW=new THREE.Vector3(g*(sx+.006),sy-A.humerus,.004),wrW=new THREE.Vector3(g*(sx+.031),sy-A.humerus-A.radius,.010);
 const elbow=joint(`elbow_${side}`,shoulder,worldLocal(shoulder,elW)),forearm=joint(`forearm_rotation_${side}`,elbow,new THREE.Vector3()),wrist=joint(`wrist_${side}`,forearm,worldLocal(forearm,wrW));
 node(elbow,`elbow_${side}_dynamic`,new THREE.Vector3(),.023,MAT.joint);node(forearm,`radioulnar_${side}`,new THREE.Vector3(),.014,MAT.joint);node(wrist,`wrist_${side}_dynamic`,new THREE.Vector3(),.017,MAT.joint);
 link(shoulder,`humerus_${side}`,new THREE.Vector3(),worldLocal(shoulder,elW),.015);
 const wrFore=worldLocal(forearm,wrW);link(forearm,`radius_${side}`,new THREE.Vector3(),wrFore,.010);
 const ue=new THREE.Vector3(-g*.011,-.008,-.008),uw=worldLocal(elbow,wrW).add(new THREE.Vector3(-g*.010,-.004,-.006));node(elbow,`ulnaEl_${side}`,ue,.010,MAT.frame);node(elbow,`ulnaWr_${side}`,uw,.008,MAT.frame);link(elbow,`ulna_${side}`,ue,uw,.007,MAT.frame);
}
buildArm('L');buildArm('R');

function buildLeg(side){const g=side==='L'?-1:1,hipW=new THREE.Vector3(g*hx,hipY,.014),kneeW=new THREE.Vector3(g*hx*.90,kneeY,-.020),ankW=new THREE.Vector3(g*hx*.86,ankleY,-.048),hip=joint(`hip_${side}`,pelvis,worldLocal(pelvis,hipW)),knee=joint(`knee_${side}`,hip,worldLocal(hip,kneeW)),ankle=joint(`ankle_${side}`,knee,worldLocal(knee,ankW));node(hip,`hip_${side}_head`,new THREE.Vector3(),.026,MAT.joint);const fNeck=new THREE.Vector3(g*(hx+.028),hipY-.032,.008),GT=new THREE.Vector3(g*(hx+.058),hipY-.026,-.006),LT=new THREE.Vector3(g*(hx+.020),hipY-.074,.016),shaft=new THREE.Vector3(g*(hx+.034),hipY-.100,-.006),cm=new THREE.Vector3(g*hx*.90-g*.020,kneeY+.005,-.020),cl=new THREE.Vector3(g*hx*.90+g*.023,kneeY+.003,-.019);for(const [n,p,r] of [['fNeck',fNeck,.014],['GT',GT,.019],['LT',LT,.012],['fShaftTop',shaft,.015],['fCondMed',cm,.020],['fCondLat',cl,.021]])node(hip,n+side,worldLocal(hip,p),r,MAT.frame);for(const [n,a,b,r,m] of [['hip_fNeck',hipW,fNeck,.014,MAT.bone],['fNeck_shaft',fNeck,shaft,.016,MAT.bone],['fNeck_GT',fNeck,GT,.011,MAT.frame],['shaft_LT',shaft,LT,.010,MAT.frame],['femur_med',shaft,cm,.018,MAT.bone],['femur_lat',shaft,cl,.018,MAT.bone]])wb(hip,n+side,a,b,r,m);const tm=new THREE.Vector3(g*hx*.90-g*.019,kneeY-.030,-.018),tl=new THREE.Vector3(g*hx*.90+g*.021,kneeY-.031,-.017),tt=new THREE.Vector3(g*hx*.90,kneeY-.057,-.020),fh=new THREE.Vector3(g*hx*.90+g*.036,kneeY-.052,-.022),pat=new THREE.Vector3(g*hx*.90,kneeY-.005,.026),fa=new THREE.Vector3(g*(hx*.86+.032),ankleY+.004,-.050);for(const [n,p,r,m] of [['tPlatMed',tm,.017,MAT.frame],['tPlatLat',tl,.017,MAT.frame],['tShaftTop',tt,.012,MAT.frame],['fibHead',fh,.010,MAT.frame],['fibAn',fa,.009,MAT.frame]])node(knee,n+side,worldLocal(knee,p),r,m);node(hip,'patella'+side,worldLocal(hip,pat),.016,MAT.joint);for(const [n,a,b,r,m] of [['plateau',tm,tl,.010,MAT.frame],['tibia_med',tm,tt,.013,MAT.bone],['tibia_lat',tl,tt,.013,MAT.bone],['tibia_shaft',tt,ankW,.015,MAT.bone],['fibula',fh,fa,.007,MAT.frame],['patella_link',pat,kneeW,.006,MAT.cart]]){if(n==='patella_link')wb(hip,n+side,a,b,r,m);else wb(knee,n+side,a,b,r,m);}node(ankle,`ankle_${side}_marker`,new THREE.Vector3(),.019,MAT.joint);const L=A.foot/1.07,talus=new THREE.Vector3(ankW.x,ankleY-.018,-.040),subtalar=joint(`subtalar_${side}`,ankle,worldLocal(ankle,talus)),calc=new THREE.Vector3(ankW.x,.050,-L*.205),heel=new THREE.Vector3(ankW.x,.025,-L*.255),nav=new THREE.Vector3(ankW.x-g*.010,.060,L*.055),cunM=new THREE.Vector3(ankW.x-g*.020,.052,L*.205),cunI=new THREE.Vector3(ankW.x-g*.004,.051,L*.205),cunL=new THREE.Vector3(ankW.x+g*.012,.049,L*.198),cub=new THREE.Vector3(ankW.x+g*.030,.038,L*.175);for(const [n,p,r,m] of [['talus',talus,.015,MAT.joint],['calcaneus',calc,.017,MAT.frame],['heel',heel,.013,MAT.end],['navicular',nav,.010,MAT.frame],['cuneiform_medial',cunM,.010,MAT.frame],['cuneiform_intermediate',cunI,.009,MAT.frame],['cuneiform_lateral',cunL,.009,MAT.frame],['cuboid',cub,.010,MAT.frame]])node(subtalar,`${n}_${side}`,worldLocal(subtalar,p),r,m);for(const [n,a,b,r] of [['talus_calc',talus,calc,.010],['calc_heel',calc,heel,.011],['talus_nav',talus,nav,.008],['calc_cub',calc,cub,.008],['nav_cunM',nav,cunM,.007],['nav_cunI',nav,cunI,.006],['nav_cunL',nav,cunL,.006],['calc_nav',calc,nav,.006]])wb(subtalar,`${n}_${side}`,a,b,r,n==='calc_nav'?MAT.frame:MAT.bone);const offs=[-.030,-.015,0,.016,.031].map(v=>v*g),starts=[cunM,cunI,cunL,cub,cub],lens=[.55,.62,.64,.61,.57];for(let i=0;i<5;i++){const base=new THREE.Vector3(ankW.x+offs[i]*.55,i<3?.047:.035,L*.245),mh=new THREE.Vector3(ankW.x+offs[i],i===0?.032:.025,L*lens[i]),t1p=new THREE.Vector3(ankW.x+offs[i]*1.04,.020,L*(lens[i]+(i===0?.105:.070))),t2p=i===0?null:new THREE.Vector3(ankW.x+offs[i]*1.07,.018,L*(lens[i]+.125)),tip=new THREE.Vector3(ankW.x+offs[i]*1.08,.016,L*(lens[i]+(i===0?.205:.175)));for(const [n,p,r,m] of [['base',base,.007,MAT.frame],['head',mh,i===0?.009:.007,MAT.frame],['toe1',t1p,.006,MAT.frame],...(t2p?[['toe2',t2p,.0055,MAT.frame]]:[]),['tip',tip,.006,MAT.end]])node(subtalar,`${n}_${side}_${i}`,worldLocal(subtalar,p),r,m);wb(subtalar,`mt1_${side}_${i}`,starts[i],base,.006,MAT.frame);wb(subtalar,`mt2_${side}_${i}`,base,mh,i===0?.008:.006);wb(subtalar,`toe1_${side}_${i}`,mh,t1p,i===0?.007:.0055);if(t2p){wb(subtalar,`toe2_${side}_${i}`,t1p,t2p,.0048);wb(subtalar,`toe3_${side}_${i}`,t2p,tip,.0045)}else wb(subtalar,`toe2_${side}_${i}`,t1p,tip,.0065)}}
buildLeg('L');buildLeg('R');

function buildHand(side){const g=side==='L'?-1:1,wrist=joints.get(`wrist_${side}`),grp=new THREE.Group();grp.name=`hand_${side}`;wrist.add(grp);const hs=A.hand/.227,prox=[],dist=[],lat=[.018,.006,-.007,-.019];for(let i=0;i<4;i++)prox.push(node(grp,`carpal_p_${side}_${i}`,new THREE.Vector3(g*lat[i],-.018*hs,i===0?.006:i===3?-.005:0),.0055,MAT.frame));for(let i=0;i<4;i++)dist.push(node(grp,`carpal_d_${side}_${i}`,new THREE.Vector3(g*lat[i]*1.08,-.040*hs,Math.abs(i-1.5)*.004),.0055,MAT.frame));for(let i=0;i<3;i++){link(grp,`cp_${side}_${i}`,prox[i].position,prox[i+1].position,.0028,MAT.frame);link(grp,`cd_${side}_${i}`,dist[i].position,dist[i+1].position,.0028,MAT.frame)}const mcX=[.030,.018,.004,-.011,-.026],mcLen=[.064,.086,.091,.085,.076],heads=[];for(let i=0;i<5;i++){const base=dist[Math.min(i,3)],h=node(grp,`metacarpal_head_${side}_${i}`,new THREE.Vector3(g*mcX[i],(-.040-mcLen[i])*hs,i===0?.020:Math.abs(i-2)*.003),i===0?.0065:.0058,MAT.frame);link(grp,`metacarpal_${side}_${i}`,base.position,h.position,i===0?.0048:.0042);heads.push(h)}const segs=[[.043,.026,.021],[.048,.030,.023],[.044,.028,.022],[.036,.023,.019]];for(let f=1;f<5;f++){let q=heads[f];for(let j=0;j<3;j++){const t=node(grp,`finger_${side}_${f}_${j}`,new THREE.Vector3(q.position.x+(2.2-f)*.003*g,q.position.y-segs[f-1][j]*hs,q.position.z+(j===2?.002:0)),j===2?.0045:.005,j===2?MAT.end:MAT.frame);link(grp,`phalanx_${side}_${f}_${j}`,q.position,t.position,j===0?.0038:.0033);q=t}}let q=heads[0],th1=node(grp,`thumb_ip_${side}`,new THREE.Vector3(q.position.x+g*.022,q.position.y-.031*hs,q.position.z+.012),.0055);link(grp,`thumb_prox_${side}`,q.position,th1.position,.0042);const th2=node(grp,`thumb_tip_${side}`,new THREE.Vector3(th1.position.x+g*.014,th1.position.y-.026*hs,th1.position.z+.006),.005,MAT.end);link(grp,`thumb_dist_${side}`,th1.position,th2.position,.0038)}
buildHand('L');buildHand('R');

function getJoint(name){return joints.get(name)||null}
const SEGMENTS={thigh_L:['hip_L','knee_L'],shin_L:['knee_L','ankle_L'],thigh_R:['hip_R','knee_R'],shin_R:['knee_R','ankle_R'],upperarm_L:['shoulder_L','elbow_L'],forearm_L:['elbow_L','wrist_L'],upperarm_R:['shoulder_R','elbow_R'],forearm_R:['elbow_R','wrist_R'],clavicle_L:['sc_L','ac_L'],clavicle_R:['sc_R','ac_R'],lumbar:['spine_S1','spine_T12'],thoracic:['spine_T12','spine_T1'],cervical:['spine_T1','neck_C1']};
function getSegment(name){const d=SEGMENTS[name];if(!d)return null;const a=getJoint(d[0]),b=getJoint(d[1]);if(!a||!b)return null;const start=a.getWorldPosition(new THREE.Vector3()),end=b.getWorldPosition(new THREE.Vector3());return{name,a:d[0],b:d[1],start,end,length:start.distanceTo(end)}}
function resetPose(){for(const j of joints.values())j.quaternion.identity();root.updateMatrixWorld(true)}
function getRestMetrics(){const segments={};for(const n of Object.keys(SEGMENTS))segments[n]=getSegment(n)?.length??null;return{stature,segments}}
function rebuildRestPose({stature:newStature=stature}={}){if(Math.abs(newStature-stature)>.000001)throw new Error('Skeleton v1.5: stature rebuild after geometry validation');resetPose();return getRestMetrics()}
const api=Object.freeze({contractVersion:SKELETON_CONTRACT_VERSION,skeletonVersion:SKELETON_VERSION,jointNames:Object.freeze([...joints.keys()]),segmentNames:Object.freeze(Object.keys(SEGMENTS)),jointRoot:root,getJoint,getSegment,getRestMetrics,rebuildRestPose,resetPose});root.userData.skeletonAPI=api;scene.userData.skeletonContractVersion=1;scene.userData.skeletonVersion=SKELETON_VERSION;

const gravity=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,H+.05,0)]),new THREE.LineBasicMaterial({color:0xff7f7f}));scene.add(gravity);
metrics.innerHTML=`<h3>Диагностика v1.5</h3><div class="row"><span>Рост</span><span>1750 мм</span></div><div class="row"><span>Architecture</span><span>standalone dynamic</span></div><div class="row"><span>Contract</span><span>v1</span></div><div class="row"><span>Limbs</span><span>native L/R</span></div><div class="row"><span>Spine</span><span>25 native vertebral joints</span></div><div class="row"><span>Shoulders</span><span>SC → AC → scapula/ST → GH</span></div>`;
const title=document.querySelector('.info .title');if(title)title.textContent='Skeleton v1.5';const sub=document.querySelector('.info .sub');if(sub)sub.innerHTML='anatomically corrected geometry · contract v1<br>pelvic ring · closed thorax · complete hands and feet';
const labelNames=['S1','L4','T7','C2','C1','skullBase'],LE={};for(const k of labelNames){const o=named.get(k);if(!o)continue;const d=document.createElement('div');d.className='joint-label';d.textContent=k;labelsRoot.appendChild(d);LE[k]=[d,o]}document.body.classList.add('labels-hidden');function lab(){for(const[d,o]of Object.values(LE)){const p=o.getWorldPosition(new THREE.Vector3()).project(camera);d.style.left=(p.x*.5+.5)*innerWidth+'px';d.style.top=(-p.y*.5+.5)*innerHeight+'px'}}function view(v){controls.target.set(0,.9,0);if(v==='front')camera.position.set(0,1.15,4.7);if(v==='side')camera.position.set(4.7,1.15,0);if(v==='back')camera.position.set(0,1.15,-4.7);if(v==='threequarter')camera.position.set(3.2,1.35,3.2);camera.lookAt(controls.target);controls.update();document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));lab()}document.querySelectorAll('[data-view]').forEach(x=>x.onclick=()=>view(x.dataset.view));const labelsBtn=document.querySelector('[data-labels]');if(labelsBtn)labelsBtn.onclick=e=>{document.body.classList.toggle('labels-hidden');e.currentTarget.classList.toggle('active');lab()};view('threequarter');addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);lab()});renderer.setAnimationLoop(()=>{controls.update();lab();renderer.render(scene,camera)});
export {api as skeletonAPI};
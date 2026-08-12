import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { scaledAnthropometry } from './anthropometry-v01.js';

/**
 * Skeleton v1.3 — standalone dynamic copy of the anatomical v1.2 skeleton.
 * No legacy adapters/bindings/cleanup layers.
 *
 * Rule:
 * - articulated anatomy is physically parented to joint Groups;
 * - mechanics rotates joint Groups only;
 * - ordinary bones span two joints/landmarks;
 * - terminal structures (feet/hands) have one attachment joint and local anatomy.
 */
export const SKELETON_CONTRACT_VERSION = 1;
export const SKELETON_VERSION = '1.3';

const stature = 1.75;
const A = scaledAnthropometry(stature), H=A.stature;
const app=document.getElementById('app'), metrics=document.getElementById('metrics'), labelsRoot=document.getElementById('labels');

const scene=new THREE.Scene(); scene.background=new THREE.Color(0x0b0d12);
const camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.01,100);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));app.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.target.set(0,.9,0);
scene.add(new THREE.HemisphereLight(0xdde8ff,0x1d2330,2.2));
const dl=new THREE.DirectionalLight(0xffffff,2);dl.position.set(4,6,5);scene.add(dl);
const grid=new THREE.GridHelper(4,40,0x32405a,0x202735);grid.position.y=.002;scene.add(grid);

const MAT={
 bone:new THREE.MeshStandardMaterial({color:0xd7dbe7}),
 joint:new THREE.MeshStandardMaterial({color:0xf0a65b}),
 frame:new THREE.MeshStandardMaterial({color:0x8a95ae}),
 vert:new THREE.MeshStandardMaterial({color:0xb8a8ff}),
 cart:new THREE.MeshStandardMaterial({color:0x8ed3c7}),
 end:new THREE.MeshStandardMaterial({color:0x7cc7ff})
};

const root=new THREE.Group();root.name='rig_root';root.userData.rigVersion=SKELETON_VERSION;scene.add(root);
const staticRoot=new THREE.Group();staticRoot.name='static_anatomy';root.add(staticRoot);
const joints=new Map();

function meshNode(parent,name,pos,r=.018,mat=MAT.joint){
 const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),mat);m.name=name;m.position.copy(pos);parent.add(m);return m;
}
function link(parent,name,a,b,r=.011,mat=MAT.bone){
 const v=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,10),mat);
 m.name=name;m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(1,v.length(),1);
 m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize());parent.add(m);return m;
}
function joint(name,parent,localPos,markerRadius=.0001){
 const g=new THREE.Group();g.name=`joint_${name}`;g.userData.semanticName=name;g.userData.kind='skeleton-joint';g.position.copy(localPos);parent.add(g);joints.set(name,g);
 if(markerRadius>0) meshNode(g,`marker_${name}`,new THREE.Vector3(),markerRadius,MAT.joint);
 return g;
}
function smooth(a,b,t){t=t*t*(3-2*t);return a+(b-a)*t}

const ankleY=A.ankleJointHeight,kneeY=ankleY+A.tibia,hipY=kneeY+A.femur,hx=A.hipCenterHalfWidth,sx=A.shoulderJointHalfWidth;
const s1=hipY+.125,l1=s1+.18,t12=l1+.022,t1=t12+.30,c7=t1+.022,c1=c7+.105;
const N={};
function S(k,x,y,z,r=.018,m=MAT.joint){N[k]=meshNode(staticRoot,k,new THREE.Vector3(x,y,z),r,m);return N[k]}
function SB(a,c,r=.011,m=MAT.bone,name=`${a}_${c}`){return link(staticRoot,name,N[a].position,N[c].position,r,m)}

const spine=[];function V(k,y,z,r=.015){S(k,0,y,z,r,MAT.vert);spine.push(k)}
V('S1',s1,-.010,.021);
['L5','L4','L3','L2','L1'].forEach((k,i)=>{let t=(i+1)/5,z=i<2?smooth(-.010,.006,(i+1)/2):smooth(.006,-.005,(i-1)/3);V(k,s1+(l1-s1)*t,z,.018)});
Array.from({length:12},(_,i)=>'T'+(12-i)).forEach((k,i)=>{let t=(i+1)/12,z=t<=.5?smooth(-.005,-.050,t/.5):smooth(-.050,-.020,(t-.5)/.5);V(k,t12+(t1-t12)*t,z,.015)});
['C7','C6','C5','C4','C3'].forEach((k,i)=>{let t=(i+1)/5;V(k,c7+(c1-c7)*t*.62,smooth(-.020,-.012,t),.012)});
for(let i=0;i<spine.length-1;i++)SB(spine[i],spine[i+1],.008,MAT.vert);
const c2y=N.C3.position.y+.030,c1y=c2y+.032;S('C2',0,c2y,-.008,.016,MAT.vert);S('dens',0,c2y+.024,-.002,.007,MAT.vert);S('C1',0,c1y,-.004,.017,MAT.vert);SB('C3','C2',.008,MAT.vert);SB('C2','C1',.008,MAT.vert);SB('C2','dens',.005,MAT.vert);
const skY=H-A.headHeight*.50;S('occL',-.028,c1y+.018,0,.010,MAT.frame);S('occR',.028,c1y+.018,0,.010,MAT.frame);S('skullBase',0,skY-.055,.020,.018,MAT.frame);SB('C1','occL',.006,MAT.frame);SB('C1','occR',.006,MAT.frame);SB('occL','skullBase',.006,MAT.frame);SB('occR','skullBase',.006,MAT.frame);
const skull=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),MAT.vert);skull.scale.set(.082,.105,.092);skull.position.set(0,skY+.012,.018);staticRoot.add(skull);S('face',0,skY-.008,.095,.018,MAT.frame);S('jaw',0,skY-.090,.060,.015,MAT.frame);SB('skullBase','face',.006,MAT.frame);SB('face','jaw',.006,MAT.frame);S('crown',0,H,.018,.011,MAT.end);

const px=A.pelvisWidth*.5,pz=A.pelvisDepth*.5;
for(const side of [-1,1]){const s=side<0?'L':'R',g=side;
 S('ASIS'+s,g*px*.90,s1+.047,pz*.64,.012,MAT.frame);S('PSIS'+s,g*px*.78,s1+.041,-pz*.68,.012,MAT.frame);S('crestA'+s,g*px*1.06,s1+.088,pz*.12,.011,MAT.frame);S('crestP'+s,g*px,s1+.086,-pz*.34,.011,MAT.frame);S('acet'+s,g*hx,hipY+.015,.012,.018,MAT.frame);S('pub'+s,g*.040,hipY-.022,pz*.52,.011,MAT.frame);S('isch'+s,g*.082,hipY-.098,-.025,.012,MAT.frame);S('ramus'+s,g*.060,hipY-.060,pz*.24,.009,MAT.frame);
 SB('PSIS'+s,'crestP'+s,.008,MAT.frame);SB('crestP'+s,'crestA'+s,.008,MAT.frame);SB('crestA'+s,'ASIS'+s,.008,MAT.frame);SB('ASIS'+s,'acet'+s,.008,MAT.frame);SB('acet'+s,'isch'+s,.008,MAT.frame);SB('isch'+s,'ramus'+s,.008,MAT.frame);SB('ramus'+s,'pub'+s,.008,MAT.frame);SB('pub'+s,'acet'+s,.008,MAT.frame);SB('PSIS'+s,'S1',.008,MAT.frame);
}
SB('pubL','pubR',.008,MAT.frame);SB('PSISL','PSISR',.007,MAT.frame);

const sternY=N.T3.position.y-.012;S('manubrium',0,sternY,N.T3.position.z+.095,.012,MAT.frame);S('sternumBody',0,N.T7.position.y-.006,N.T7.position.z+.135,.011,MAT.frame);S('xiphoid',0,N.T10.position.y-.025,N.T10.position.z+.118,.009,MAT.frame);SB('manubrium','sternumBody',.009,MAT.frame);SB('sternumBody','xiphoid',.007,MAT.frame);
const widths=[.078,.101,.125,.142,.154,.162,.166,.163,.155,.143,.118,.097],fronts=[.058,.070,.086,.100,.112,.121,.127,.125,.118,.108,.090,.074],backs=[.042,.050,.058,.065,.071,.075,.078,.079,.078,.074,.066,.058],drops=[.004,.009,.018,.029,.041,.054,.067,.080,.093,.106,.119,.132],ribVs=['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
for(let i=0;i<12;i++){const v=ribVs[i],p=N[v].position;for(const s of['L','R']){const g=s==='L'?-1:1,k=`r${i+1}${s}`;S(k+'P',g*widths[i]*.36,p.y-.002,p.z-backs[i],.006,MAT.frame);S(k+'PL',g*widths[i]*.78,p.y-drops[i]*.20,p.z-backs[i]*.72,.006,MAT.frame);S(k+'L',g*widths[i],p.y-drops[i]*.46,p.z+fronts[i]*.18,.006,MAT.frame);S(k+'AL',g*widths[i]*.86,p.y-drops[i]*.74,p.z+fronts[i]*.66,.006,MAT.frame);S(k+'A',g*widths[i]*.64,p.y-drops[i],p.z+fronts[i],.006,MAT.frame);SB(v,k+'P',.0055,MAT.frame);SB(k+'P',k+'PL',.0055,MAT.frame);SB(k+'PL',k+'L',.0055,MAT.frame);SB(k+'L',k+'AL',.0055,MAT.frame);SB(k+'AL',k+'A',.0055,MAT.frame);if(i<7)SB(k+'A',i<2?'manubrium':'sternumBody',.0048,MAT.cart);else if(i<10)SB(k+'A',`r${i}${s}A`,.0046,MAT.cart)}}

const sy=N.T3.position.y+.01;
const shoulderRootL=joint('shoulder_L',root,new THREE.Vector3(-sx,sy,0),0);
const shoulderRootR=joint('shoulder_R',root,new THREE.Vector3(sx,sy,0),0);
for(const s of['L','R']){const g=s==='L'?-1:1;
 S('g'+s,g*sx,sy,-.010,.018,MAT.frame);S('sh'+s,g*sx,sy,0,.025);S('cl'+s,g*A.clavicle*.72,sy+.010,.020,.011,MAT.frame);SB('manubrium','cl'+s,.009);SB('cl'+s,'g'+s,.009);SB('g'+s,'sh'+s,.006,MAT.frame);
 S('scMed'+s,g*.066,N.T4.position.y-.004,-.112,.010,MAT.frame);S('scInf'+s,g*.082,N.T8.position.y-.012,-.097,.010,MAT.frame);S('scAc'+s,g*(sx-.012),sy+.012,-.024,.010,MAT.frame);S('scGlen'+s,g*(sx-.004),sy-.018,-.015,.010,MAT.frame);SB('scMed'+s,'scInf'+s,.007,MAT.frame);SB('scInf'+s,'scGlen'+s,.007,MAT.frame);SB('scGlen'+s,'scAc'+s,.007,MAT.frame);SB('scAc'+s,'scMed'+s,.007,MAT.frame);SB('scGlen'+s,'g'+s,.006,MAT.frame);
 const ey=sy-A.humerus,wy=ey-A.radius;
 S('el'+s,g*(sx+.025),ey,.004,.023);S('wr'+s,g*(sx+.035),wy,.01,.017);S('ulnaEl'+s,g*(sx+.014),ey-.008,-.004,.010,MAT.frame);S('ulnaWr'+s,g*(sx+.025),wy-.004,.004,.008,MAT.frame);SB('sh'+s,'el'+s,.015);SB('el'+s,'wr'+s,.010);SB('ulnaEl'+s,'ulnaWr'+s,.007,MAT.frame);
}
joint('elbow_L',shoulderRootL,new THREE.Vector3(-.025,-A.humerus,.004),0);
joint('wrist_L',joints.get('elbow_L'),new THREE.Vector3(-.010,-A.radius,.006),0);
joint('elbow_R',shoulderRootR,new THREE.Vector3(.025,-A.humerus,.004),0);
joint('wrist_R',joints.get('elbow_R'),new THREE.Vector3(.010,-A.radius,.006),0);

const pelvisJoint=joint('pelvis_center',root,new THREE.Vector3(0,hipY+.05,0),0);
joint('spine_S1',pelvisJoint,new THREE.Vector3(0,s1-(hipY+.05),-.010),0);
joint('spine_L1',joints.get('spine_S1'),new THREE.Vector3(0,l1-s1,.005),0);
joint('spine_T12',joints.get('spine_L1'),new THREE.Vector3(0,t12-l1,0),0);
joint('spine_T1',joints.get('spine_T12'),new THREE.Vector3(0,t1-t12,-.015),0);

function buildDynamicLeg(side){
 const g=side==='L'?-1:1;
 const hipWorld=new THREE.Vector3(g*hx,hipY,.014);
 const kneeWorld=new THREE.Vector3(g*hx*.90,kneeY,-.020);
 const ankleWorld=new THREE.Vector3(g*hx*.86,ankleY,-.048);
 const hip=joint(`hip_${side}`,pelvisJoint,hipWorld.clone().sub(new THREE.Vector3(0,hipY+.05,0)),0);
 meshNode(hip,`hip_${side}_head`,new THREE.Vector3(),.026,MAT.joint);
 const knee=joint(`knee_${side}`,hip,kneeWorld.clone().sub(hipWorld),0);
 const ankle=joint(`ankle_${side}`,knee,ankleWorld.clone().sub(kneeWorld),0);

 const fNeck=new THREE.Vector3(g*(hx+.028)-hipWorld.x,hipY-.032-hipWorld.y,.008-hipWorld.z);
 const GT=new THREE.Vector3(g*(hx+.058)-hipWorld.x,hipY-.026-hipWorld.y,-.006-hipWorld.z);
 const LT=new THREE.Vector3(g*(hx+.020)-hipWorld.x,hipY-.074-hipWorld.y,.016-hipWorld.z);
 const shaft=new THREE.Vector3(g*(hx+.034)-hipWorld.x,hipY-.100-hipWorld.y,-.006-hipWorld.z);
 const condMedW=new THREE.Vector3(g*hx*.90-g*.020,kneeY+.005,-.020),condLatW=new THREE.Vector3(g*hx*.90+g*.023,kneeY+.003,-.019);
 const condMed=condMedW.clone().sub(hipWorld),condLat=condLatW.clone().sub(hipWorld);
 meshNode(hip,`fNeck${side}`,fNeck,.014,MAT.frame);meshNode(hip,`GT${side}`,GT,.019,MAT.frame);meshNode(hip,`LT${side}`,LT,.012,MAT.frame);meshNode(hip,`fShaftTop${side}`,shaft,.015,MAT.frame);meshNode(hip,`fCondMed${side}`,condMed,.020,MAT.frame);meshNode(hip,`fCondLat${side}`,condLat,.021,MAT.frame);
 link(hip,`hip_to_fNeck_${side}`,new THREE.Vector3(),fNeck,.014);link(hip,`fNeck_to_shaft_${side}`,fNeck,shaft,.016);link(hip,`fNeck_GT_${side}`,fNeck,GT,.011,MAT.frame);link(hip,`shaft_LT_${side}`,shaft,LT,.010,MAT.frame);link(hip,`femur_med_${side}`,shaft,condMed,.018);link(hip,`femur_lat_${side}`,shaft,condLat,.018);link(hip,`condyles_${side}`,condMed,condLat,.010,MAT.frame);

 const tMedW=new THREE.Vector3(g*hx*.90-g*.019,kneeY-.030,-.018),tLatW=new THREE.Vector3(g*hx*.90+g*.021,kneeY-.031,-.017);
 const tTopW=new THREE.Vector3(g*hx*.90,kneeY-.057,-.020),fibHeadW=new THREE.Vector3(g*hx*.90+g*.036,kneeY-.052,-.022),patW=new THREE.Vector3(g*hx*.90,kneeY-.005,.026);
 const tMed=tMedW.clone().sub(kneeWorld),tLat=tLatW.clone().sub(kneeWorld),tTop=tTopW.clone().sub(kneeWorld),fibHead=fibHeadW.clone().sub(kneeWorld),pat=patW.clone().sub(kneeWorld);
 const fibAnW=new THREE.Vector3(g*(hx*.86+.032),ankleY+.004,-.050),fibAn=fibAnW.clone().sub(kneeWorld),anLocal=ankleWorld.clone().sub(kneeWorld);
 meshNode(knee,`knee_${side}_marker`,new THREE.Vector3(),.008,MAT.frame);meshNode(knee,`tPlatMed${side}`,tMed,.017,MAT.frame);meshNode(knee,`tPlatLat${side}`,tLat,.017,MAT.frame);meshNode(knee,`patella${side}`,pat,.016,MAT.joint);meshNode(knee,`tShaftTop${side}`,tTop,.012,MAT.frame);meshNode(knee,`fibHead${side}`,fibHead,.010,MAT.frame);meshNode(knee,`fibAn${side}`,fibAn,.009,MAT.frame);
 link(knee,`plateau_${side}`,tMed,tLat,.010,MAT.frame);link(knee,`tibia_med_${side}`,tMed,tTop,.013);link(knee,`tibia_lat_${side}`,tLat,tTop,.013);link(knee,`tibia_shaft_${side}`,tTop,anLocal,.015);link(knee,`fibula_${side}`,fibHead,fibAn,.007,MAT.frame);link(knee,`patella_link_${side}`,pat,new THREE.Vector3(),.006,MAT.cart);

 meshNode(ankle,`ankle_${side}_marker`,new THREE.Vector3(),.019,MAT.joint);
 const L=A.foot;
 function fn(name,w,r=.010,mat=MAT.frame){return meshNode(ankle,name,w.clone().sub(ankleWorld),r,mat)}
 function fb(name,a,b,r=.007,mat=MAT.bone){return link(ankle,name,a.position,b.position,r,mat)}
 const talus=fn(`talus_${side}`,new THREE.Vector3(ankleWorld.x,ankleY-.018,-.040),.015,MAT.joint);
 const calc=fn(`calcaneus_${side}`,new THREE.Vector3(ankleWorld.x,.050,-L*.205),.017,MAT.frame);
 const heel=fn(`heel_${side}`,new THREE.Vector3(ankleWorld.x,.025,-L*.255),.013,MAT.end);
 fb(`talus_calc_${side}`,talus,calc,.010);fb(`calc_heel_${side}`,calc,heel,.011);
 const nav=fn(`navicular_${side}`,new THREE.Vector3(ankleWorld.x-g*.010,.060,L*.055),.010,MAT.frame);
 const cun=fn(`cuneiform_${side}`,new THREE.Vector3(ankleWorld.x-g*.014,.052,L*.205),.010,MAT.frame);
 const cub=fn(`cuboid_${side}`,new THREE.Vector3(ankleWorld.x+g*.020,.038,L*.175),.010,MAT.frame);
 fb(`talus_nav_${side}`,talus,nav,.008);fb(`calc_cub_${side}`,calc,cub,.008);fb(`nav_cun_${side}`,nav,cun,.007);fb(`calc_nav_${side}`,calc,nav,.006,MAT.frame);
 const offs=[-.030,-.015,0,.016,.031].map(v=>v*g),starts=[cun,cun,cun,cub,cub],lens=[.55,.62,.64,.61,.57];
 for(let i=0;i<5;i++){const base=fn(`mt_base_${side}_${i}`,new THREE.Vector3(ankleWorld.x+offs[i]*.55,i<3?.047:.035,L*.245),.007,MAT.frame);const head=fn(`mt_head_${side}_${i}`,new THREE.Vector3(ankleWorld.x+offs[i],i===0?.032:.025,L*lens[i]),i===0?.009:.007,MAT.frame);fb(`mt_link1_${side}_${i}`,starts[i],base,.006,MAT.frame);fb(`mt_link2_${side}_${i}`,base,head,i===0?.008:.006);const toe1=fn(`toe_mid_${side}_${i}`,new THREE.Vector3(ankleWorld.x+offs[i]*1.05,.020,L*(lens[i]+.105)),.006,MAT.frame);const tip=fn(`toe_tip_${side}_${i}`,new THREE.Vector3(ankleWorld.x+offs[i]*1.08,.016,L*(lens[i]+(i===0?.205:.175))),.006,MAT.end);fb(`toe1_${side}_${i}`,head,toe1,i===0?.007:.0055);fb(`toe2_${side}_${i}`,toe1,tip,i===0?.0065:.0048)}
}
buildDynamicLeg('L');buildDynamicLeg('R');

function buildHand(side){
 const g=side==='L'?-1:1,wrist=joints.get(`wrist_${side}`);
 const grp=new THREE.Group();grp.name=`hand_${side}`;wrist.add(grp);
 function hn(name,x,y,z,r=.005,mat=MAT.frame){return meshNode(grp,name,new THREE.Vector3(x,y,z),r,mat)}
 function hb(name,a,b,r=.0035,mat=MAT.bone){return link(grp,name,a.position,b.position,r,mat)}
 const prox=[],dist=[],lat=[.018,.006,-.007,-.019];
 for(let i=0;i<4;i++)prox.push(hn(`carpal_p_${side}_${i}`,g*lat[i],-.018,i===0?.006:i===3?-.005:0,.0055));
 for(let i=0;i<4;i++)dist.push(hn(`carpal_d_${side}_${i}`,g*lat[i]*1.08,-.040,Math.abs(i-1.5)*.004,.0055));
 for(let i=0;i<3;i++){hb(`cp_${side}_${i}`,prox[i],prox[i+1],.0028,MAT.frame);hb(`cd_${side}_${i}`,dist[i],dist[i+1],.0028,MAT.frame)}
 const mcX=[.030,.018,.004,-.011,-.026],mcLen=[.064,.086,.091,.085,.076],heads=[];
 for(let i=0;i<5;i++){const base=dist[Math.min(i,3)],head=hn(`metacarpal_head_${side}_${i}`,g*mcX[i],-.040-mcLen[i],i===0?.020:Math.abs(i-2)*.003,i===0?.0065:.0058);hb(`metacarpal_${side}_${i}`,base,head,i===0?.0048:.0042);heads.push(head)}
 const segs=[[.043,.026,.021],[.048,.030,.023],[.044,.028,.022],[.036,.023,.019]];
 for(let f=1;f<5;f++){let q=heads[f];for(let j=0;j<3;j++){const tip=hn(`finger_${side}_${f}_${j}`,q.position.x+(2.2-f)*.003*g,q.position.y-segs[f-1][j],q.position.z+(j===2?.002:0),j===2?.0045:.005,j===2?MAT.end:MAT.frame);hb(`phalanx_${side}_${f}_${j}`,q,tip,j===0?.0038:.0033);q=tip}}
 let q=heads[0];const th1=hn(`thumb_ip_${side}`,q.position.x+g*.022,q.position.y-.031,q.position.z+.012,.0055);hb(`thumb_prox_${side}`,q,th1,.0042);const th2=hn(`thumb_tip_${side}`,th1.position.x+g*.014,th1.position.y-.026,th1.position.z+.006,.005,MAT.end);hb(`thumb_dist_${side}`,th1,th2,.0038);
}
buildHand('L');buildHand('R');

function getJoint(name){return joints.get(name)||null}
function getSegment(name){
 const defs={thigh_L:['hip_L','knee_L'],shin_L:['knee_L','ankle_L'],thigh_R:['hip_R','knee_R'],shin_R:['knee_R','ankle_R'],upperarm_L:['shoulder_L','elbow_L'],forearm_L:['elbow_L','wrist_L'],upperarm_R:['shoulder_R','elbow_R'],forearm_R:['elbow_R','wrist_R']};
 const d=defs[name];if(!d)return null;const a=getJoint(d[0]),b=getJoint(d[1]);if(!a||!b)return null;const start=a.getWorldPosition(new THREE.Vector3()),end=b.getWorldPosition(new THREE.Vector3());return{name,a:d[0],b:d[1],start,end,length:start.distanceTo(end)};
}
function resetPose(){for(const j of joints.values())j.quaternion.identity();root.updateMatrixWorld(true)}
function getRestMetrics(){const names=['thigh_L','shin_L','thigh_R','shin_R','upperarm_L','forearm_L','upperarm_R','forearm_R'],segments={};for(const n of names)segments[n]=getSegment(n)?.length??null;return{stature,segments}}
function rebuildRestPose({stature:newStature=stature}={}){if(Math.abs(newStature-stature)>.000001)throw new Error('Skeleton v1.3: runtime stature rebuild will be enabled after full dynamic conversion');resetPose();return getRestMetrics()}

const jointNames=Object.freeze([...joints.keys()]);
const segmentNames=Object.freeze(['thigh_L','shin_L','thigh_R','shin_R','upperarm_L','forearm_L','upperarm_R','forearm_R']);
const api=Object.freeze({
 contractVersion:SKELETON_CONTRACT_VERSION,skeletonVersion:SKELETON_VERSION,jointNames,segmentNames,jointRoot:root,
 getJoint,getSegment,getRestMetrics,rebuildRestPose,resetPose
});
root.userData.skeletonAPI=api;scene.userData.skeletonContractVersion=1;scene.userData.skeletonVersion=SKELETON_VERSION;

const gravity=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,H+.05,0)]),new THREE.LineBasicMaterial({color:0xff7f7f}));scene.add(gravity);
metrics.innerHTML=`<h3>Диагностика v1.3</h3><div class="row"><span>Рост</span><span>1750 мм</span></div><div class="row"><span>Architecture</span><span>standalone dynamic</span></div><div class="row"><span>Contract</span><span>v1</span></div><div class="row"><span>Legs</span><span>native joint hierarchy</span></div><div class="row"><span>Feet</span><span>terminal @ ankle</span></div><div class="row"><span>Hands</span><span>terminal @ wrist</span></div>`;
const title=document.querySelector('.info .title');if(title)title.textContent='Skeleton v1.3';
const sub=document.querySelector('.info .sub');if(sub)sub.innerHTML='standalone dynamic copy · contract v1<br>рост 1750 мм · без адаптеров';

const diag=['S1','L4','T7','C2','C1','skullBase'],LE={};for(const k of diag){if(!N[k])continue;const d=document.createElement('div');d.className='joint-label';d.textContent=k;labelsRoot.appendChild(d);LE[k]=d}document.body.classList.add('labels-hidden');
function lab(){for(const[k,d]of Object.entries(LE)){const p=N[k].getWorldPosition(new THREE.Vector3()).project(camera);d.style.left=(p.x*.5+.5)*innerWidth+'px';d.style.top=(-p.y*.5+.5)*innerHeight+'px'}}
function view(v){controls.target.set(0,.9,0);if(v==='front')camera.position.set(0,1.15,4.7);if(v==='side')camera.position.set(4.7,1.15,0);if(v==='back')camera.position.set(0,1.15,-4.7);if(v==='threequarter')camera.position.set(3.2,1.35,3.2);camera.lookAt(controls.target);controls.update();document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));lab()}
document.querySelectorAll('[data-view]').forEach(x=>x.onclick=()=>view(x.dataset.view));
const labelsBtn=document.querySelector('[data-labels]');if(labelsBtn)labelsBtn.onclick=e=>{document.body.classList.toggle('labels-hidden');e.currentTarget.classList.toggle('active');lab()};
view('threequarter');
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);lab()});
renderer.setAnimationLoop(()=>{controls.update();lab();renderer.render(scene,camera)});

export { api as skeletonAPI };

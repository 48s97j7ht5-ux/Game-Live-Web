import * as THREE from 'three';

/** Mechanics v1.8 for Skeleton v1.4 development line.
 * Shoulder: SC + AC + scapulothoracic surface constraint + GH remainder.
 * Spine: regional segment weights, upper-cervical specialization, and coupled cervical motion.
 * Knee: tibiofemoral screw-home coupling + femur-relative patellar tracking.
 */
export const MECHANICS_VERSION='1.8.0';
export const REQUIRED_CONTRACT_VERSION=1;
const rad=THREE.MathUtils.degToRad;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const norm=a=>{const s=a.reduce((x,y)=>x+y,0);return a.map(v=>v/s)};
function worldPoint(o){return o.getWorldPosition(new THREE.Vector3())}
function landmark(scap,name){const o=scap.getObjectByName(name);return o?worldPoint(o):null}
function average(points){const v=new THREE.Vector3();for(const p of points)v.add(p);return v.multiplyScalar(1/points.length)}

const LUMBAR=['spine_L5','spine_L4','spine_L3','spine_L2','spine_L1'];
const THORACIC=['spine_T12','spine_T11','spine_T10','spine_T9','spine_T8','spine_T7','spine_T6','spine_T5','spine_T4','spine_T3','spine_T2','spine_T1'];
const SUBCERV=['neck_C7','neck_C6','neck_C5','neck_C4','neck_C3','neck_C2'];
const WF_L=norm([.17,.21,.23,.21,.18]),WS_L=norm([.16,.19,.22,.22,.21]),WR_L=norm([.12,.17,.22,.24,.25]);
const WF_T=norm([.12,.12,.11,.10,.09,.08,.08,.07,.07,.06,.05,.05]),WS_T=norm([.10,.10,.10,.09,.09,.09,.08,.08,.08,.07,.06,.06]),WR_T=norm([.07,.08,.09,.10,.10,.10,.10,.09,.08,.07,.06,.06]);
const WF_C=norm([.11,.16,.22,.23,.18,.10]),WS_C=norm([.13,.17,.21,.21,.17,.11]),WR_C=norm([.14,.17,.20,.20,.16,.13]);
function applyWeighted(api,names,flex,side,rot,wf,ws,wr){for(let i=0;i<names.length;i++){const j=api.getJoint(names[i]);if(!j)throw new Error(`missing spine joint ${names[i]}`);j.rotation.set(rad(-flex*wf[i]),rad(rot*wr[i]),rad(-side*ws[i]));}}

function initShoulder(api,side){const scap=api.getJoint(`scapula_${side}`),sc=api.getJoint(`sc_${side}`),ac=api.getJoint(`ac_${side}`),gh=api.getJoint(`shoulder_${side}`);if(!scap||!sc||!ac||!gh)throw new Error(`v1.8 missing shoulder complex ${side}`);if(scap.userData.stModel)return scap.userData.stModel;api.jointRoot.updateMatrixWorld(true);const pts=[landmark(scap,`scSup${side}`),landmark(scap,`scBorderMid${side}`),landmark(scap,`scInf${side}`),landmark(scap,`scGlen${side}`)].filter(Boolean),pivot=average(pts),t3=worldPoint(api.getJoint('spine_T3')),t7=worldPoint(api.getJoint('spine_T7')),centerY=(t3.y+t7.y)*.5+.015,centerZ=(t3.z+t7.z)*.5+.018,sideSign=side==='L'?-1:1,rx=Math.max(.17,Math.abs(pivot.x)*1.13),rz=.135,nx=clamp(Math.abs(pivot.x)/rx,0,.985),restSurfaceZ=centerZ-rz*Math.sqrt(Math.max(.001,1-nx*nx)),zBias=pivot.z-restSurfaceZ,pivotLocal=scap.worldToLocal(pivot.clone());const model={sideSign,pivotLocal,restPivotWorld:pivot.clone(),restPosition:scap.position.clone(),restQuaternion:scap.quaternion.clone(),thorax:{centerY,centerZ,rx,rz,zBias},restGH:worldPoint(gh),contactNames:[`scSup${side}`,`scBorderMid${side}`,`scInf${side}`],restContactOffsets:{}};for(const name of model.contactNames){const p=landmark(scap,name),surface=thoraxSurface(model,p.x,p.y);model.restContactOffsets[name]=p.z-surface.z}const restFrame=buildScapulaQuaternion(model,pivot,0,0,0,null);model.restBase=restFrame.qBase.clone();scap.userData.stModel=model;return model}
function thoraxSurface(model,x,y){const {centerZ,rx,rz,zBias}=model.thorax,nx=clamp(Math.abs(x)/rx,0,.985),z=centerZ-rz*Math.sqrt(Math.max(.001,1-nx*nx))+zBias;return new THREE.Vector3(x,y,z)}
function surfaceNormal(model,p){const {centerZ,rx,rz,zBias}=model.thorax,cz=centerZ+zBias;return new THREE.Vector3(p.x/(rx*rx),0,(p.z-cz)/(rz*rz)).normalize()}
function setShoulderChainWorldPose(sc,ac,scap,model,desiredPivotWorld,worldQuat){
 // The scapula cannot be translated independently of the AC joint. First find
 // the AC point required by the desired scapular contact pose, then aim the
 // fixed-length clavicle at that point. Finally rotate the blade about AC.
 sc.parent.updateMatrixWorld(true);
 const invHost=sc.parent.matrixWorld.clone().invert(),desiredAC=desiredPivotWorld.clone().sub(model.pivotLocal.clone().applyQuaternion(worldQuat));
 const desiredACLocal=desiredAC.applyMatrix4(invHost),desiredDirection=desiredACLocal.sub(sc.position).normalize(),restClavicleDirection=ac.position.clone().normalize();
 sc.quaternion.setFromUnitVectors(restClavicleDirection,desiredDirection);sc.updateMatrixWorld(true);
 ac.quaternion.identity();ac.updateMatrixWorld(true);
 const parentQuat=scap.parent.getWorldQuaternion(new THREE.Quaternion());
 scap.quaternion.copy(parentQuat.invert().multiply(worldQuat));scap.position.copy(model.restPosition);scap.updateMatrixWorld(true);
}
function buildScapulaQuaternion(model,pivot,upward,posterior,external){const sign=model.sideSign,n=surfaceNormal(model,pivot),up=new THREE.Vector3(0,1,0),tangentX=new THREE.Vector3().crossVectors(up,n).normalize();if(sign<0)tangentX.negate();const tangentY=new THREE.Vector3().crossVectors(n,tangentX).normalize(),qBase=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangentX,tangentY,n));if(!model.restBase)return{q:model.restQuaternion.clone(),qBase};const surfaceDelta=qBase.clone().multiply(model.restBase.clone().invert()),localNormal=new THREE.Vector3(0,0,1),localLateral=new THREE.Vector3(1,0,0),localVertical=new THREE.Vector3(0,1,0),q=surfaceDelta.multiply(model.restQuaternion.clone()).multiply(new THREE.Quaternion().setFromAxisAngle(localNormal,rad(sign*upward))).multiply(new THREE.Quaternion().setFromAxisAngle(localLateral,rad(-posterior))).multiply(new THREE.Quaternion().setFromAxisAngle(localVertical,rad(sign*external)));return {q,qBase}}
function solveScapula(api,side,elevation,planeShare){const scap=api.getJoint(`scapula_${side}`),sc=api.getJoint(`sc_${side}`),ac=api.getJoint(`ac_${side}`),gh=api.getJoint(`shoulder_${side}`),model=initShoulder(api,side),sign=model.sideSign,p=smooth((elevation-20)/160),upward=(51+3*(1-planeShare))*p,posterior=(16+5*planeShare)*p,external=(8+5*planeShare)*p,y=model.restPivotWorld.y+.018*p;let x=model.restPivotWorld.x+sign*.020*p,pivot=thoraxSurface(model,x,y),frame=buildScapulaQuaternion(model,pivot,upward,posterior,external),targetPivot=pivot.clone();
 // A rigid clavicle fixes the AC point to a sphere about SC. Iteratively move
 // the requested thoracic contact depth so the realised blade, not merely the
 // unconstrained target, is centred on the rib-cage surface.
 for(let iteration=0;iteration<5;iteration++){setShoulderChainWorldPose(sc,ac,scap,model,targetPivot,frame.q);api.jointRoot.updateMatrixWorld(true);if(iteration===4)break;let meanGap=0;for(const name of model.contactNames){const point=landmark(scap,name),surface=thoraxSurface(model,point.x,point.y);meanGap+=(point.z-surface.z)-model.restContactOffsets[name]}meanGap/=model.contactNames.length;targetPivot.z-=clamp(meanGap,-.025,.025)}
 const actualPivot=scap.localToWorld(model.pivotLocal.clone()),contactGaps={};let maxContactGap=0,meanContactGap=0;
 for(const name of model.contactNames){const point=landmark(scap,name),surface=thoraxSurface(model,point.x,point.y),gap=(point.z-surface.z)-model.restContactOffsets[name];contactGaps[name]=gap;meanContactGap+=gap;maxContactGap=Math.max(maxContactGap,Math.abs(gap))}meanContactGap/=model.contactNames.length;
 const acromion=landmark(scap,`scAc${side}`),acGap=acromion?acromion.distanceTo(worldPoint(ac)):0;
 const result={upward,posterior,external,pivot:actualPivot,gh:worldPoint(gh),acGap,maxContactGap,meanContactGap,contactGaps};scap.userData.lastScapulaMechanics=result;return result}

function initKnee(api,side){const hip=api.getJoint(`hip_${side}`),knee=api.getJoint(`knee_${side}`);if(!hip||!knee)throw new Error(`v1.8 missing knee chain ${side}`);if(knee.userData.kneeModel)return knee.userData.kneeModel;const patella=hip.getObjectByName(`patella${side}`);if(!patella)throw new Error(`v1.8 requires femur-relative patella${side}`);const model={patella,restPatellaPosition:patella.position.clone(),restPatellaQuaternion:patella.quaternion.clone(),restVector:patella.position.clone().sub(knee.position),sideSign:side==='L'?-1:1};knee.userData.kneeModel=model;return model}
function solveKnee(api,side,flexion){const knee=api.getJoint(`knee_${side}`),model=initKnee(api,side),sign=model.sideSign,f=clamp(flexion,0,145);
 // Screw-home: most tibial internal rotation occurs during the first 30° of flexion, then settles gradually.
 const early=smooth(f/30),late=smooth((f-30)/115),tibialInternal=9.0*early-3.5*late;
 knee.rotation.set(rad(f),rad(sign*tibialInternal),0);
 // Patella follows the femoral trochlea. Sagittal patellar flexion is ~2/3 of tibiofemoral flexion.
 const patFlex=f*.66,arc=model.restVector.clone().applyAxisAngle(new THREE.Vector3(1,0,0),rad(patFlex));
 // Small physiologic lateral shift/rotation after trochlear capture; values deliberately conservative.
 const capture=smooth((f-10)/25),deep=smooth((f-30)/90),lateralShift=.0018*deep,lateralRotation=4.5*deep,medialTilt=6.5*capture*(1-.55*deep);
 model.patella.position.copy(knee.position).add(arc).add(new THREE.Vector3(sign*lateralShift,0,0));
 model.patella.quaternion.copy(model.restPatellaQuaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rad(patFlex),rad(sign*lateralRotation),rad(-sign*medialTilt),'XYZ')));
 return {tibialInternal,patFlex,lateralShift,lateralRotation,medialTilt};}

export class SkeletonMechanicsV16{
 constructor(api){if(!api||api.contractVersion!==REQUIRED_CONTRACT_VERSION)throw new Error('Mechanics v1.8 requires Skeleton Contract v1');this.api=api;this.arms={L:{shoulderFlexion:0,shoulderAbduction:0,shoulderRotation:0,elbowFlexion:0,wristFlexion:0,wristDeviation:0},R:{shoulderFlexion:0,shoulderAbduction:0,shoulderRotation:0,elbowFlexion:0,wristFlexion:0,wristDeviation:0}};this.legs={L:{hipFlexion:0,hipAbduction:0,hipRotation:0,kneeFlexion:0,ankleFlexion:0,ankleInversion:0},R:{hipFlexion:0,hipAbduction:0,hipRotation:0,kneeFlexion:0,ankleFlexion:0,ankleInversion:0}};this.torso={lumbarFlexion:0,lumbarSide:0,lumbarRotation:0,thoracicFlexion:0,thoracicSide:0,thoracicRotation:0,neckFlexion:0,neckSide:0,neckRotation:0,headFlexion:0,headRotation:0};for(const s of ['L','R']){initShoulder(api,s);initKnee(api,s)}}
 setArmPose(side,v={}){const p=this.arms[side];if(!p)throw new Error('side must be L or R');p.shoulderFlexion=clamp(v.shoulderFlexion??p.shoulderFlexion,-40,180);p.shoulderAbduction=clamp(v.shoulderAbduction??p.shoulderAbduction,-40,180);p.shoulderRotation=clamp(v.shoulderRotation??p.shoulderRotation,-90,90);p.elbowFlexion=clamp(v.elbowFlexion??p.elbowFlexion,0,150);p.wristFlexion=clamp(v.wristFlexion??p.wristFlexion,-80,80);p.wristDeviation=clamp(v.wristDeviation??p.wristDeviation,-30,30);this._applyArm(side,p);return {...p}}
 _applyArm(side,p){const sign=side==='L'?-1:1,shoulder=this.api.getJoint(`shoulder_${side}`),elbow=this.api.getJoint(`elbow_${side}`),wrist=this.api.getJoint(`wrist_${side}`),f=Math.max(0,p.shoulderFlexion),a=Math.max(0,p.shoulderAbduction),e=Math.min(180,Math.hypot(f,a)),flexShare=e>.001?f/e:0,scap=solveScapula(this.api,side,e,flexShare),ghScale=e>.001?clamp((e-scap.upward)/e,.58,1):1;shoulder.rotation.set(rad(-p.shoulderFlexion*ghScale),rad(p.shoulderRotation),rad(sign*p.shoulderAbduction*ghScale));elbow.rotation.set(rad(-p.elbowFlexion),0,0);wrist.rotation.set(rad(-p.wristFlexion),0,rad(side==='L'?-p.wristDeviation:p.wristDeviation));this.api.jointRoot.updateMatrixWorld(true)}
 setLegPose(side,v={}){const hip=this.api.getJoint(`hip_${side}`),ankle=this.api.getJoint(`ankle_${side}`),p=this.legs[side],sign=side==='L'?-1:1;if(!p||!hip||!ankle)throw new Error(`missing leg ${side}`);p.hipFlexion=clamp(v.hipFlexion??p.hipFlexion,-25,125);p.hipAbduction=clamp(v.hipAbduction??p.hipAbduction,-30,50);p.hipRotation=clamp(v.hipRotation??p.hipRotation,-45,45);p.kneeFlexion=clamp(v.kneeFlexion??p.kneeFlexion,0,145);p.ankleFlexion=clamp(v.ankleFlexion??p.ankleFlexion,-50,25);p.ankleInversion=clamp(v.ankleInversion??p.ankleInversion,-20,35);hip.rotation.set(rad(-p.hipFlexion),rad(p.hipRotation),rad(sign*-p.hipAbduction));solveKnee(this.api,side,p.kneeFlexion);ankle.rotation.set(rad(-p.ankleFlexion),0,rad(sign*-p.ankleInversion));this.api.jointRoot.updateMatrixWorld(true);return {...p}}
 setTorsoPose(v={}){const p=this.torso;for(const k of Object.keys(p))if(v[k]!==undefined)p[k]=Number(v[k])||0;p.lumbarFlexion=clamp(p.lumbarFlexion,-30,55);p.lumbarSide=clamp(p.lumbarSide,-25,25);p.lumbarRotation=clamp(p.lumbarRotation,-10,10);p.thoracicFlexion=clamp(p.thoracicFlexion,-20,35);p.thoracicSide=clamp(p.thoracicSide,-25,25);p.thoracicRotation=clamp(p.thoracicRotation,-35,35);p.neckFlexion=clamp(p.neckFlexion,-45,50);p.neckSide=clamp(p.neckSide,-35,35);p.neckRotation=clamp(p.neckRotation,-70,70);p.headFlexion=clamp(p.headFlexion,-20,25);p.headRotation=clamp(p.headRotation,-10,10);this._applyTorso(p);return {...p}}
 _applyTorso(p){applyWeighted(this.api,LUMBAR,p.lumbarFlexion,p.lumbarSide,p.lumbarRotation,WF_L,WS_L,WR_L);applyWeighted(this.api,THORACIC,p.thoracicFlexion,p.thoracicSide,p.thoracicRotation,WF_T,WS_T,WR_T);const rotAbs=Math.abs(p.neckRotation),rotShare=rotAbs>0?clamp(.68+.05*smooth(rotAbs/70),.68,.73):.68,upperRot=p.neckRotation*rotShare,subRot=p.neckRotation-upperRot,aoFlex=p.neckFlexion*.18,aaFlex=p.neckFlexion*.10,subFlex=p.neckFlexion-aoFlex-aaFlex,subSide=p.neckSide*.92,upperSide=p.neckSide-subSide,coupledRot=p.neckSide*.22,coupledSide=subRot*.10;applyWeighted(this.api,SUBCERV,subFlex,subSide+coupledSide,subRot+coupledRot,WF_C,WS_C,WR_C);const c1=this.api.getJoint('neck_C1'),head=this.api.getJoint('head');if(!c1||!head)throw new Error('missing C1/head joints');c1.rotation.set(rad(-aaFlex),rad(upperRot),rad(-upperSide*.25));head.rotation.set(rad(-(aoFlex+p.headFlexion)),rad(p.headRotation),rad(upperSide*.25));this.api.jointRoot.updateMatrixWorld(true)}
 reset(){this.api.resetPose();for(const side of ['L','R']){for(const k in this.arms[side])this.arms[side][k]=0;for(const k in this.legs[side])this.legs[side][k]=0;const scap=this.api.getJoint(`scapula_${side}`),m=scap?.userData.stModel;if(m){scap.position.copy(m.restPosition);scap.quaternion.copy(m.restQuaternion)}const knee=this.api.getJoint(`knee_${side}`),km=knee?.userData.kneeModel;if(km){km.patella.position.copy(km.restPatellaPosition);km.patella.quaternion.copy(km.restPatellaQuaternion)}}for(const k in this.torso)this.torso[k]=0;this.api.jointRoot.updateMatrixWorld(true)}
 getJointWorld(name){const j=this.api.getJoint(name);if(!j)throw new Error(`unknown joint ${name}`);return worldPoint(j)}
}
export function createSkeletonMechanicsV16(api){return new SkeletonMechanicsV16(api)}
